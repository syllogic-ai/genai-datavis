from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import uuid
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry

from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.utils.files import extract_schema_sample, get_column_unique_values
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.chat import append_chat_message, get_message_history
import duckdb
from supabase import Client

class SQLInput(BaseModel):
    """Input for SQL generation."""
    user_prompt: str = Field(description="The user's question about the data")

class CalcInput(BaseModel):
    """Input for calculation execution."""
    sql: str = Field(description="Generated DuckDB SQL query")

class ConfidenceInput(BaseModel):
    """Input for confidence scoring."""
    user_prompt: str = Field(description="The user's original question")
    generated_sql: str = Field(description="The SQL query that was generated")
    dataset_schema: Dict[str, str] = Field(description="The dataset schema with column names and types")

class ConfidenceOutput(BaseModel):
    """Output from confidence scoring."""
    confidence_score: int = Field(description="Confidence score from 0 to 100")
    reasoning: str = Field(description="Explanation of the confidence score")
    potential_issues: List[str] = Field(description="List of potential issues or concerns")

class SQLOutput(BaseModel):
    """Output from SQL generation, includes widget ID."""
    widget_id: str = Field(description="The ID of the widget that was created or updated with the SQL query.")
    sql: str = Field(description="The generated SQL query")
    insights_title: Optional[str] = Field(default=None, description="Title of the insights if generated")
    insights_analysis: Optional[str] = Field(default=None, description="Business insights analysis if generated")
    success: bool = Field(default=True, description="Whether the SQL query was executed successfully")
    confidence_score: Optional[int] = Field(default=None, description="Confidence score from 0 to 100 if calculated")
    confidence_reasoning: Optional[str] = Field(default=None, description="Explanation of the confidence score if calculated")
    follow_up_questions: Optional[List[str]] = Field(default=None, description="Follow-up questions to improve confidence if calculated")

# Declare the SQL agent
sql_agent = Agent(
    "openai:gpt-4.1",
    deps_type=Deps,
    output_type=SQLOutput,
)

@sql_agent.system_prompt
async def sql_system_prompt(ctx: RunContext[Deps]) -> str:
    """
    Generate a system prompt that describes the database schema and sample data.
    
    The user's query will be added by the agent framework.
    """

    # Get the dataset profile using extract_schema_sample
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # Build prompt with schema and sample data
    schema_table = "\n".join([
        f"| {col_name} | {data_type} |"
        for col_name, data_type in profile.columns.items()
    ])
    
    # Format sample rows as a table
    # First get all column names to ensure consistent order
    col_names = list(profile.columns.keys())
    
    # Create header row
    sample_table = "| " + " | ".join(col_names) + " |\n"
    # Add separator row
    sample_table += "|" + "|".join(["---"] * len(col_names)) + "|\n"
    
    # Add data rows
    for row in profile.sample_rows:
        sample_table += "| " + " | ".join(str(row.get(col, "")) for col in col_names) + " |\n"
    
    prompt = f"""
    You are a SQL expert specializing in DuckDB. Given a dataset schema, sample data, 
    and a user's question, generate ONLY valid DuckDB SQL queries. Your response should give EXACTLY what the users asked for, no more, no less.
    
    Here is the schema and sample data:

    Schema:
    | Column | Type |
    |--------|------|
    {schema_table}

    Sample data:
    {sample_table}

    IMPORTANT INSTRUCTIONS:
    - Adhere strictly to column names: Use the exact column names and casing as provided in the 'Schema' section. If a column name includes spaces, special characters, or requires case-sensitive matching, enclose it in double quotes (e.g., "Column Name with Spaces", "caseSensitiveName").
    - Your response must contain exactly ONE SQL query terminated with a semicolon.
    - Don't explain your reasoning - just return the SQL.
    - Use proper SQL syntax for DuckDB.
    - For aggregations, include appropriate GROUP BY clauses.
    - For visualizations, ensure you select appropriate columns.
    - AVOID using DELETE, DROP, UPDATE, ALTER, INSERT operations.
    - Don't ever use comments (-- or /* */) in your SQL.
    - The table name is ALWAYS "csv_data"
    - Verify all parentheses are properly balanced in complex expressions
    - Enclose column names containing spaces in double quotes (e.g., "Subscription Date")
    - Ensure date functions are compatible with DuckDB (not SQLite-specific)
    - Include NULL handling (NULLIF, COALESCE) when performing division
    - For percentage calculations, use proper formula: ((new - old) / old) * 100
    - Check that all referenced columns exist in the schema
    - Use explicit type casting when mixing data types (CAST or ::)
    - Ensure correct syntax for conditional logic (CASE WHEN, IF, etc.)
    - Verify string literals are properly quoted (single quotes)
    - For date operations, ensure proper format compatibility
    - Limit the use of database-specific functions that may not be portable
    - Avoid subqueries where window functions would be more efficient
    - Include appropriate filtering criteria in WHERE clauses
    - For temporal analysis, use consistent date/time extraction methods
    - Date columns should always be returned in a YYYY-MM-DD format.
    - Only use the available column types: TEXT, INTEGER, FLOAT, BOOLEAN, DATE, TIMESTAMP, and no else.
    - Don't do any formatting in your numerical columns whatsoever, except the floating point precision.
    - Never use printf in your SQL.
    
    
    DUCKDB DATE FUNCTION REQUIREMENTS:
    - NEVER use the DATE() function - it does not exist in DuckDB
    - To convert a timestamp to a date, use CAST(timestamp_column AS DATE) directly
    - For current date, use CURRENT_DATE without any function wrapper
    - For filtering dates, use: CAST(date_column AS DATE) = CURRENT_DATE
    - For date/time extraction, use extract() function: EXTRACT(YEAR FROM CAST(date_column AS DATE))
    - For comparing dates, use CAST(date_column AS DATE) = DATE '2023-01-01'
    - When using strftime, always ensure that the argument inside has been transformed to a date first (e.g. strptime(date_column, '%d/%m/%Y')::DATE)
    - When working with dates, always make sure that you transform them to date format first (e.g. strptime(date_column, '%d/%m/%Y')::DATE)
    - To truncate dates to specific parts, use date_trunc(): date_trunc('month', CAST(date_column AS DATE))
    
    User prompt: {ctx.deps.user_prompt}
    """

    return prompt

