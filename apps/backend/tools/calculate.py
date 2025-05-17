import os
from typing import Any, Dict, List, Optional, Union, Literal
import ssl
import uuid
import asyncio
import json
import time

from apps.backend.utils.chat import append_chat_message, convert_chart_data_to_chart_config, get_last_chart_id_from_chat_id, get_message_history, get_last_chart_id, remove_null_pairs, update_chart_specs
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.utils import get_data, filter_messages_to_role_content
import duckdb
import logfire
from logfire import span
import pandas as pd
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry
from supabase import create_client, Client
from dotenv import dotenv_values
from pydantic_ai.messages import ModelMessagesTypeAdapter
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
    message_history: List[Dict[str, str]]
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

# Define the dependencies class
class VisualDeps(BaseModel):
    """Dependencies required by all agents in the system."""
    available_columns: list[str]
    data_cur: pd.DataFrame
    model_config = {"arbitrary_types_allowed": True}

# Define the x axis config class
class xAxisConfigClass(BaseModel):
    dataKey: str = Field(description="The field to use for the x-axis. Should be one of the available columns.")
    dateFormat: Optional[str] = Field(default=None, description="Format string for date values on the x-axis (uses moment.js)")
    tickLine: bool = Field(default=False, description="Whether to show the x-axis tick lines")
    axisLine: bool = Field(default=False, description="Whether to show the x-axis line")
    tickMargin: int = Field(default=10, description="Margin for the x-axis tick labels")
    hide: bool = Field(default=False, description="Whether to hide the x-axis")

# Define the y axis config class
class yAxisConfigClass(BaseModel):
    tickLine: bool = Field(default=False, description="Whether to show the tick lines for y axis")
    axisLine: bool = Field(default=False, description="Whether to show the y axis line")
    tickMargin: int = Field(default=8, description="Margin for the y-axis tick labels")
    tickCount: int = Field(default=5, description="Number of ticks to display")
    hide: bool = Field(default=False, description="Whether to hide the y-axis")

class colorPaletteClass(BaseModel):
    colors: list[str] = Field(default=["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1"], description="The color palette to use for the chart")

# =============================================== Bar Chart definitions ===============================================
class barConfigClass(BaseModel):
    isHorizontal: Optional[bool] = Field(default=False, description="Whether to display bars horizontally instead of vertically")
    truncateLabels: Optional[bool] = Field(default=None, description="Whether to truncate long labels on the axis")
    maxLabelLength: Optional[int] = Field(default=3, description="Maximum length of labels before truncation (used with truncateLabels)")
    radius: int = Field(default=4, description="The radius of the bars")
    fillOpacity: float = Field(default=0.8, description="The opacity of the bars")
    barGap: Optional[int] = Field(default=None, description="Gap between bars in the same group")
    barSize: Optional[int] = Field(default=None, description="Size of the bars")
    barCategoryGap: Optional[int] = Field(default=None, description="Gap between bar groups")

class BarChartInput(BaseModel):
    """
    What will be given as an input to the tool (by the agent).
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumns: list[str] = Field(description="The columns to use for the bars")
    xAxisConfig: xAxisConfigClass = Field(description="The configuration for the x-axis")
    xColumn: str = Field(description="The column to use for the x-axis. Should be one of the input dataframe's available columns.")
    barConfig: barConfigClass = Field(description="The configuration for the bars")
    yAxisConfig: yAxisConfigClass = Field(description="The configuration for the y-axis")
    
# Define the output schema
class BarChartOutput(BaseModel):
    """
    What is finally expected as an output from the tool.
    """
    chartType: Literal["bar"]
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    xAxisConfig: xAxisConfigClass = Field(description="The configuration for the x-axis")
    chartConfig: dict = Field(description="The configuration for the chart, including the colors and labels for each column")
    barConfig: barConfigClass = Field(description="The configuration for the bars")
    yAxisConfig: yAxisConfigClass = Field(description="The configuration for the y-axis")

# =============================================== Area Chart definitions ===============================================
class gradientStopsClass(BaseModel):
    topOffset: str = Field(default="5%", description="Offset for the top gradient stop")
    bottomOffset: str = Field(default="95%", description="Offset for the bottom gradient stop")
    topOpacity: float = Field(default=0.8, description="Opacity for the top gradient stop")
    bottomOpacity: float = Field(default=0.1, description="Opacity for the bottom gradient stop")

class areaConfigClass(BaseModel):
    useGradient: bool = Field(default=None, description="Whether to use gradient fills instead of solid colors")
    fillOpacity: float = Field(default=0.4, description="Opacity of the area fill")
    gradientStops: Optional[gradientStopsClass] = Field(default=None, description="Configuration for gradient stops")

class AreaChartInput(BaseModel):
    """
    Input specification for area charts
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumns: list[str] = Field(description="The columns to use for the y axis")
    xColumn: str = Field(description="The column to use for the x-axis. Should be one of the input dataframe's available columns.")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    areaConfig: Optional[areaConfigClass] = Field(default=None, description="Configuration specific to area charts")
    stacked: bool = Field(default=False, description="Whether to stack the areas on top of each other")

