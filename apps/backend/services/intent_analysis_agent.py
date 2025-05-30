from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry

from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.utils.files import extract_schema_sample
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.chat import get_last_chart_id_from_chat_id, append_chat_message
from apps.backend.services.sql_agent import sql_agent
from apps.backend.services.business_insights_agent import business_insights_agent
from apps.backend.services.viz_agent import viz_agent

class AnalysisOutput(BaseModel):
    """Output from the intent analysis agent including all results."""
    answer: str = Field(description="Answer to the user's question")
    chart_id: Optional[str] = Field(default=None, description="ID of the chart if one was created")
    insights_title: Optional[str] = Field(default=None, description="Title of the insights if generated")
    insights_analysis: Optional[str] = Field(default=None, description="Business insights analysis if generated")

class SQLOutput(BaseModel):
    """Output from SQL generation, includes chart ID."""
    chart_id: str = Field(description="The ID of the chart that has been created")
    sql: str = Field(description="The generated SQL query")
    insights_title: Optional[str] = Field(default=None, description="Title of the insights if generated")
    insights_analysis: Optional[str] = Field(default=None, description="Business insights analysis if generated")
    success: bool = Field(default=True, description="Whether the SQL query was executed successfully")

class BusinessInsightsOutput(BaseModel):
    """Simplified business insights output with just title and analysis text."""
    title: str = Field(description="Title summarizing the insights")
    analysis: str = Field(description="Detailed analysis text")

# Declare the intent analysis agent
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
    3. `visualize_chart`: Visualizes data using the viz_agent.
    
    Your workflow should follow these rules:
    - If the user is asking for specific data, visualizations, or statistics, use generate_sql first
    - Only use generate_insights when you have a chart_id (either from generate_sql or from last_chart_id)
    - If the user asks for insights or analysis based on previous results, use the last_chart_id
    - Always provide a clear, direct answer to the user's question
    - ALWAYS run generate_insights after generate_sql
    - When the user asks you for a chart, or a chart ask is implied, ALWAYS run the visualize_chart tool, to produce a visualization.
    - When a user asks for an formatting update in an already generated chart (f.i. change the color or the font) you ALWAYS run the visualize_chart tool, without generating SQL again. 

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
        result = await business_insights_agent.run(
            ctx.deps.user_prompt,
            deps=new_deps,
        )
        
        end_time = time.time()

        _log_llm(result.usage(), business_insights_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        
        logfire.error("Insights generation failed", 
                    execution_time=end_time - start_time,
                    error=str(e),
                    chat_id=ctx.deps.chat_id, 
                    request_id=ctx.deps.request_id)
        raise

@intent_analysis_agent.tool
async def visualize_chart(ctx: RunContext[Deps]) -> dict:
    """
    Run the viz_agent with the provided visualization input and current data context.
    This tool allows the intent_analysis_agent to delegate chart spec generation to the viz_agent.
    """
    start_time = time.time()
    
    chart_id = await get_last_chart_id_from_chat_id(ctx.deps.chat_id)
    
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
        result = await viz_agent.run(
            ctx.deps.user_prompt,
            deps=newDeps,
        )
        
        # Add the visualization result to the chat history
        message = {
            "role": "chart",
            "content": chart_id,
        }
        
        await append_chat_message(ctx.deps.chat_id, message=message)
        
        end_time = time.time()
        _log_llm(result.usage(), viz_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
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