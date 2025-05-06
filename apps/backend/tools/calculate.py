import os
from typing import Any, Dict, List, Optional, Union, Literal
import ssl
import uuid
import asyncio
import json
import time

from apps.backend.app.main import get_data
import duckdb
import logfire
from logfire import span
import pandas as pd
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry
from supabase import create_client, Client
from dotenv import dotenv_values
from httpx import AsyncClient

from apps.backend.core.config import supabase as sb
from apps.backend.utils.files import extract_schema_sample
from apps.backend.core.models import DatasetProfile

# Fix SSL certificate verification issues for macOS
ssl._create_default_https_context = ssl._create_unverified_context

# Configure Logfire - this should be called once at application startup
# This is defined here for convenience but should be moved to a central place
logfire.configure()
logfire.instrument_pydantic_ai()

################################
# Base Models for the System
################################

class Deps(BaseModel):
    """Dependencies required by all agents in the system."""
    chat_id: str
    request_id: str
    file_id: str
    user_prompt: str
    last_chart_id: Optional[str] = None
    is_follow_up: bool = False
    duck: duckdb.DuckDBPyConnection
    supabase: Client
    model_config = {"arbitrary_types_allowed": True}


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


class BusinessInsightsOutput(BaseModel):
    """Simplified business insights output with just title and analysis text."""
    title: str = Field(description="Title summarizing the insights")
    analysis: str = Field(description="Detailed analysis text")


class AnalysisOutput(BaseModel):
    """Output from the intent analysis agent including all results."""
    answer: str = Field(description="Answer to the user's question")
    chart_id: Optional[str] = Field(default=None, description="ID of the chart if one was created")
    insights_title: Optional[str] = Field(default=None, description="Title of the insights if generated")
    insights_analysis: Optional[str] = Field(default=None, description="Business insights analysis if generated")


class OrchestratorOutput(BaseModel):
    """Output from the orchestrator agent."""
    answer: str = Field(description="Final answer to the user's question")
    chart_id: Optional[str] = Field(default=None, description="ID of the chart if one was created")
    insights: Optional[Dict[str, str]] = Field(default=None, description="Business insights if generated")


################################
# SQL Generation Agent
################################

