from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry

from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.utils.files import extract_schema_sample
from apps.backend.services.intent_analysis_agent import intent_analysis_agent, AnalysisOutput

class OrchestratorOutput(BaseModel):
    """Output from the orchestrator agent."""
    answer: str = Field(description="Final answer to the user's question")
    chart_id: Optional[str] = Field(default=None, description="ID of the chart if one was created")
    insights: Dict[str, str] = {"test": "test"}
    # insights: Optional[Dict[str, str]] = Field(default=None, description="Business insights if generated")

# Declare the orchestrator agent
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
    
    # Check if this is a dashboard-centric request
    is_dashboard_request = ctx.deps.dashboard_id is not None
    dashboard_context = ""
    
    if is_dashboard_request:
        dashboard_context = f"""
    
    DASHBOARD CONTEXT:
    - Dashboard ID: {ctx.deps.dashboard_id}
    - Context Widget IDs: {ctx.deps.context_widget_ids or "None"}
    - Target Widget Type: {ctx.deps.target_widget_type or "Any"}
    
    This is a dashboard widget request. You should focus on creating or editing dashboard widgets.
    When creating widgets, ensure they are properly configured with:
    - Appropriate chart type based on user request
    - Proper data binding using the available columns
    - Clear titles and labels
    - Meaningful SQL queries when needed
    """
    
    prompt = f"""
    You are the orchestrator agent for a data analytics platform. Your job is to:
    
    1. Understand user requests
    2. Delegate tasks to specialized agents
    3. Combine their outputs into a cohesive response
    
    The dataset has these columns: {json.dumps(columns, indent=2)}
    
    You have access to an intent analysis agent that can:
    - Determine if a query needs SQL generation
    - Generate data insights when needed
    - Create appropriate visualizations and widgets

    Always call the intent agent through the analyze_intent tool!
    If a chart formatting is asked (e.g. change the color of a chart component), the intent agent should regenerate the chart and update it accordingly.
    {dashboard_context}
    Context:
    - Last chart ID (if any): {ctx.deps.last_chart_id or "None"}
    - Is this a follow-up question: {ctx.deps.is_follow_up}
    - User prompt: {ctx.deps.user_prompt}
    - Message history: {ctx.deps.message_history} 
    Your job is to coordinate the workflow and ensure the user gets a complete answer.
    """ # #{json.dumps(ctx.deps.message_history, indent=2)}
  
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
