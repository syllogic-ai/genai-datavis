"""
Services for chart generation and visualization.
Provides functionality to choose chart types and build chart specifications.
"""

from typing import Dict, List, Optional, Any, Literal, Union
import polars as pl
from pydantic import BaseModel, ConfigDict, Field
import os
import time
from pydantic_ai import Agent, ModelRetry, RunContext

from ..core.models import ChartSpec, LLMUsageRow
from ..core.config import supabase


OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class SQLRequest(BaseModel):
    """
    Represents a SQL request with query and context.
    """
    query: str
    file_id: str
    model_config = ConfigDict(extra="forbid")


class ChartChoice(BaseModel):
    """
    Represents a chart type selection with reasoning.
    """
    chart_type: Literal["bar", "line", "area", "kpi"]
    reasoning: str
    model_config = ConfigDict(extra="forbid")


async def _log(row: LLMUsageRow) -> None:
    supabase.table("llm_usage").insert(row.model_dump()).execute()


async def choose_chart_type(request: SQLRequest, request_id: str) -> ChartChoice:
    """
    Determines the most appropriate chart type for the given SQL query.
    
    Args:
        request: SQL request containing query and file ID
        request_id: The unique request ID from the frontend
        
    Returns:
        A ChartChoice object with recommended chart type and reasoning
    """
    t0 = time.perf_counter()
    
    # Create the agent for chart type selection
    chart_agent = Agent(
        OPENAI_MODEL,
        output_type=ChartChoice,
        instrument=True,
        retry=ModelRetry(max_retries=3, delay=0.5),
    )
    
    # Define system prompt for the agent
    @chart_agent.system_prompt
    async def system_prompt() -> str:
        return """
        You are a data visualization expert. Your task is to select the most appropriate chart type 
        based on the SQL query. Follow these guidelines:
        
        - If the dimension is a datetime field, prefer line or area charts
        - For categorical comparisons, use bar charts
        - For single value metrics, use KPI cards
        
        IMPORTANT: You MUST choose ONLY ONE of these chart types: "bar", "line", "area", or "kpi".
        No other chart types are supported by the system.
        
        Provide your recommendation with clear reasoning.
        """
    
    # User prompt with SQL query
    user_prompt = f"SQL Query: {request.query}\n\nWhat chart type would be most appropriate for visualizing the results of this query?"
    
    # Run the agent
    result = await chart_agent.run(user_prompt)
    
    # Calculate metrics
    latency = int((time.perf_counter() - t0) * 1000)
    
    # Simplified token estimation
    system_prompt_text = await system_prompt()
    prompt_tokens = len(system_prompt_text) + len(user_prompt)
    completion_tokens = len(str(result.output))
    
    # Estimate tokens (1 token ≈ 4 characters in English)
    estimated_prompt_tokens = prompt_tokens // 4
    estimated_completion_tokens = completion_tokens // 4
    
    # Simplified cost calculation
    cost_per_1k_input = 0.0001  # Example placeholder value
    cost_per_1k_output = 0.0002  # Example placeholder value
    estimated_cost = (
        (estimated_prompt_tokens / 1000) * cost_per_1k_input + 
        (estimated_completion_tokens / 1000) * cost_per_1k_output
    )
    
    # Log usage
    await _log(
        LLMUsageRow(
            request_id=request_id,
            chat_id=request.file_id,
            model=OPENAI_MODEL,
            provider="OpenAI",
            api_request="choose_chart_type",
            input_tokens=estimated_prompt_tokens,
            output_tokens=estimated_completion_tokens,
            compute_time=latency,
            total_cost=estimated_cost,
        )
    )
    
    return result.output


async def build_chart_spec(
    choice: ChartChoice, 
    df: pl.DataFrame, 
    prompt: str, 
    chat_id: str,
    request_id: str,
    user_id: Optional[str] = None
) -> ChartSpec:
    """
    Builds a complete chart specification based on the chosen chart type and data.
    
    Args:
        choice: The ChartChoice containing the selected chart type
        df: The data frame containing the data to visualize
        prompt: The original user prompt or query
        chat_id: The chat ID for tracking and logging
        request_id: The unique request ID from the frontend
        user_id: Optional user ID
        
    Returns:
        A complete ChartSpec object that can be rendered by the frontend
    """
    t0 = time.perf_counter()
    
    # Create a preview of the data for context
    sample_rows = df.head(5).to_dicts()
    columns = df.columns
    column_types = {col: str(df[col].dtype) for col in columns}
    
    # Create the agent for chart specification
    chart_spec_agent = Agent(
        OPENAI_MODEL,
        output_type=ChartSpec,
        instrument=True,
    )
    
    # Define system prompt for the agent
    @chart_spec_agent.system_prompt
    async def system_prompt() -> str:
        return """
        You are a data visualization expert. Design a chart specification that follows best practices.
        The specification must be valid according to the ChartSpec model.
        
        Consider these factors:
        1. The chosen chart type and dataset structure
        2. Appropriate axis labels and formatting
        3. Color choices that are accessible and meaningful
        4. Clear title and description
        
        Return ONLY the final chart specification that can be directly validated.
        """
    
    # Create user prompt with context
    user_prompt = f"""
    Chart Type: {choice.chart_type}
    Reasoning: {choice.reasoning}
    
    Data Columns: {columns}
    Column Types: {column_types}
    Sample Data: {sample_rows}
    
    User Request: {prompt}
    
    Please create a complete chart specification for this data.
    """
    
    # Using the chart spec validator to ensure output is valid
    @chart_spec_agent.output_validator
    async def validate_output(ctx: RunContext, output: ChartSpec) -> ChartSpec:
        # Ensure chart_type matches the chosen type
        if output.chart_type != choice.chart_type:
            raise ModelRetry(f"Chart type must be {choice.chart_type}")
        
        # Add other validation as needed
        return output
    
    # Run the agent
    result = await chart_spec_agent.run(user_prompt)
    
    # Calculate metrics
    latency = int((time.perf_counter() - t0) * 1000)
    
    # Simplified token estimation
    system_prompt_text = await system_prompt()
    prompt_tokens = len(system_prompt_text) + len(user_prompt)
    completion_tokens = len(str(result.output))
    
    # Estimate tokens (1 token ≈ 4 characters in English)
    estimated_prompt_tokens = prompt_tokens // 4
    estimated_completion_tokens = completion_tokens // 4
    
    # Simplified cost calculation
    cost_per_1k_input = 0.0001  # Example placeholder value
    cost_per_1k_output = 0.0002  # Example placeholder value
    estimated_cost = (
        (estimated_prompt_tokens / 1000) * cost_per_1k_input + 
        (estimated_completion_tokens / 1000) * cost_per_1k_output
    )
    
    # Log usage
    await _log(
        LLMUsageRow(
            request_id=request_id,
            chat_id=chat_id,
            model=OPENAI_MODEL,
            provider="OpenAI",
            api_request="build_chart_spec",
            input_tokens=estimated_prompt_tokens,
            output_tokens=estimated_completion_tokens,
            compute_time=latency,
            total_cost=estimated_cost,
            user_id=user_id
        )
    )
    
    return result.output 