sql_agent = Agent(
    "openai:gpt-4o-mini",
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
    - Your response must contain exactly ONE SQL query terminated with a semicolon.
    - Don't explain your reasoning - just return the SQL.
    - Use proper SQL syntax for DuckDB.
    - For aggregations, include appropriate GROUP BY clauses.
    - For visualizations, ensure you select appropriate columns.
    - AVOID using DELETE, DROP, UPDATE, ALTER, INSERT operations.
    - Avoid using comments (-- or /* */) in your SQL.
    
    Previous chart ID (if referenced): {ctx.deps.last_chart_id or "None"}
    User prompt: {ctx.deps.user_prompt}
    """


    
    return prompt


@sql_agent.tool
async def calculate(ctx: RunContext[Deps], input: CalcInput) -> SQLOutput:
    """
    Execute the SQL query and create a chart record in Supabase.
    """
    start_time = time.time()

    
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
        if not result.data or len(result.data) == 0:
            error_msg = "Failed to create chart record"
            logfire.error("Chart creation failed", 
                         error=error_msg, 
                         chat_id=ctx.deps.chat_id, 
                         request_id=ctx.deps.request_id)
            raise ValueError(error_msg)
            
    except Exception as e:
        error_msg = f"Error creating chart record: {str(e)}"
        logfire.error("Supabase error", 
                     error=str(e), 
                     chat_id=ctx.deps.chat_id, 
                     request_id=ctx.deps.request_id)
        raise ValueError(error_msg)
    
    end_time = time.time()
    

    
    return SQLOutput(chart_id=result.data[0]["id"], sql=sql,)


################################
# Business Insight Agent - Simplified
################################

business_insight_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    output_type=BusinessInsightsOutput,
)

@business_insight_agent.system_prompt
async def business_insight_system_prompt(ctx: RunContext[Deps]) -> str:
    """Generate system prompt for business insights."""

    
    # Get the dataset profile
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # We need to fetch the data for the chart
    file_id = ctx.deps.file_id
    chart_id = ctx.deps.last_chart_id
    
    # This is a simplified approach to get_data - you'll need to implement the actual function
    chart_data = None
    chart_sql = None
    
    try:
        # Helper function to get the data (implemented elsewhere)
        data_df = get_data(file_id, chart_id)
        
        # Convert to records for display in the prompt
        if data_df is not None and not data_df.empty:
            chart_data = data_df.head(10).to_dict(orient="records")
            
            # Get the SQL that was used
            chart_result = ctx.deps.supabase.table("charts").select("sql").eq("id", chart_id).execute()
            if chart_result.data and len(chart_result.data) > 0:
                chart_sql = chart_result.data[0].get("sql")
            

    except Exception as e:
        # Handle errors gracefully - if we can't get the data, we'll provide insights based on what we know
        logfire.warn("Failed to retrieve chart data", 
                    error=str(e), 
                    chat_id=ctx.deps.chat_id, 
                    chart_id=chart_id, 
                    request_id=ctx.deps.request_id)
        pass
    
    prompt = f"""
    You are a business insight agent that analyzes data query results and provides valuable insights.
    
    Your job is to examine the data provided and generate business insights that would be valuable 
    to stakeholders. Focus on identifying patterns, trends, anomalies, and actionable recommendations.
    
    Dataset columns:
    {json.dumps(list(profile.columns.keys()), indent=2)}
    
    {"" if not chart_sql else f"SQL Query Used:\n{chart_sql}\n"}
    
    {"" if not chart_data else f"Query Results (sample):\n{json.dumps(chart_data, indent=2)}\n"}
    
    Your output must include:
    1. A title: A concise heading that captures the essence of your insights
    2. An analysis: A detailed examination of the data with clear, actionable insights
    
    Make your analysis practical and business-focused. Avoid technical jargon and focus on 
    insights that would help business decision-makers.
    
    The user's original question was: "{ctx.deps.user_prompt}"
    """

    return prompt


@business_insight_agent.output_validator
async def validate_insights(
    ctx: RunContext[Deps],
    output: BusinessInsightsOutput
) -> BusinessInsightsOutput:
    """Validate business insights output."""

    # Ensure the title is not empty
    if not output.title or len(output.title.strip()) < 5:
        logfire.warn("Invalid insights title", 
                    reason="Title too short or empty", 
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        raise ModelRetry("Please provide a meaningful title for the insights.")
    
    # Ensure the analysis is substantial
    if not output.analysis or len(output.analysis.strip()) < 100:
        logfire.warn("Invalid insights analysis", 
                    reason="Analysis too short", 
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        raise ModelRetry("Please provide a more detailed analysis with substantial insights.")

    return output


################################
# Intent Analysis Agent
################################

intent_analysis_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    output_type=AnalysisOutput,
)

@intent_analysis_agent.system_prompt
async def intent_system_prompt(ctx: RunContext[Deps]) -> str:
    """Generate system prompt for intent analysis."""

    # Get the dataset profile using extract_schema_sample
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # Extract column names for context
    columns = list(profile.columns.keys())
    column_types = {name: dtype for name, dtype in profile.columns.items()}
    
    prompt = f"""
    You are an analytics agent for a data platform. Your job is to understand user requests 
    and coordinate the appropriate actions to fulfill them.
    
    The available columns in the dataset are:
    {json.dumps(columns, indent=2)}
    
    The column types are:
    {json.dumps(column_types, indent=2)}
    
    You have two tools available:
    1. `generate_sql`: Generates SQL queries to extract data from the dataset
    2. `generate_insights`: Analyzes data to provide business insights (requires a chart_id)
    
    Your workflow should follow these rules:
    - If the user is asking for specific data, visualizations, or statistics, use generate_sql first
    - Only use generate_insights when you have a chart_id (either from generate_sql or from last_chart_id)
    - If the user asks for insights or analysis based on previous results, use the last_chart_id
    - Always provide a clear, direct answer to the user's question
    
    Context:
    - Last chart ID (if any): {ctx.deps.last_chart_id or "None"}
    - Is this a follow-up question: {ctx.deps.is_follow_up}
    - User prompt: {ctx.deps.user_prompt}
    """

    return prompt


@intent_analysis_agent.tool
async def generate_sql(ctx: RunContext[Deps]) -> SQLOutput:
    """Generate and execute SQL to retrieve data."""

    
    start_time = time.time()
    
    try:
        result = await sql_agent.run(
            ctx.deps.user_prompt,
            deps=ctx.deps,
        )
        
        end_time = time.time()
        
 
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        

        raise


@intent_analysis_agent.tool
async def generate_insights(ctx: RunContext[Deps], chart_id: str) -> BusinessInsightsOutput:
    """Generate business insights from query results."""
 
    
    start_time = time.time()
    
    # Create a copy of the deps with the chart_id set
    new_deps = Deps(
        chat_id=ctx.deps.chat_id,
        request_id=ctx.deps.request_id,
        file_id=ctx.deps.file_id,
        user_prompt=ctx.deps.user_prompt,
        last_chart_id=chart_id,  # Set the chart_id
        is_follow_up=ctx.deps.is_follow_up,
        duck=ctx.deps.duck,
        supabase=ctx.deps.supabase
    )
    
    try:
        result = await business_insight_agent.run(
            ctx.deps.user_prompt,
            deps=new_deps,
        )
        
        end_time = time.time()

        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        
        logfire.error("Insights generation failed", 
                    execution_time=end_time - start_time,
                    error=str(e),
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        raise


@intent_analysis_agent.output_validator
async def validate_analysis_output(
    ctx: RunContext[Deps],
    output: AnalysisOutput
) -> AnalysisOutput:
    """Validate the intent analysis output."""

    
    # Ensure the answer is meaningful
    if not output.answer or len(output.answer.strip()) < 20:
        logfire.warn("Invalid analysis answer", 
                    reason="Answer too short or empty", 
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        raise ModelRetry("Please provide a more detailed answer to the user's question.")
    
    
    
    return output


################################
# Orchestrator Agent
################################

orchestrator_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    output_type=OrchestratorOutput,
)

@orchestrator_agent.system_prompt
async def orchestrator_system_prompt(ctx: RunContext[Deps]) -> str:
    """Generate system prompt for the orchestrator agent."""
    
    # Get the dataset profile for context
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # Extract column names for context
    columns = list(profile.columns.keys())
    
    prompt = f"""
    You are the orchestrator agent for a data analytics platform. Your job is to:
    
    1. Understand user requests
    2. Delegate tasks to specialized agents
    3. Combine their outputs into a cohesive response
    
    The dataset has these columns: {json.dumps(columns, indent=2)}
    
    You have access to an intent analysis agent that can:
    - Determine if a query needs SQL generation
    - Generate data insights when needed
    
    Context:
    - Last chart ID (if any): {ctx.deps.last_chart_id or "None"}
    - Is this a follow-up question: {ctx.deps.is_follow_up}
    - User prompt: {ctx.deps.user_prompt}
    
    Your job is to coordinate the workflow and ensure the user gets a complete answer.
    """
    
    return prompt


@orchestrator_agent.tool
async def analyze_intent(ctx: RunContext[Deps]) -> AnalysisOutput:
    """Run the intent analysis agent to process the user query."""
    
    start_time = time.time()
    
    try:
        result = await intent_analysis_agent.run(
            ctx.deps.user_prompt,
            deps=ctx.deps,
        )
        
        end_time = time.time()
        logfire.info("Intent analysis completed", 
                    execution_time=end_time - start_time,
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        logfire.error("Intent analysis failed", 
                    execution_time=end_time - start_time,
                    error=str(e),
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        raise


@orchestrator_agent.output_validator
async def validate_orchestrator_output(
    ctx: RunContext[Deps],
    output: OrchestratorOutput
) -> OrchestratorOutput:
    """Validate the orchestrator output."""
    
    # Ensure the answer is meaningful
    if not output.answer or len(output.answer.strip()) < 20:
        logfire.warn("Invalid orchestrator answer", 
                    reason="Answer too short or empty", 
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        raise ModelRetry("Please provide a more detailed answer to the user's question.")
    
    return output


################################
# Main Handler Function
################################

async def process_user_request(
    chat_id: str,
    request_id: str,
    file_id: str,
    user_prompt: str,
    is_follow_up: bool = False,
    last_chart_id: Optional[str] = None,
    duck_connection: Optional[duckdb.DuckDBPyConnection] = None,
    supabase_client: Optional[Client] = None
) -> Dict[str, Any]:
    """
    Process a user request through the multi-agent system.
    
    Args:
        chat_id: ID of the chat session
        request_id: ID of the specific request
        file_id: ID of the CSV file
        user_prompt: Natural language prompt from the user
        is_follow_up: Whether this is a follow-up question
        last_chart_id: ID of the previous chart (if any)
        duck_connection: DuckDB connection (created if not provided)
        supabase_client: Supabase client (created if not provided)
        
    Returns:
        Dict containing the final response
    """
    # Create a span for the entire request processing
    start_time = time.time()
    
    logfire.info("Processing user request", 
               chat_id=chat_id, 
               request_id=request_id,
               file_id=file_id,
               is_follow_up=is_follow_up)
    
    # Create connections if not provided
    if duck_connection is None:
        duck_connection = duckdb.connect(":memory:")
        
    if supabase_client is None:
        # Initialize Supabase client from environment
        supabase_url = os.environ.get("SUPABASE_URL") or sb.SUPABASE_URL
        supabase_key = os.environ.get("SUPABASE_KEY") or sb.SUPABASE_KEY
        supabase_client = create_client(supabase_url, supabase_key)
        
    # Create dependencies object
    deps = Deps(
        chat_id=chat_id,
        request_id=request_id,
        file_id=file_id,
        user_prompt=user_prompt,
        last_chart_id=last_chart_id,
        is_follow_up=is_follow_up,
        duck=duck_connection,
        supabase=supabase_client
    )
    
    try:
        # Run the orchestrator agent which will manage the workflow
        result = await orchestrator_agent.run(
            user_prompt,
            deps=deps,
        )
        
        output = result.output
        
        # Format the response
        response = {
            "answer": output.answer,
            "request_id": request_id,
            "chat_id": chat_id,
        }
        
        # Add chart ID if available
        if output.chart_id:
            response["chart_id"] = output.chart_id
        
        # Add insights if available
        if output.insights:
            response["insights"] = output.insights
        
        end_time = time.time()
        
        logfire.info("Request processed successfully", 
                   execution_time=end_time - start_time,
                   chat_id=chat_id, 
                   request_id=request_id)
        
        return response
    
    except Exception as e:
        end_time = time.time()
        
        logfire.error("Error processing user request",
                     execution_time=end_time - start_time, 
                     error=str(e),
                     error_type=type(e).__name__,
                     chat_id=chat_id,
                     request_id=request_id)
        
        # Re-raise the exception after logging it
        raise