@sql_agent.tool
async def calculate(ctx: RunContext[Deps], input: CalcInput) -> SQLOutput:
    """Execute the SQL query and create or update a widget record in Supabase."""
    start_time = time.time()
    successful_execution = False
    
    sql = input.sql
    # Always create a new widget for each request
    widget_id = str(uuid.uuid4())
    logfire.info("Creating new widget", 
                 new_widget_id=widget_id,
                 chat_id=ctx.deps.chat_id, 
                 request_id=ctx.deps.request_id)
    
    # Convert to uppercase for case-insensitive comparison
    sql_upper = sql.upper()
    
    # Check for disallowed operations
    disallowed = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', '--', '/*']
    for term in disallowed:
        if term.upper() in sql_upper:
            error_msg = f"SQL query contains disallowed term: {term}"
            logfire.error("SQL validation failed", 
                         error=error_msg, 
                         disallowed_term=term, 
                         chat_id=ctx.deps.chat_id, 
                         request_id=ctx.deps.request_id)
            raise ValueError(error_msg)
    
    # Create or update the widget record in Supabase with the generated SQL
    try:
        # Always create new widget
        from datetime import datetime
        
        # Get dashboard_id from deps or determine it from context
        dashboard_id = ctx.deps.dashboard_id
        if not dashboard_id:
            # If no dashboard_id in deps, we need to handle this case
            # For now, we'll try to get it from the chat
            try:
                chat_result = ctx.deps.supabase.table("chats").select("dashboard_id").eq("id", ctx.deps.chat_id).execute()
                if chat_result.data and len(chat_result.data) > 0:
                    dashboard_id = chat_result.data[0]["dashboard_id"]
                else:
                    error_msg = "Cannot create widget: no dashboard_id available"
                    logfire.error("Widget creation failed", 
                                 error=error_msg,
                                 chat_id=ctx.deps.chat_id, 
                                 request_id=ctx.deps.request_id)
                    raise ValueError(error_msg)
            except Exception as e:
                error_msg = f"Error getting dashboard_id from chat: {str(e)}"
                logfire.error("Dashboard ID lookup failed", 
                             error=str(e),
                             chat_id=ctx.deps.chat_id, 
                             request_id=ctx.deps.request_id)
                raise ValueError(error_msg)
            
        # Create basic widget layout - positioned to avoid overlap
        widget_layout = {
                "i": widget_id,
                "x": 0,
                "y": 0, 
                "w": 6,
                "h": 4,
                "minW": 3,
                "minH": 3,
                "isResizable": True
            }
            
        # Create basic widget configuration
        widget_config = {
                "chartType": "line",  # Default chart type
                "showLegend": True,
                "showGrid": True,
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
        }
        
        # Insert new widget
        result = ctx.deps.supabase.table("widgets").insert({
            "id": widget_id,
            "dashboard_id": dashboard_id,
            "title": "Data Analysis Chart",
            "type": "chart",
            "config": widget_config,
            "data": None,
            "sql": sql,
            "layout": widget_layout,
            "chat_id": ctx.deps.chat_id,
            "is_configured": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
            
        if not result.data or len(result.data) == 0:
            error_msg = "Failed to create new widget record"
            logfire.warn("Widget creation failed", 
                             error=error_msg,
                             widget_id=widget_id,
                             chat_id=ctx.deps.chat_id, 
                             request_id=ctx.deps.request_id)
            successful_execution = False
        else:
            logfire.info("Widget created successfully", 
                         widget_id=widget_id,
                         dashboard_id=dashboard_id,
                         chat_id=ctx.deps.chat_id, 
                         request_id=ctx.deps.request_id)
            successful_execution = True

    except Exception as e:
        error_msg = f"Error creating/updating widget record: {str(e)}"
        logfire.error("Widget operation failed", 
                     error=str(e),
                     widget_id=widget_id,
                     operation="create",
                     chat_id=ctx.deps.chat_id, 
                     request_id=ctx.deps.request_id)
        raise ValueError(error_msg)
    
    end_time = time.time()
    
    return SQLOutput(widget_id=widget_id, sql=sql, success=successful_execution)

@sql_agent.tool
async def get_column_unique_values(ctx: RunContext[Deps], column_name: str) -> list[str]:
    """Get unique values for a given column."""
    unique_values = get_unique_values(ctx.deps.file_id, column_name)

    logfire.info("Unique values for column", 
                 column_name=column_name, 
                 unique_values=unique_values, 
                 chat_id=ctx.deps.chat_id, 
                 request_id=ctx.deps.request_id)
    return unique_values

@sql_agent.tool
async def calculate_confidence(ctx: RunContext[Deps], input: ConfidenceInput) -> ConfidenceOutput:
    """Calculate confidence score for how well the generated SQL matches the user's request."""
    
    # Get the dataset profile to provide context
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # Create a detailed prompt for confidence evaluation
    confidence_prompt = f"""
    You are an expert SQL analyst evaluating the quality and accuracy of a generated SQL query against a user's request.
    
    DATASET SCHEMA:
    {json.dumps(profile.columns, indent=2)}
    
    USER'S REQUEST:
    "{input.user_prompt}"
    
    GENERATED SQL QUERY:
    {input.generated_sql}
    
    TASK: Evaluate how well the generated SQL query matches the user's request and provide a confidence score from 0 to 100.
    
    EVALUATION CRITERIA:
    1. **Semantic Alignment (0-30 points)**: Does the SQL query address what the user actually asked for?
    2. **Technical Accuracy (0-25 points)**: Is the SQL syntactically correct and follows best practices?
    3. **Data Relevance (0-20 points)**: Are the correct columns and tables being used?
    4. **Logical Completeness (0-15 points)**: Does the query include all necessary operations (filtering, grouping, etc.)?
    5. **Edge Case Handling (0-10 points)**: Does the query handle potential data issues (NULLs, edge cases)?
    
    CONFIDENCE SCORING:
    - 90-100: Excellent match, highly confident
    - 80-89: Very good match, confident
    - 70-79: Good match, reasonably confident
    - 60-69: Acceptable match, somewhat confident
    - 50-59: Partial match, low confidence
    - 40-49: Poor match, very low confidence
    - 30-39: Significant mismatch, not confident
    - 20-29: Major issues, very not confident
    - 10-19: Critical problems, extremely not confident
    - 0-9: Complete failure, no confidence
    
    Provide your response in the following JSON format:
    {{
        "confidence_score": <integer 0-100>,
        "reasoning": "<detailed explanation of the score>",
        "potential_issues": ["<issue1>", "<issue2>", ...]
    }}
    
    Be thorough in your analysis and provide specific reasons for your confidence level.
    """
    
    try:
        # Use the agent's model to evaluate confidence
        response = await ctx.agent.model.complete(
            messages=[{"role": "user", "content": confidence_prompt}],
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        confidence_data = json.loads(response.content)
        
        confidence_score = confidence_data.get("confidence_score", 50)
        reasoning = confidence_data.get("reasoning", "No reasoning provided")
        potential_issues = confidence_data.get("potential_issues", [])
        
        # Ensure confidence score is within bounds
        confidence_score = max(0, min(100, confidence_score))
        
        logfire.info("Confidence score calculated", 
                     confidence_score=confidence_score,
                     user_prompt=input.user_prompt,
                     chat_id=ctx.deps.chat_id, 
                     request_id=ctx.deps.request_id)
        
        return ConfidenceOutput(
            confidence_score=confidence_score,
            reasoning=reasoning,
            potential_issues=potential_issues
        )
        
    except Exception as e:
        error_msg = f"Error calculating confidence score: {str(e)}"
        logfire.error("Confidence calculation failed", 
                     error=str(e), 
                     chat_id=ctx.deps.chat_id, 
                     request_id=ctx.deps.request_id)
        
        # Return a default low confidence score on error
        return ConfidenceOutput(
            confidence_score=30,
            reasoning=f"Error occurred during confidence calculation: {str(e)}",
            potential_issues=["Confidence calculation failed", "Unable to evaluate query quality"]
        ) 