class AreaChartOutput(BaseModel):
    """
    Output specification for area charts
    """
    chartType: Literal["area", "line"]
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    data: list[dict] = Field(description="The data to display in the chart")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    areaConfig: Optional[areaConfigClass] = Field(default=None, description="Configuration specific to area charts")
    stacked: bool = Field(default=False, description="Whether to stack the areas on top of each other")
    chartConfig: dict = Field(description="The configuration for the chart, including the colors and labels for each column")

# =============================================== Line Chart definitions ===============================================
class LineChartInput(BaseModel):
    """
    Input specification for line charts
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumns: list[str] = Field(description="The columns to use for the y axis")
    xColumn: str = Field(description="The column to use for the x-axis. Should be one of the input dataframe's available columns.")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    
class LineChartOutput(BaseModel):
    """
    Output specification for line charts
    """
    chartType: Literal["line"] = Field(default="line", description="Type of chart")
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    data: list[dict] = Field(description="The data to display in the chart")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    chartConfig: dict = Field(description="The configuration for the chart, including the colors and labels for each column")

# =============================================== KPI definitions ===============================================
class fontSizeClass(BaseModel):
    value: Optional[Union[str, int]] = Field(default=None, description="Font size for the main value")
    label: Optional[Union[str, int]] = Field(default=None, description="Font size for the main label")
    change: Optional[Union[str, int]] = Field(default=None, description="Font size for the change indicator")

class kpiStylesClass(BaseModel):
    valueColor: Optional[str] = Field(default=None, description="Color for the main value text")
    labelColor: Optional[str] = Field(default=None, description="Color for the main label text")
    subLabelColor: Optional[str] = Field(default=None, description="Color for the sub-label text")
    changePositiveColor: Optional[str] = Field(default=None, description="Color for positive change indicators")
    changeNegativeColor: Optional[str] = Field(default=None, description="Color for negative change indicators")
    changeFlatColor: Optional[str] = Field(default=None, description="Color for flat/neutral change indicators")
    backgroundColor: Optional[str] = Field(default=None, description="Background color of the KPI container")
    padding: Optional[Union[str, int]] = Field(default=None, description="Padding of the KPI container")
    borderRadius: Optional[Union[str, int]] = Field(default=None, description="Border radius of the KPI container")
    fontSize: Optional[fontSizeClass] = Field(default=None, description="Font size configuration for different text elements")

class KPIInput(BaseModel):
    """
    Input specification for KPI components
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(default="", description="a 5 word description of the chart")
    # kpiValue: Optional[Union[str, int, float]] = Field(default=None, description="The main value to display in the KPI")
    dataColumn: str = Field(description="The column to use for the KPI value")
    kpiSuffix: Optional[str] = Field(default=None, description="Text to append after the value (e.g., %, $, etc.)")
    kpiPrefix: Optional[str] = Field(default=None, description="Text to prepend before the value (e.g., $, €, etc.)")
    kpiLabel: Optional[str] = Field(default=None, description="Main label text displayed below the value")
    kpiSubLabel: Optional[str] = Field(default=None, description="Secondary label text displayed below the main label")
    changeColumn: Optional[str] = Field(default=None, description="The column to use for the change value")
    # kpiChange: Optional[float] = Field(default=None, description="Numeric value representing the change (e.g., 5.2 for 5.2% increase)")
    # kpiChangeDirection: Optional[str] = Field(default=None, description="Direction of change ('up', 'down', or 'flat')")
    kpiChangeFormat: Optional[str] = Field(default=None, description="Format string for the change value (e.g., '+0.0%')")
    kpiValueFormat: Optional[str] = Field(default=None, description="Format string for the main value")
    kpiStyles: Optional[kpiStylesClass] = Field(default=None, description="Styling options for the KPI component")

