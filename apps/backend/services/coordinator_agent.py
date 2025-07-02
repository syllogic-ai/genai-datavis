from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry

from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.utils.files import extract_schema_sample
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.chat import append_chat_message, get_message_history
from apps.backend.services.sql_agent import sql_agent, SQLOutput, ConfidenceInput
from apps.backend.services.viz_agent import viz_agent

class AnalysisOutput(BaseModel):
    """Output from the coordinator agent."""
    answer: str = Field(description="Answer to the user's question")
    widget_id: Optional[str] = Field(default=None, description="ID of the widget if one was created")
    confidence_score: Optional[int] = Field(default=None, description="Confidence score from 0 to 100 if SQL was generated")
    confidence_reasoning: Optional[str] = Field(default=None, description="Explanation of the confidence score if calculated")
    follow_up_questions: Optional[List[str]] = Field(default=None, description="Follow-up questions to improve confidence if score is low")


# Declare the coordinator agent
coordinator_agent = Agent(
    "openai:gpt-4.1",
    deps_type=Deps,
    output_type=AnalysisOutput,
)

@coordinator_agent.system_prompt
async def coordinator_system_prompt(ctx: RunContext[Deps]) -> str:
    """Generate system prompt for intent analysis."""

    # Get the dataset profile using extract_schema_sample
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # Extract column names for context
    columns = list(profile.columns.keys())
    column_types = {name: dtype for name, dtype in profile.columns.items()}
    
    prompt = f"""
    You are an coordinator for a data platform. Given a series of user messages, your job in each message is to:
    
    1. Understand user requests
    2. Delegate tasks to specialized agents
    3. Combine their outputs into a cohesive response
    
    The available columns in the dataset are:
    {json.dumps(columns, indent=2)}
    
    The column types are:
    {json.dumps(column_types, indent=2)}
    
    You have two tools available:
    1. `generate_sql`: Generates SQL queries to extract data from the dataset. You should only run this tool if the user is asking for a new data extract that is not based on the last interaction.
    2. `visualize_chart`: Visualizing the generated SQL query using a variety of visualization tools.
       
    CONFIDENCE SCORING HANDLING:
    - The SQL agent will always return a confidence score (0-100) indicating how well the generated query matches the user's request
    - If the confidence score is below 50, DO NOT proceed with visualization
    - Instead, inform the user that you don't have enough information to produce the requested query
    - Focus on clarifying ambiguous terms, specifying time periods, identifying specific columns, or defining business logic
    
    Your workflow should follow these rules:
    - Always provide a clear, direct answer to the user's question
    - If the user is asking for specific data, visualizations, or statistics, run the generate_sql tool first, if new data points are needed
    - Check the confidence score from the SQL generation
    - If confidence score >= 50: proceed with visualize_chart tool to produce a visualization
    - When a user only asks for a formatting update in an already generated chart (f.i. change the color or the font) you ALWAYS run the visualize_chart tool, without generating SQL again

    Context:
    - Is this a follow-up question: {ctx.deps.is_follow_up}
    - User prompt: {ctx.deps.user_prompt}
    - Message history: {json.dumps(ctx.deps.message_history, indent=2)}
    """

    return prompt
    
