from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import uuid
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry

from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.utils.files import extract_schema_sample
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.chat import append_chat_message, get_last_chart_id_from_chat_id, get_message_history
import duckdb
from supabase import Client

class SQLInput(BaseModel):
    """Input for SQL generation."""
    user_prompt: str = Field(description="The user's question about the data")

class CalcInput(BaseModel):
    """Input for calculation execution."""
    sql: str = Field(description="Generated DuckDB SQL query")

class SQLOutput(BaseModel):
    """Output from SQL generation, includes chart ID."""
    chart_id: str = Field(description="The ID of the chart that has been created")
    sql: str = Field(description="The generated SQL query")
    insights_title: Optional[str] = Field(default=None, description="Title of the insights if generated")
    insights_analysis: Optional[str] = Field(default=None, description="Business insights analysis if generated")
    success: bool = Field(default=True, description="Whether the SQL query was executed successfully")

# Declare the SQL agent
sql_agent = Agent(
    "openai:gpt-4o",
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
    and a user's question, generate ONLY valid DuckDB SQL queries. 
    
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
    
    Previous chart ID (if referenced): {ctx.deps.last_chart_id or "None"}
    User prompt: {ctx.deps.user_prompt}
    """

    return prompt

@sql_agent.tool
async def calculate(ctx: RunContext[Deps], input: CalcInput) -> SQLOutput:
    """Execute the SQL query and create a chart record in Supabase."""
    start_time = time.time()
    successful_execution = False
    
    sql = input.sql
    
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
    
    # Create a new chart record in Supabase
    chart_id = str(uuid.uuid4())
    
    # Insert the SQL query into the charts table using Supabase client
    try:
        # Use the Supabase client to insert the record
        result = ctx.deps.supabase.table("charts").insert({
            "id": chart_id,
            "chat_id": ctx.deps.chat_id,
            "sql": sql
        }).execute()
        
        # Verify the insertion was successful
        if not result.data:
            error_msg = "Failed to create chart record"
            logfire.warn("Chart creation failed", 
                         error=error_msg, 
                         chat_id=ctx.deps.chat_id, 
                         request_id=ctx.deps.request_id)
            successful_execution = False
        elif len(result.data) == 0:
            error_msg = "No data was returned from the query"
            logfire.warn("Chart creation failed", 
                         error=error_msg, 
                         chat_id=ctx.deps.chat_id, 
                         request_id=ctx.deps.request_id)
            successful_execution = False

    except Exception as e:
        error_msg = f"Error creating chart record: {str(e)}"
        logfire.error("Supabase error", 
                     error=str(e), 
                     chat_id=ctx.deps.chat_id, 
                     request_id=ctx.deps.request_id)
        raise ValueError(error_msg)
    
    end_time = time.time()
    
    return SQLOutput(chart_id=result.data[0]["id"], sql=sql, success=successful_execution)

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