"""
Services for generating data insights from dataframes.
Provides functionality to analyze data and generate human-readable insights.
"""

from typing import Optional, List, Dict, Any
import polars as pl
from pydantic import BaseModel, ConfigDict, Field
import os
from pydantic_ai import Agent, ModelRetry, RunContext

from ..core.config import supabase
from ..core.models import LLMUsageRow
import time

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

class Insight(BaseModel):
    """
    Represents a set of insights derived from data analysis.
    """
    points: List[str]
    summary: str
    model_config = ConfigDict(extra="forbid")

async def _log(row: LLMUsageRow) -> None:
    supabase.table("llm_usage").insert(row.model_dump()).execute()

async def generate_insights(
    df: pl.DataFrame, 
    prompt: str, 
    chat_id: str,
    request_id: str,
    user_id: Optional[str] = None
) -> Optional[Insight]:
    """
    Generates insights from a dataframe using LLM analysis.
    Skips processing for large dataframes (>500 rows).
    
    Args:
        df: The data frame to analyze
        prompt: The original user prompt or query
        chat_id: The chat ID for tracking and logging
        request_id: The unique request ID from the frontend
        user_id: Optional user ID
        
    Returns:
        An Insight object containing analysis points and summary, or None if dataframe is too large
    """
    # Skip large dataframes to avoid excessive token usage
    if df.height > 500:
        return None
    
    t0 = time.perf_counter()
    
    # Create a preview of the data for context
    sample_rows = df.head(10).to_dicts()
    columns = df.columns
    
    # Get basic statistics for numeric columns
    stats = {}
    for col in df.columns:
        try:
            if df[col].dtype.is_numeric():
                stats[col] = {
                    "min": df[col].min(),
                    "max": df[col].max(),
                    "mean": df[col].mean(),
                    "null_count": df[col].null_count()
                }
        except:
            # Skip columns that can't be analyzed statistically
            pass
    
    # Create the insights agent
    insights_agent = Agent(
        OPENAI_MODEL,
        output_type=Insight,
        instrument=True,
        retry=ModelRetry(max_retries=3, delay=0.5),
    )
    
    # Define system prompt for the agent
    @insights_agent.system_prompt
    async def system_prompt() -> str:
        return """
        You are a data analysis expert. Generate insightful observations from the provided data.
        Focus on interesting patterns, outliers, and significant findings.
        
        Your response should include:
        1. A list of 3-5 specific insights as bullet points
        2. A brief summary paragraph tying these insights together
        
        Make your insights specific, actionable, and backed by the data.
        """
    
    # Create user prompt with data context
    user_message = f"""
    Data Columns: {columns}
    Statistics: {stats}
    Sample Data: {sample_rows}
    
    User Request: {prompt}
    
    Please analyze this data and provide key insights.
    """
    
    # Run the agent to get insights
    result = await insights_agent.run(user_message)
    
    # Calculate metrics
    latency = int((time.perf_counter() - t0) * 1000)
    
    # Simplified token estimation
    system_prompt_text = await system_prompt()
    prompt_tokens = len(system_prompt_text) + len(user_message)
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
            api_request="generate_insights",
            input_tokens=estimated_prompt_tokens,
            output_tokens=estimated_completion_tokens,
            compute_time=latency,
            total_cost=estimated_cost,
            user_id=user_id
        )
    )
    
    return result.output 