@coordinator_agent.tool
async def generate_sql(ctx: RunContext[Deps]) -> SQLOutput:
    """Generate and execute SQL to retrieve data."""
    start_time = time.time()
    
    try:
        result = await sql_agent.run(
            ctx.deps.user_prompt,
            deps=ctx.deps,
        )
        
        end_time = time.time()
        
        # Store the widget_id for potential visualization
        created_widget_id = result.output.widget_id
        
        # Always calculate confidence score for the generated SQL
        profile = extract_schema_sample(ctx.deps.file_id)
        confidence_input = ConfidenceInput(
            user_prompt=ctx.deps.user_prompt,
            generated_sql=result.output.sql,
            dataset_schema=profile.columns
        )
        
        # Calculate confidence using a direct function call
        confidence_score, confidence_reasoning = await calculate_confidence_direct(
            ctx.deps, confidence_input
        )
        
        # Generate follow-up questions if confidence is low
        follow_up_questions = []
        if confidence_score < 50:
            follow_up_questions = [
                "What time period are you interested in analyzing?",
                "Which specific columns from the dataset would you like to include?",
                "Are there any specific conditions or filters you'd like to apply?"
            ]
        
        # Update the SQL output with confidence information
        result.output.confidence_score = confidence_score
        result.output.confidence_reasoning = confidence_reasoning
        result.output.follow_up_questions = follow_up_questions
        
        # Log confidence information
        logfire.info("SQL generation completed with confidence score", 
                     confidence_score=confidence_score,
                     user_prompt=ctx.deps.user_prompt,
                     chat_id=ctx.deps.chat_id, 
                     request_id=ctx.deps.request_id)
 
        _log_llm(result.usage(), sql_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        logfire.error("SQL generation failed", 
                     error=str(e), 
                     chat_id=ctx.deps.chat_id, 
                     request_id=ctx.deps.request_id)
        raise

class ConfidenceOutput(BaseModel):
    """Output from confidence scoring."""
    confidence_score: int = Field(description="Confidence score from 0 to 100")
    reasoning: str = Field(description="Explanation of the confidence score")
    potential_issues: List[str] = Field(description="List of potential issues or concerns")
    follow_up_questions: List[str] = Field(description="List of follow-up questions to improve confidence")

async def calculate_confidence_direct(deps: Deps, confidence_input: ConfidenceInput) -> tuple[int, str]:
    """Direct function to calculate confidence score using heuristics."""
    
    # Get the dataset profile to provide context
    profile = extract_schema_sample(deps.file_id)
    
    # Initialize confidence score
    confidence_score = 50  # Start with neutral score
    reasoning_parts = []
    
    # Check 1: Semantic alignment - how specific is the user request?
    user_prompt_lower = confidence_input.user_prompt.lower()
    specific_terms = ['sales', 'revenue', 'profit', 'month', 'year', 'total', 'average', 'count', 'sum']
    specific_terms_found = sum(1 for term in specific_terms if term in user_prompt_lower)
    
    if specific_terms_found >= 3:
        confidence_score += 20
        reasoning_parts.append("User request contains specific business terms")
    elif specific_terms_found >= 1:
        confidence_score += 10
        reasoning_parts.append("User request contains some specific terms")
    else:
        confidence_score -= 15
        reasoning_parts.append("User request is vague and lacks specific terms")
    
    # Check 2: SQL complexity and appropriateness
    sql_lower = confidence_input.generated_sql.lower()
    
    # Check if SQL contains appropriate operations
    if 'select' in sql_lower and 'from' in sql_lower:
        confidence_score += 10
        reasoning_parts.append("SQL contains basic SELECT structure")
    else:
        confidence_score -= 20
        reasoning_parts.append("SQL lacks basic SELECT structure")
    
    # Check for appropriate aggregations
    if any(op in sql_lower for op in ['sum(', 'avg(', 'count(', 'max(', 'min(']):
        confidence_score += 5
        reasoning_parts.append("SQL includes appropriate aggregations")
    
    # Check for GROUP BY when aggregations are present
    if any(op in sql_lower for op in ['sum(', 'avg(', 'count(']) and 'group by' in sql_lower:
        confidence_score += 5
        reasoning_parts.append("SQL properly groups aggregated data")
    elif any(op in sql_lower for op in ['sum(', 'avg(', 'count(']) and 'group by' not in sql_lower:
        confidence_score -= 10
        reasoning_parts.append("SQL has aggregations but no GROUP BY")
    
    # Check 3: Column relevance
    available_columns = set(profile.columns.keys())
    sql_columns = set()
    
    # Extract column names from SQL (simple heuristic)
    import re
    column_matches = re.findall(r'"([^"]+)"', confidence_input.generated_sql)
    sql_columns.update(column_matches)
    
    # Also check for unquoted column names
    for col in available_columns:
        if col.lower() in sql_lower and col not in sql_columns:
            sql_columns.add(col)
    
    if sql_columns:
        relevance_score = len(sql_columns.intersection(available_columns)) / len(sql_columns) * 20
        confidence_score += relevance_score
        reasoning_parts.append(f"SQL uses relevant columns ({len(sql_columns.intersection(available_columns))}/{len(sql_columns)})")
    else:
        confidence_score -= 10
        reasoning_parts.append("SQL doesn't reference specific columns")
    
    # Check 4: Query specificity vs user request
    if 'limit' in sql_lower and 'limit 10' in sql_lower:
        if 'some' in user_prompt_lower or 'few' in user_prompt_lower or 'sample' in user_prompt_lower:
            confidence_score += 5
            reasoning_parts.append("SQL appropriately limits results for sample request")
        else:
            confidence_score -= 5
            reasoning_parts.append("SQL limits results but user didn't ask for limited data")
    
    # Check 5: Time-based queries
    if any(time_term in user_prompt_lower for time_term in ['month', 'year', 'date', 'time', 'period']):
        if any(time_func in sql_lower for time_func in ['extract', 'date_trunc', 'cast', 'strptime']):
            confidence_score += 10
            reasoning_parts.append("SQL properly handles time-based requirements")
        else:
            confidence_score -= 10
            reasoning_parts.append("User asked for time-based data but SQL doesn't handle dates")
    
    # Ensure confidence score is within bounds
    confidence_score = max(0, min(100, confidence_score))
    
    # Create reasoning string
    reasoning = ". ".join(reasoning_parts) if reasoning_parts else "Basic confidence assessment"
    
    logfire.info("Confidence score calculated using heuristics", 
                 confidence_score=confidence_score,
                 user_prompt=confidence_input.user_prompt,
                 chat_id=deps.chat_id, 
                 request_id=deps.request_id)
    
    return confidence_score, reasoning


@coordinator_agent.tool
async def visualize_chart(ctx: RunContext[Deps], widget_id: str) -> dict:
    """
    Run the viz_agent with the provided visualization input and current data context.
    This tool allows the intent_analysis_agent to delegate chart spec generation to the viz_agent.
    """
    start_time = time.time()
    
    logfire.info("Visualizing widget: ", widget_id=widget_id)
    
    newDeps = Deps(
        chat_id=ctx.deps.chat_id,
        request_id=ctx.deps.request_id,
        file_id=ctx.deps.file_id,
        user_prompt=ctx.deps.user_prompt,
        widget_id=widget_id,  # Pass the widget_id to viz_agent
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
            "content": widget_id,
        }
        
        await append_chat_message(ctx.deps.chat_id, message=message)
        
        end_time = time.time()
        _log_llm(result.usage(), viz_agent, end_time - start_time, ctx.deps.chat_id, ctx.deps.request_id)  
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        raise


@coordinator_agent.output_validator
async def validate_coordinator_output(
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
    
    # If we have a low confidence score, ensure we have follow-up questions
    if output.confidence_score is not None and output.confidence_score < 50:
        if not output.follow_up_questions or len(output.follow_up_questions) < 2:
            logfire.warn("Low confidence without follow-up questions", 
                        confidence_score=output.confidence_score,
                        chat_id=ctx.deps.chat_id, 
                        request_id=ctx.deps.request_id)
            raise ModelRetry("Please include follow-up questions when confidence score is low.")
    
    return output 