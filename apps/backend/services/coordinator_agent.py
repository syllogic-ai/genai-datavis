from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import asyncio
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry, ToolOutput

from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.utils.files import extract_schema_sample
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.chat import append_chat_message, get_message_history
from apps.backend.services.sql_agent import sql_agent, SQLOutput, ConfidenceInput
from apps.backend.services.viz_agent import viz_agent

# Rate limiting helper
async def with_rate_limit_retry(func, max_retries=3, base_delay=2.0):
    """Execute function with exponential backoff for rate limiting"""
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except Exception as e:
            if "rate_limit" in str(e).lower() or "429" in str(e):
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    logfire.warn(f"Rate limit hit, retrying in {delay}s (attempt {attempt + 1}/{max_retries + 1})")
                    await asyncio.sleep(delay)
                    continue
                else:
                    logfire.error(f"Max retries reached for rate limiting")
                    raise
            else:
                # If it's not a rate limit error, don't retry
                raise

class AnalysisOutput(BaseModel):
    """Output from the coordinator agent."""
    answer: str = Field(description="Answer to the user's question")
    widget_id: Optional[str] = Field(default=None, description="ID of the widget if one was created (deprecated, use widget_ids)")
    widget_ids: Optional[List[str]] = Field(default=None, description="IDs of widgets created (supports multiple widgets)")
    confidence_score: Optional[int] = Field(default=None, description="Confidence score from 0 to 100 if SQL was generated")
    confidence_reasoning: Optional[str] = Field(default=None, description="Explanation of the confidence score if calculated")
    follow_up_questions: Optional[List[str]] = Field(default=None, description="Follow-up questions to improve confidence if score is low")


# Declare the coordinator agent
coordinator_agent = Agent(
    "openai:gpt-4o-mini",
    # 'openai:o3',
    deps_type=Deps,
    output_type=AnalysisOutput,
)

@coordinator_agent.system_prompt
async def coordinator_system_prompt(ctx: RunContext[Deps]) -> str:

    logfire.info(f"Coordinator agent context: {ctx.deps}")

    """Generate system prompt for coordination agent."""

    # Get the dataset profile using extract_schema_sample
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # Extract column names for context
    columns = list(profile.columns.keys())
    column_types = {name: dtype for name, dtype in profile.columns.items()}
    
    prompt = f"""
    You are an coordinator for a data platform. Given a series of user messages, your job in each message is to:
    
    1. Understand user requests
    2. Delegate tasks to specialized agent tools
    3. Combine their outputs into a cohesive response
    
    The available columns in the dataset are:
    {json.dumps(columns, indent=2)}
    
    The column types are:
    {json.dumps(column_types, indent=2)}
    
    You have the following tools available:
    1. `get_widgets_types`: Get the types of the widgets in the user context, so that the agent can later decide whether to update them or not
    2. `create_specific_widget`: Create a specific, targeted widget with a clear purpose and distinct configuration.
    3. `update_widget_formatting`: Update an existing widget with a new formatting request (f.i. color, size, width, labels, etc.).
    4. `update_widget_data`: Update an existing widget with new data (f.i. axis sorting, new columns, new filters, new time period, etc.).

    What you need to do if to strictly follow the below steps:
    1. Get the types of the widgets in the user context
    2. For each widget, check if a formatting update is needed, or a data update is needed.
    3. If a formatting update is needed, run the update_widget_formatting tool.
    4. If a data update is needed, run the update_widget_data tool.
    5. If no update is needed, return the widget_id and don't run any other tool.
    6. If the user asks for a new widget, run the create_specific_widget tool.
       
    # CONFIDENCE SCORING HANDLING:
    # - The SQL agent will always return a confidence score (0-100) indicating how well the generated query matches the user's request
    # - If the confidence score is below 90, DO NOT proceed with visualization, nor return any dataset.
    # - Instead, inform the user that you don't have enough information to produce the requested query
    # - Focus on clarifying ambiguous terms, specifying time periods, identifying specific columns, or defining business logic
    
    # Your workflow should follow these rules:
    # - Always provide a clear, direct answer to the user's question
    # - If the user is asking for specific data, visualizations, or statistics, run the generate_sql tool first, if new data points are needed
    # - Check the confidence score from the SQL generation
    # - If confidence score >= 50: proceed with visualize_chart tool to produce a visualization
    # - When a user only asks for a formatting update in an already generated chart (f.i. change the color or the font) you ALWAYS run the visualize_chart tool, without generating SQL again
    
    MULTI-WIDGET GENERATION:
    When the user requests multiple visualizations or a comprehensive analysis, create multiple distinct widgets by:
    
    1. ANALYZE the user's request and identify what specific insights they need
    2. PLAN different widgets that each serve a unique purpose:
       * Different chart types for different perspectives (bar for comparisons, line for trends, pie for distributions)
       * Different data focuses (totals vs. averages vs. counts vs. percentages)
       * Different time periods or groupings
       * Different metrics or dimensions
    
    3. EXECUTE by calling `create_specific_widget` ONE AT A TIME sequentially (not all at once) with:
       * Distinct widget_description for each widget
       * Different chart_type (bar, line, pie, table, kpi)
       * Unique focus_area for each widget
    
    4. COLLECT all widget IDs and return them in widget_ids (not widget_id)
    
    WIDGET UPDATES:
    When a user only asks for a formatting update in an already generated chart (f.i. change the color or the font) you ALWAYS run the update_widget_formatting tool, without generating SQL again
    When a user only asks for a data related update in an already generated chart (f.i. change the data, add a new column, change the time period, etc.) you ALWAYS run the update_widget_data tool, without generating SQL again

    IMPORTANT FOR RATE LIMITING: 
    - Create widgets ONE BY ONE, not all at once
    - Wait for each widget to complete before creating the next
    - No artificial limit on widget count - create as many as the user needs
    
    Examples of good multi-widget planning:
    - "Sales overview" → Bar chart of sales by region + Line chart of sales trends + KPI of total revenue
    - "Compare products" → Bar chart comparing revenue + Pie chart showing market share + Table with detailed metrics
    - "Performance dashboard" → KPI cards for key metrics + Trend lines + Comparison charts
    
    IMPORTANT: Each widget must have a DISTINCT purpose and show DIFFERENT data or perspectives.

    Context:
    - Is this a follow-up question: {ctx.deps.is_follow_up}
    - User prompt: {ctx.deps.user_prompt}
    - Widget in the current context: {ctx.deps.widget_id if ctx.deps.widget_id else "None"}
    - Message history: {json.dumps(ctx.deps.message_history, indent=2)}
    """

    return prompt
    
