from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry
from datetime import datetime
import pandas as pd

from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.utils.files import extract_schema_sample
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.utils import get_data

class BusinessInsightsOutput(BaseModel):
    """Simplified business insights output with just title and analysis text."""
    title: str = Field(description="Title summarizing the insights")
    analysis: str = Field(description="Detailed analysis text")

# Declare the business insights agent
business_insights_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    output_type=BusinessInsightsOutput,
)

@business_insights_agent.system_prompt
async def business_insights_system_prompt(ctx: RunContext[Deps]) -> str:
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
            chart_result = await ctx.deps.supabase.table("widgets").select("sql").eq("id", chart_id).execute()
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

    def json_serial(obj):
        """JSON serializer for objects not serializable by default json code"""
        if isinstance(obj, (datetime, pd.Timestamp)): # Check for datetime and pd.Timestamp
            return obj.isoformat()
        raise TypeError (f"Type {type(obj)} not serializable for JSON")
    
    # Prepare the SQL query section
    sql_section = f"""
    SQL Query Used:
    {chart_sql}
    """ if chart_sql else ""

    # Prepare the query results section
    results_section = f"""
    Query Results (sample):
    {json.dumps(chart_data, indent=2, default=json_serial)}
    """ if chart_data else ""

    prompt = f"""
    You are a business insight agent that analyzes data query results and provides valuable insights.
    
    Your job is to examine the data provided and generate business insights that would be valuable 
    to stakeholders. Focus on identifying patterns, trends, anomalies, and actionable recommendations.
    
    Dataset columns:
    {json.dumps(list(profile.columns.keys()), indent=2)}
    
    {sql_section}
    {results_section}

    IMPORTANT: If 'Query Results (sample)' is empty or not provided, it means the query did not return any data. 
    In this case, your primary insight must be to clearly state that no data was found matching the criteria of the user's request. 
    You can then briefly suggest potential reasons (e.g., no activity on that specific day, filter criteria too narrow) or next steps if appropriate.
    Do not attempt to generate other business insights if no data is available.

    If data IS available, make your analysis practical and business-focused. Avoid technical jargon and focus on 
    insights that would help business decision-makers.
    
    Your output must include:
    1. A title: A concise heading that captures the essence of your insights (or states no data found).
    2. An analysis: A detailed examination of the data with clear, actionable insights (or the explanation for no data).
    
    The user's original question was: {ctx.deps.user_prompt}
    """

    return prompt

@business_insights_agent.output_validator
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