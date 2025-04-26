"""
Flexible agent system for dynamic tool selection and execution.
Uses Pydantic AI to create a system that selects appropriate tools based on user queries.
"""

from typing import Dict, List, Any, Optional, Union, TypeVar, Generic
import uuid
import os
import time
from enum import Enum
import polars as pl
import pandas as pd
from pydantic import BaseModel, Field
from pydantic_ai import Agent, ModelRetry, RunContext, Tool
import inspect

from ..core.models import ChartSpec, Insight, LLMUsageRow
from ..core.config import supabase

# Set the default model
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Type for agent dependencies
class AgentDependencies(BaseModel):
    """Dependencies passed to the agent."""
    data: Any  # Dataframe (polars or pandas)
    user_query: str
    chat_id: str
    request_id: str
    user_id: Optional[str] = None

# Define tool output types
class ToolOutput(BaseModel):
    """Base class for tool outputs."""
    tool_name: str

class InsightsOutput(ToolOutput):
    """Output from the insights tool."""
    tool_name: str = "generate_insights"
    points: List[str]
    summary: str

class ChartOutput(ToolOutput):
    """Output from the chart generation tool."""
    tool_name: str = "build_chart_spec"
    chart_spec: ChartSpec

class SQLOutput(ToolOutput):
    """Output from SQL execution."""
    tool_name: str = "execute_sql"
    results: List[Dict[str, Any]]
    query: str

class CalculationOutput(ToolOutput):
    """Output from calculation operations."""
    tool_name: str = "calculate"
    result: Any
    explanation: str

# Define the agent response model
class ToolExecutionPlan(BaseModel):
    """Complete plan for executing tools."""
    primary_tool: str = Field(description="Primary tool to use first")
    additional_tools: List[str] = Field(default_factory=list, description="Additional tools needed to fulfill the request")
    reasoning: str = Field(description="Explanation for the plan")
    requires_visualization: bool = Field(default=False, description="Whether the request requires a visualization")
    requires_insights: bool = Field(default=False, description="Whether the request requires data insights")
    requires_calculation: bool = Field(default=False, description="Whether the request requires calculations")

class AnalysisResult(BaseModel):
    """Final result of the analysis."""
    insights: Optional[InsightsOutput] = None
    visualization: Optional[ChartOutput] = None
    sql_results: Optional[SQLOutput] = None
    calculations: Optional[CalculationOutput] = None
    answer: str = Field(description="Final answer combining all tool outputs")

# Create the planning agent with decorator-based tools
planning_agent = Agent(
    OPENAI_MODEL,
    output_type=ToolExecutionPlan,
    deps_type=AgentDependencies,
    instrument=True,
    retry=ModelRetry(max_retries=3, delay=0.5),
)

@planning_agent.system_prompt
async def planning_system_prompt() -> str:
    return """
    You are an advanced data analysis assistant that helps users analyze data.
    Your task is to create an execution plan by determining which tools are needed to fulfill the user's request.
    
    Available tools:
    1. generate_insights - Analyzes data and generates natural language insights
    2. choose_chart_type - Determines the appropriate chart type for visualization
    3. build_chart_spec - Creates a complete chart specification for visualization
    4. validate_sql - Validates SQL queries for safety and correctness
    5. execute_sql - Executes SQL queries against the data
    6. calculate - Performs calculations on the data
    
    Create a plan that includes:
    - The primary tool to use first
    - Any additional tools needed to complete the request
    - Whether visualization, insights, or calculations are needed
    """

# Create the synthesis agent
synthesis_agent = Agent(
    OPENAI_MODEL,
    output_type=str,
    deps_type=Dict[str, Any],  # Dictionary containing query and tool outputs
    instrument=True,
    retry=ModelRetry(max_retries=3, delay=0.5),
)

@synthesis_agent.system_prompt
async def synthesis_system_prompt() -> str:
    return """
    You are a data analysis expert. Your task is to create a comprehensive answer to the user's query
    based on the outputs from various data analysis tools.
    
    Format your response in a clear, concise manner with:
    - Direct answers to the user's question
    - Supporting evidence from the tool results
    - Visual cues (bullet points, headings) for readability
    
    Do NOT mention the names of the tools used in your response.
    Focus on providing valuable insights that directly address the user's query.
    """

# Tool implementations with decorators
@planning_agent.tool
async def generate_insights(ctx: RunContext[AgentDependencies]) -> InsightsOutput:
    """
    Analyzes data and generates valuable insights in natural language.
    
    Returns:
        InsightsOutput containing summary and key points from the data
    """
    from ..services.insights import generate_insights as insights_service
    
    data = ctx.deps.data
    user_query = ctx.deps.user_query
    chat_id = ctx.deps.chat_id
    request_id = ctx.deps.request_id
    user_id = ctx.deps.user_id
    
    result = await insights_service(data, user_query, chat_id, request_id, user_id)
    return InsightsOutput(
        points=result.points,
        summary=result.summary
    )