@coordinator_agent.tool
async def get_widgets_types(ctx: RunContext[Deps]) -> List[str]:
    """Tool to get the types of the widgets in the user context, so that the agent can later decide whether to update them or not
    """
    widget_types = {}
    if ctx.deps.contextWidgetIds:
        widgets_list = ctx.deps.contextWidgetIds
    else:
        return {}

    for widget_id in widgets_list:        
        widget_type = ctx.deps.supabase.table("widgets").select("config").eq("id", widget_id).execute()
        widget_type = widget_type.data[0]["config"]["chartType"]
        widget_types[widget_id] = widget_type
    
    logfire.info(f"Widget types: {widget_types}")

    return widget_types


# @coordinator_agent.tool
async def generate_sql(ctx: Deps) -> SQLOutput:
    """Generate and execute SQL to retrieve data."""
    start_time = time.time()
    
    logfire.info(f"SQL Agent Dependencies: {ctx}")

    try:
        result = await sql_agent.run(
            ctx.user_prompt,
            deps=ctx,
        )
        
        end_time = time.time()
        
        # Store the widget_id for potential visualization
        created_widget_id = result.output.widget_id
        
        # Always calculate confidence score for the generated SQL
        profile = extract_schema_sample(ctx.file_id)
        confidence_input = ConfidenceInput(
            user_prompt=ctx.user_prompt,
            generated_sql=result.output.sql,
            dataset_schema=profile.columns
        )
        
        # Calculate confidence using a direct function call
        confidence_score, confidence_reasoning = await calculate_confidence_direct(
            ctx, confidence_input
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
                     user_prompt=ctx.user_prompt,
                     chat_id=ctx.chat_id, 
                     request_id=ctx.request_id)
 
        await _log_llm(result.usage(), sql_agent, end_time - start_time, ctx.chat_id, ctx.request_id)  
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        logfire.error("SQL generation failed", 
                     error=str(e), 
                     chat_id=ctx.chat_id, 
                     request_id=ctx.request_id)
        raise