class KPIOutput(BaseModel):
    """
    Output specification for KPI components
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(default="", description="a 5 word description of the chart")
    chartType: Literal["kpi"] = Field(default="kpi", description="Type of chart")
    kpiValue: Union[str, int, float] = Field(description="The main value to display in the KPI")
    kpiSuffix: Optional[str] = Field(default=None, description="Text to append after the value (e.g., %, $, etc.)")
    kpiPrefix: Optional[str] = Field(default=None, description="Text to prepend before the value (e.g., $, €, etc.)")
    kpiLabel: Optional[str] = Field(default=None, description="Main label text displayed below the value")
    kpiSubLabel: Optional[str] = Field(default=None, description="Secondary label text displayed below the main label")
    kpiChange: Optional[float] = Field(default=None, description="Numeric value representing the change (e.g., 5.2 for 5.2% increase)")
    kpiChangeDirection: Optional[str] = Field(default=None, description="Direction of change ('up', 'down', or 'flat')")
    kpiChangeFormat: Optional[str] = Field(default=None, description="Format string for the change value (e.g., '+0.0%')")
    kpiValueFormat: Optional[str] = Field(default=None, description="Format string for the main value")
    kpiStyles: Optional[kpiStylesClass] = Field(default=None, description="Styling options for the KPI component")


################################
# SQL Generation Agent
################################

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
    - Your response must contain exactly ONE SQL query terminated with a semicolon.
    - Don't explain your reasoning - just return the SQL.
    - Use proper SQL syntax for DuckDB.
    - For aggregations, include appropriate GROUP BY clauses.
    - For visualizations, ensure you select appropriate columns.
    - AVOID using DELETE, DROP, UPDATE, ALTER, INSERT operations.
    - Avoid using comments (-- or /* */) in your SQL.
    - The table name is ALWAYS "csv_data"
    - Verify all parentheses are properly balanced in complex expressions
    - Enclose column names containing spaces in double quotes (e.g., "Subscription Date")
    - Ensure date functions are compatible with DuckDB (not SQLite-specific)
    - If you need to use date functions (like strftime) on a column that is a string (VARCHAR), always cast it to DATE or TIMESTAMP first. For example: strftime('%Y', CAST("Subscription Date" AS DATE))
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
        data_df = get_data(file_id, chart_id, ctx.deps.supabase, ctx.deps.duck)
        
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
    
    You have three tools available:
    1. `generate_sql`: Generates SQL queries to extract data from the dataset
    2. `generate_insights`: Analyzes data to provide business insights (requires a chart_id)
    3. `visualize_chart`: Visualizes data using the chart_agent.
    
    Your workflow should follow these rules:
    - If the user is asking for specific data, visualizations, or statistics, use generate_sql first
    - Only use generate_insights when you have a chart_id (either from generate_sql or from last_chart_id)
    - If the user asks for insights or analysis based on previous results, use the last_chart_id
    - Always provide a clear, direct answer to the user's question
    - ALWAYS run generate_insights after generate_sql
    
    Context:
    - Last chart ID (if any): {ctx.deps.last_chart_id or "None"}
    - Is this a follow-up question: {ctx.deps.is_follow_up}
    - User prompt: {ctx.deps.user_prompt}
    - Message history: {json.dumps(ctx.deps.message_history, indent=2)}
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
        
        # Store the new chart_id in the context for other tools to use
        ctx.deps.last_chart_id = result.output.chart_id
 
        _log_llm(result.usage(), sql_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  

        
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
        supabase=ctx.deps.supabase,
        message_history=ctx.deps.message_history
    )
    
    try:
        result = await business_insight_agent.run(
            ctx.deps.user_prompt,
            deps=new_deps,
            
        )
        
        end_time = time.time()

        _log_llm(result.usage(), business_insight_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  

        
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
    - Message history: {json.dumps(ctx.deps.message_history, indent=2)}
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
        
        logfire.info(
            "Intent analysis result",
            usage=result.usage
        )

        
        end_time = time.time()
        logfire.info("Intent analysis completed", 
                    execution_time=end_time - start_time,
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        
        _log_llm(result.usage(), intent_analysis_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  

        
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
        
    # Run tasks in parallel
    message_history_task = asyncio.create_task(get_message_history(chat_id, 5))
    last_chart_id_task = asyncio.create_task(get_last_chart_id(chat_id))
    
    # Await both tasks
    message_history_result, last_chart_id_result = await asyncio.gather(
        message_history_task, 
        last_chart_id_task
    )
    
    print(last_chart_id_result)

    message_history = filter_messages_to_role_content(message_history_result)


    # Create dependencies object
    deps = Deps(
        chat_id=chat_id,
        request_id=request_id,
        file_id=file_id,
        user_prompt=user_prompt,
        last_chart_id=last_chart_id_result,
        is_follow_up=is_follow_up,
        duck=duck_connection,
        supabase=supabase_client,
        message_history=message_history
    )
    

    
    try:
        # Run the orchestrator agent which will manage the workflow
        result = await orchestrator_agent.run(
            user_prompt,
            deps=deps,
        )
        
        logfire.info(
            "Orchestrator result",
            usage=result.usage
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
        duration = end_time - start_time
        
        _log_llm(result.usage(), orchestrator_agent, duration, deps.chat_id, deps.request_id)  
        

        
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


# =============================================== Agent run ===============================================


# Declare the agent
viz_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    allow_tool_output=True
)


@intent_analysis_agent.tool
async def visualize_chart(ctx: RunContext[Deps]) -> dict:
    """
    Run the viz_agent with the provided visualization input and current data context.
    This tool allows the intent_analysis_agent to delegate chart spec generation to the viz_agent.
    The input viz_input should be an instance of BarChartInput, AreaChartInput, LineChartInput, or KPIInput.
    """
    start_time = time.time()
    
    chart_id = await get_last_chart_id_from_chat_id(ctx.deps.chat_id)
    print("chart_id: ", chart_id)
    
    newDeps = Deps(
        chat_id=ctx.deps.chat_id,
        request_id=ctx.deps.request_id,
        file_id=ctx.deps.file_id,
        user_prompt=ctx.deps.user_prompt,
        last_chart_id=chart_id,
        is_follow_up=ctx.deps.is_follow_up,
        duck=ctx.deps.duck,
        supabase=ctx.deps.supabase,
        message_history=ctx.deps.message_history
    )

    try:
        # Run the viz_agent with the provided input and dependencies
        result = await viz_agent.run(
            ctx.deps.user_prompt,
            deps=newDeps,
        )
        
        response = remove_null_pairs(result.output)
        
        chart_id = await get_last_chart_id_from_chat_id(ctx.deps.chat_id)
        
        await update_chart_specs(chart_id, response)
        
        message = {
            "role": "charts",
            "content": chart_id,
        }
        
        await append_chat_message(ctx.deps.chat_id, message=message)
        
        end_time = time.time()
        # Optionally log usage or timing here
        
        _log_llm(result.usage(), viz_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        # Optionally log error here
        raise



# Declare the systems prompt
@viz_agent.system_prompt
async def system_prompt(ctx: RunContext[Deps]) -> str:
    
    data_cur = get_data(ctx.deps.file_id, ctx.deps.last_chart_id, ctx.deps.supabase, ctx.deps.duck)
    data_cols = data_cur.columns.tolist()
    
    logfire.info("Data columns", data_cols=data_cols)
    
    prompt = f"""
    You are a data visualization expert. You are given a user prompt and a dataset.
    The dataset has the following columns: {data_cols}

    Your task is to:
    1. Run one of the following tools with appropriate parameters
        - visualize_bar for bar chart
        - visualize_area for area chart
        - visualize_line for line chart
        - visualize_kpi for KPI
    2. Return the EXACT output from the tool call without any modifications
    
    The output should be in this format:
    {{
        "chartType": "bar",
        "title": "<title>",
        "description": "<description>",
        "data": [...],
        "xAxisConfig": {{"dataKey": "<x_column>"}},
        "chartConfig": {{...}},
        "barConfig": {{...}},
        "yAxisConfig": {{...}}
    }}

    DO NOT modify the tool output in any way. Return it exactly as received from the tool.
    """
    return prompt


# =============================================== Tools definitions ===============================================
@viz_agent.tool
async def visualize_bar(ctx: RunContext[Deps], input: BarChartInput) -> BarChartOutput:
    """
    Enhance the charts specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize bar tool!")
    chartType = "bar"
    colors = colorPaletteClass().colors

    data_cols = input.dataColumns
    x_key = input.xColumn
    # Calculate the data field
    # chart_data_array = convert_data_to_chart_data(data_cur, data_cols, x_key)
    chart_config = convert_chart_data_to_chart_config(data_cols, colors)

    response = BarChartOutput(
        chartType=chartType,    
        title=input.title,
        description=input.description,
        xAxisConfig=xAxisConfigClass(dataKey=input.xColumn),
        chartConfig=chart_config,
        barConfig=input.barConfig,
        yAxisConfig=input.yAxisConfig, 
    )

    # Update the chart_specs entry in the given chat_id
    try:
        # chart_id = ctx.deps.last_chart_id
        # await update_chart_specs(chart_id, response.model_dump())
        
        # message = {
        #     "role": "charts",
        #     "content": chart_id,
        # }
        
        # await append_chat_message(ctx.deps.chat_id, message=message)
        print("response: ", response.model_dump())
        
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