@planning_agent.tool
async def choose_chart_type(ctx: RunContext[AgentDependencies]) -> str:
    """
    Determines the most appropriate chart type for visualizing data based on the user query.
    
    Returns:
        String containing the recommended chart type
    """
    from ..services.charts import choose_chart_type as chart_type_service
    
    request_id = ctx.deps.request_id
    chart_request = {
        "query": ctx.deps.user_query,
        "file_id": request_id
    }
    
    result = await chart_type_service(chart_request, request_id)
    return result

@planning_agent.tool
async def build_chart_spec(ctx: RunContext[AgentDependencies]) -> ChartOutput:
    """
    Creates a complete chart specification for visualization.
    
    Requires that choose_chart_type has been called first.
    
    Returns:
        ChartOutput containing the complete chart specification
    """
    from ..services.charts import build_chart_spec as chart_spec_service
    from ..services.charts import choose_chart_type as chart_type_service
    
    data = ctx.deps.data
    user_query = ctx.deps.user_query
    chat_id = ctx.deps.chat_id
    request_id = ctx.deps.request_id
    user_id = ctx.deps.user_id
    
    # First get chart type if not already determined
    chart_request = {
        "query": user_query,
        "file_id": request_id
    }
    chart_choice = await chart_type_service(chart_request, request_id)
    
    # Then build chart specification
    chart_spec = await chart_spec_service(chart_choice, data, user_query, chat_id, request_id, user_id)
    return ChartOutput(chart_spec=chart_spec)

@planning_agent.tool
async def validate_sql(ctx: RunContext[AgentDependencies]) -> bool:
    """
    Validates SQL queries for safety and correctness.
    
    Returns:
        Boolean indicating whether the SQL query is valid
    """
    from ..services.sql import validate_sql as validate_sql_service
    
    # Extract SQL query from user_query (simplified)
    user_query = ctx.deps.user_query
    sql_query = user_query
    if "SELECT" in user_query.upper():
        sql_query = user_query[user_query.upper().find("SELECT"):]
    
    chat_id = ctx.deps.chat_id
    request_id = ctx.deps.request_id
    
    validation_result = await validate_sql_service(sql_query, chat_id, request_id)
    return validation_result.is_valid

@planning_agent.tool
async def execute_sql(ctx: RunContext[AgentDependencies]) -> SQLOutput:
    """
    Executes SQL queries against the data.
    
    Returns:
        SQLOutput containing the query results
    """
    from ..services.sql import execute_sql as execute_sql_service
    from ..services.sql import validate_sql as validate_sql_service
    
    data = ctx.deps.data
    user_query = ctx.deps.user_query
    chat_id = ctx.deps.chat_id
    request_id = ctx.deps.request_id
    
    # Extract SQL query from user_query (simplified)
    sql_query = user_query
    if "SELECT" in user_query.upper():
        sql_query = user_query[user_query.upper().find("SELECT"):]
    
    # First validate the query
    validation_result = await validate_sql_service(sql_query, chat_id, request_id)
    
    if not validation_result.is_valid:
        raise ValueError(f"Invalid SQL query: {validation_result.message}")
    
    # Execute the SQL query
    sql_results = await execute_sql_service(sql_query, data, chat_id, request_id)
    
    return SQLOutput(
        results=sql_results.to_dict(orient='records'),
        query=sql_query
    )

@planning_agent.tool
async def calculate(ctx: RunContext[AgentDependencies]) -> CalculationOutput:
    """
    Performs calculations on the data.
    
    Returns:
        CalculationOutput containing the result and explanation
    """
    # This is a placeholder implementation - in a real system, you would implement calculation logic
    data = ctx.deps.data
    user_query = ctx.deps.user_query
    
    # Simple calculation example
    if "average" in user_query.lower() or "mean" in user_query.lower():
        # Find column name in query
        column_candidates = [col for col in data.columns if col.lower() in user_query.lower()]
        if column_candidates:
            column = column_candidates[0]
            result = data[column].mean()
            return CalculationOutput(
                result=float(result),
                explanation=f"Calculated the average of {column}: {result:.2f}"
            )
    
    # Default result if no specific calculation is detected
    return CalculationOutput(
        result=None,
        explanation="No specific calculation could be performed based on the query."
    )

# Function to initialize the agents
def initialize_agents():
    """
    Initialize the planning and synthesis agents.
    
    Returns:
        Dictionary containing the initialized agents
    """
    return {
        "planning_agent": planning_agent,
        "synthesis_agent": synthesis_agent
    }