class ConfidenceOutput(BaseModel):
    """Output from confidence scoring."""
    confidence_score: int = Field(description="Confidence score from 0 to 100")
    reasoning: str = Field(description="Explanation of the confidence score")
    potential_issues: Optional[List[str]] = Field(default=None, description="List of potential issues or concerns")
    follow_up_questions: Optional[List[str]] = Field(default=None, description="List of follow-up questions to improve confidence")

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


# @coordinator_agent.tool
async def visualize_chart(ctx: Deps, widget_id: str) -> dict:
    """
    Run the viz_agent with the provided visualization input and current data context.
    This tool allows the intent_analysis_agent to delegate chart spec generation to the viz_agent.
    """
    start_time = time.time()
    
    logfire.info("Visualizing widget: ", widget_id=widget_id)

    logfire.info(f"Visualize chart dependencies: {ctx}")
    
    newDeps = Deps(
        chat_id=ctx.chat_id,
        request_id=ctx.request_id,
        file_id=ctx.file_id,
        user_prompt=ctx.user_prompt,
        widget_id=widget_id,  # Pass the widget_id to viz_agent
        is_follow_up=ctx.is_follow_up,
        duck=ctx.duck,
        supabase=ctx.supabase,
        message_history=ctx.message_history
    )

    try:
        result = await viz_agent.run(
            ctx.user_prompt,
            deps=newDeps,
        )
        
        
        end_time = time.time()
        await _log_llm(result.usage(), viz_agent, end_time - start_time, ctx.chat_id, ctx.request_id)  
        
        return result.output
    
    except Exception as e:
        end_time = time.time()
        raise

@coordinator_agent.tool
async def create_specific_widget(ctx: RunContext[Deps], widget_description: str, chart_type: str, focus_area: str) -> str:
    """
    Create a specific widget with a targeted purpose.
    
    Args:
        widget_description: Detailed description of what this widget should show
        chart_type: Type of chart (bar, line, pie, table, kpi)
        focus_area: What specific aspect of the data this widget focuses on
    
    Returns:
        Widget ID of the created widget
    """
    
    # Create a very specific prompt for this widget
    focused_prompt = f"Create a {chart_type} chart that shows {widget_description}. Focus specifically on {focus_area}. Make sure this visualization is distinct and provides unique insights."
    
    logfire.info(f"Creating specific widget: {chart_type} - {widget_description}")
    logfire.info(f"Dependencies: {ctx.deps}")
    
    # Add a small delay to prevent API rate limiting
    await asyncio.sleep(1.0)  # 1 second delay between widget creations
    
    # try:
    # Update the deps with the focused prompt
    focused_deps = Deps(
        chat_id=ctx.deps.chat_id,
        request_id=ctx.deps.request_id,
        file_id=ctx.deps.file_id,
        user_prompt=focused_prompt,
        widget_id=None,
        is_follow_up=False,  # Treat each widget creation as independent
        duck=ctx.deps.duck,
        supabase=ctx.deps.supabase,
        message_history=ctx.deps.message_history
    )
    
    # Generate SQL for this specific visualization with rate limiting
    # sql_result = await with_rate_limit_retry(
    #     lambda: sql_agent.run(focused_prompt, deps=focused_deps)
    # )


    logfire.info(f"Generating SQL for widget: {widget_description},  focus_deps={focused_deps}")
    
    sql_result = await generate_sql(ctx.deps)

    logfire.info("SQL RESULTS to coord agent", sql_result=sql_result)
    if sql_result.confidence_score < 90:
        logfire.info(f"Confidence score is too low, skipping widget creation: {sql_result.confidence_score}")
        return None

    focused_deps.widget_id = sql_result.widget_id

    logfire.info(f"SQL generated for widget: {widget_description}")

    
    if focused_deps.widget_id:
        # Now create the visualization with rate limiting
        viz_result = await with_rate_limit_retry(
            lambda: visualize_chart(focused_deps, sql_result.widget_id)
        )
        
        logfire.info(f"Successfully created {chart_type} widget", 
                    widget_id=sql_result.widget_id,
                    description=widget_description,
                    confidence_score=sql_result.confidence_score,
                    confidence_reasoning=sql_result.confidence_reasoning,
                    follow_up_questions=sql_result.follow_up_questions
                    )
        
        return sql_result.widget_id
    else:
        raise Exception("SQL generation did not create a widget")
    
    # except Exception as e:
    #     logfire.error(f"Failed to create {chart_type} widget: {widget_description}", error=str(e))
    #     raise