@viz_agent.tool
async def visualize_area(ctx: RunContext[Deps], input: AreaChartInput) -> AreaChartOutput:
    """
    Enhance the area chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize area tool!")
    chartType = "area"
    colors = colorPaletteClass().colors

    data_cur = ctx.deps.data_cur
    data_cols = input.dataColumns
    x_key = input.xColumn
    # Calculate the data field
    # chart_data_array = convert_data_to_chart_data(data_cur, data_cols, x_key)
    chart_config = convert_chart_data_to_chart_config(data_cur, data_cols, colors)

    response = AreaChartOutput(
        chartType=chartType,    
        title=input.title,
        description=input.description,
        # data=chart_data_array,
        xAxisConfig=xAxisConfigClass(dataKey=input.xColumn),
        chartConfig=chart_config,
        lineType=input.lineType,
        strokeWidth=input.strokeWidth,
        dot=input.dot,
        areaConfig=input.areaConfig,
        stacked=input.stacked,
        yAxisConfig=input.yAxisConfig,  
    )

    # Update the chart_specs entry in the given chat_id
    try:
        chart_id = ctx.deps.last_chart_id
        await update_chart_specs(chart_id, response.model_dump())
        await append_chat_message(ctx.deps.chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

@viz_agent.tool
async def visualize_line(ctx: RunContext[Deps], input: LineChartInput) -> LineChartOutput:
    """
    Enhance the line chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize line tool!")
    chartType = "line"
    colors = colorPaletteClass().colors 

    data_cur = ctx.deps.data_cur
    data_cols = input.dataColumns
    x_key = input.xColumn
    # Calculate the data field
    # chart_data_array = convert_data_to_chart_data(data_cur, data_cols, x_key)
    chart_config = convert_chart_data_to_chart_config(data_cur, data_cols, colors)  

    response = LineChartOutput(
        chartType=chartType,
        title=input.title,
        description=input.description,
        # data=chart_data_array,
        xAxisConfig=input.xAxisConfig,
        yAxisConfig=input.yAxisConfig,
        lineType=input.lineType,
        strokeWidth=input.strokeWidth,
        dot=input.dot,
        chartConfig=chart_config
    )

    # Update the chart_specs entry in the given chat_id
    try:
        chart_id = ctx.deps.last_chart_id
        await update_chart_specs(chart_id, response.model_dump())
        await append_chat_message(ctx.deps.chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

@viz_agent.tool
async def visualize_kpi(ctx: RunContext[Deps], input: KPIInput) -> KPIOutput:
    """
    Enhance the KPI specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize KPI tool!")
    chartType = "kpi"   

    data_cur = ctx.deps.data_cur
    data_col = input.dataColumn
    change_col = input.changeColumn

    print("change_col: ", change_col)
    if change_col:
        change_value = data_cur.iloc[0][change_col]
        change_direction = "up" if data_cur.iloc[0][change_col] > 0 else "down" if data_cur.iloc[0][change_col] < 0 else "flat"
    else:
        change_direction = None
        change_value = None

    response = KPIOutput(
        chartType=chartType,
        kpiValue=data_cur.iloc[0][data_col],
        kpiSuffix=input.kpiSuffix,
        kpiPrefix=input.kpiPrefix,
        kpiLabel=input.kpiLabel,
        kpiSubLabel=input.kpiSubLabel,
        kpiChange=change_value,
        kpiChangeDirection=change_direction,
        kpiChangeFormat=input.kpiChangeFormat,
        kpiValueFormat=input.kpiValueFormat,
        kpiStyles=input.kpiStyles,
        title=input.title,
        description=input.description
    )

    # Update the chart_specs entry in the given chat_id
    try:
        chart_id = ctx.deps.last_chart_id
        await update_chart_specs(chart_id, response.model_dump())
        await append_chat_message(ctx.deps.chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response