# Execute the flexible agentic flow
async def execute_flexible_agentic_flow(
    df: Union[pd.DataFrame, pl.DataFrame],
    user_query: str,
    chat_id: str,
    user_id: Optional[str] = None,
    is_follow_up: bool = False,
    previous_analysis: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Execute a flexible agentic flow that dynamically selects and executes tools using the Pydantic AI decorator pattern.
    
    Args:
        df: DataFrame with the data to analyze
        user_query: User's query or request
        chat_id: Chat ID for tracking
        user_id: Optional user ID
        is_follow_up: Whether this is a follow-up to a previous query
        previous_analysis: Results from previous analysis if this is a follow-up
        
    Returns:
        Dictionary with analysis results
    """
    # Generate a unique request ID
    request_id = str(uuid.uuid4())
    
    # Convert pandas DataFrame to polars if needed
    if isinstance(df, pd.DataFrame):
        try:
            pl_df = pl.from_pandas(df)
        except:
            pl_df = df  # Continue with pandas if conversion fails
    else:
        pl_df = df
        
    # Initialize result dictionary
    result = {
        "query": user_query,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    
    # Add follow-up context if applicable
    if is_follow_up and previous_analysis:
        result["follow_up"] = True
        result["previous_query"] = previous_analysis.get("query")
    
    # Create data description for the agent
    data_description = f"""
    DataFrame with {len(df)} rows and {len(df.columns)} columns.
    Columns: {', '.join(df.columns)}
    Sample data: {str(df.head(3))}
    """
    
    try:
        # Create dependencies object for the planning agent
        deps = AgentDependencies(
            data=pl_df,
            user_query=user_query,
            chat_id=chat_id,
            request_id=request_id,
            user_id=user_id
        )
        
        # Execute the planning agent to determine which tools to use
        planning_prompt = f"""
        User query: {user_query}
        
        Data description:
        {data_description}
        
        Based on this query and data, create a plan for which tools to use.
        """
        
        # Execute the planning agent
        plan_result = await planning_agent.run(planning_prompt, deps=deps)
        plan = plan_result.output
        
        print(f"Tool execution plan: {plan}")
        
        # Store all tool outputs
        tool_outputs = {}
        
        # Execute the primary tool - the agent will invoke the appropriate tool function
        if plan.primary_tool == "generate_insights":
            insights_result = await planning_agent.run("Generate insights from the data", deps=deps)
            if hasattr(insights_result, "tool_outputs") and insights_result.tool_outputs:
                for tool_name, tool_output in insights_result.tool_outputs.items():
                    if tool_name == "generate_insights" and isinstance(tool_output, InsightsOutput):
                        tool_outputs["insights"] = {
                            "points": tool_output.points,
                            "summary": tool_output.summary
                        }
                        
                        # Add insights to result
                        result["insights"] = {
                            "points": tool_output.points,
                            "summary": tool_output.summary
                        }
        
        # Execute visualization tools if needed
        if plan.requires_visualization:
            # The agent will first determine chart type then build specification
            chart_result = await planning_agent.run("Create a visualization for this data", deps=deps)
            
            if hasattr(chart_result, "tool_outputs") and chart_result.tool_outputs:
                for tool_name, tool_output in chart_result.tool_outputs.items():
                    if tool_name == "build_chart_spec" and isinstance(tool_output, ChartOutput):
                        tool_outputs["visualization"] = tool_output.chart_spec.dict()
                        
                        # Add visualization to result
                        result["visualization"] = tool_output.chart_spec.dict()
        
        # If SQL execution is in the plan, execute it
        if "execute_sql" in plan.additional_tools:
            sql_result = await planning_agent.run("Execute SQL query on this data", deps=deps)
            
            if hasattr(sql_result, "tool_outputs") and sql_result.tool_outputs:
                for tool_name, tool_output in sql_result.tool_outputs.items():
                    if tool_name == "execute_sql" and isinstance(tool_output, SQLOutput):
                        tool_outputs["sql_results"] = tool_output.results
                        
                        # Add SQL results to the final result
                        result["sql_results"] = tool_output.results
        
        # Generate the final answer using the synthesis agent
        synthesis_deps = {
            "user_query": user_query,
            "data_description": data_description,
            "tool_outputs": tool_outputs
        }
        
        synthesis_prompt = f"""
        User query: {user_query}
        
        Please synthesize the tool results into a comprehensive answer that directly addresses the user's query.
        """
        
        # Execute the synthesis agent
        final_answer = await synthesis_agent.run(synthesis_prompt, deps=synthesis_deps)
        
        # Add the final answer to the result
        result["answer"] = final_answer.output
        
    except Exception as e:
        print(f"Error in flexible agentic flow: {str(e)}")
        import traceback
        traceback.print_exc()
        result["error"] = str(e)
    
    return result

# No need for the old initialize_tools function since we're using decorators
def initialize_tools():
    """
    For backward compatibility, initialize agents and return empty dict.
    In the decorator pattern, tools are registered during module initialization.
    """
    print("Tools are automatically registered via decorators")
    return {} 