@coordinator_agent.tool
async def update_widget_formatting(ctx: RunContext[Deps], widget_id: str, widget_description: str, chart_type: str, focus_area: str) -> str:
    """
    Update an existing widget with a new configuration.
    
    Args:
        widget_id: ID of the widget to update
        widget_description: Detailed description of what this widget update
        chart_type: Type of chart (bar, line, pie, table, kpi)
        focus_area: What specific aspect of the data this widget focuses on
    
    Returns:
        Widget ID of the updated widget
    """
    
    # Create a very specific prompt for this widget
    if widget_id not in ctx.deps.contextWidgetIds:
        logfire.warn(f"Widget {widget_id} not found in user context. Skipping formatting")
        return widget_id
    
    focused_prompt = f"Update the widget {widget_id} with the following configuration: {widget_description}. Focus specifically on {focus_area}. Make sure this visualization is distinct and provides unique insights."
    
    logfire.info(f"Updating widget: {widget_id} - {widget_description}")
    
    # Add a small delay to prevent API rate limiting
    await asyncio.sleep(1.0)  # 1 second delay between widget creations
    
    try:
        # Update the deps with the focused prompt
        focused_deps = Deps(
            chat_id=ctx.deps.chat_id,
            request_id=ctx.deps.request_id,
            file_id=ctx.deps.file_id,
            user_prompt=focused_prompt,
            widget_id=widget_id,
            is_follow_up=False,  # Treat each widget creation as independent
            duck=ctx.deps.duck,
            supabase=ctx.deps.supabase,
            message_history=ctx.deps.message_history
        )
        
        # Update the visualization with rate limiting
        viz_result = await with_rate_limit_retry(
            lambda: visualize_chart(focused_deps, widget_id)
        )
            
        logfire.info(f"Successfully updated widget", 
                    widget_id=widget_id,
                    description=widget_description)
            
        return widget_id
    
    except Exception as e:
        logfire.error(f"Failed to update widget {widget_id}", error=str(e))
        raise
    
@coordinator_agent.tool
async def update_widget_data(ctx: RunContext[Deps], widget_description: str, focus_area: str) -> str:
    """
    Update an existing widget with new data.
    Args:
        widget_description: Detailed description of what this widget update
        focus_area: What specific aspect of the data this widget focuses on
    Returns:
        Widget ID of the updated widget
    """
    
    # Create a very specific prompt for this widget
    if widget_id not in ctx.deps.contextWidgetIds:
        logfire.warn(f"Widget {widget_id} not found in user context. Skipping data update")
        return widget_id

    focused_prompt = f"Update the widget {widget_id} with the following configuration: {widget_description}. Focus specifically on {focus_area}. Make sure this visualization is distinct and provides unique insights."
    
    logfire.info(f"Updating widget: {widget_id} - {widget_description}")
    logfire.info(f"Dependencies: {ctx.deps}")
    
    # Add a small delay to prevent API rate limiting
    await asyncio.sleep(1.0)  # 1 second delay between widget creations
    
    # try:
    # Update the deps with the focused prompt
    focused_deps = Deps(
        chat_id=ctx.deps.chat_id,
        request_id=ctx.deps.request_id,
        file_id=ctx.deps.file_id,
        user_prompt=focused_prompt,
        widget_id=widget_id,
        is_follow_up=False,  # Treat each widget creation as independent
        duck=ctx.deps.duck,
        supabase=ctx.deps.supabase,
        message_history=ctx.deps.message_history
    )
    
    # Generate SQL for this specific visualization with rate limiting
    # sql_result = await with_rate_limit_retry(
    #     lambda: sql_agent.run(focused_prompt, deps=focused_deps)
    # )


    logfire.info(f"Generating SQL for widget: {widget_description},  focus_deps={focused_deps}")
    
    sql_result = await generate_sql(focused_deps)
    
    return widget_id
    

@coordinator_agent.output_validator
async def validate_coordinator_output(
    ctx: RunContext[Deps],
    output: AnalysisOutput
) -> AnalysisOutput:
    """Validate the intent analysis output."""
    
    # Ensure backward compatibility - if widget_ids is set but widget_id is not, set widget_id to first widget
    if output.widget_ids and not output.widget_id:
        output.widget_id = output.widget_ids[0]
    # If widget_id is set but widget_ids is not, create widget_ids list
    elif output.widget_id and not output.widget_ids:
        output.widget_ids = [output.widget_id]
    
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