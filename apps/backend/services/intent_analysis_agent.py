"""
Intent Analysis Agent

Analyzes user messages to determine whether they want to create new widgets
or edit existing ones, and what type of widgets they're interested in.
"""

import json
from typing import Dict, List, Any, Optional
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext, Tool


class IntentAnalysis(BaseModel):
    """Structure for intent analysis results."""
    intent: str = Field(description="The user's primary intent: 'create', 'edit', 'analyze', or 'question'")
    operation_type: str = Field(description="Type of operation: 'create', 'edit', 'analyze', or 'none'")
    widget_types: List[str] = Field(description="List of widget types mentioned or inferred: 'chart', 'table', 'kpi', 'text'")
    confidence: float = Field(description="Confidence score from 0.0 to 1.0")
    reasoning: str = Field(description="Brief explanation of the analysis")
    widget_specs: Optional[List[Dict[str, Any]]] = Field(description="Specifications for widgets to create", default=None)
    widget_updates: Optional[Dict[str, Any]] = Field(description="Updates to apply to existing widgets", default=None)
    chart_id: Optional[str] = Field(description="ID of the created chart/widget", default=None)
    sql_query: Optional[str] = Field(description="SQL query used to fetch data", default=None)
    data_summary: Optional[str] = Field(description="Summary of the data retrieved", default=None)


class IntentAnalysisAgent:
    """Agent for analyzing user intent in dashboard chat messages."""
    
    def __init__(self):
        pass
    
    async def analyze_intent(
        self,
        user_prompt: str,
        dashboard_context: Dict[str, Any],
        target_widget_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze user intent from their message and dashboard context.
        
        Args:
            user_prompt: The user's message
            dashboard_context: Context about the dashboard and existing widgets
            target_widget_type: Optional target widget type specified by user
            
        Returns:
            Intent analysis results
        """
        try:
            # Simple rule-based intent analysis
            # This could be enhanced with an LLM for more sophisticated analysis
            
            prompt_lower = user_prompt.lower()
            
            # Determine operation type
            operation_type = "none"
            intent = "question"
            widget_types = []
            confidence = 0.7
            
            # Check for creation intent
            create_keywords = ["create", "add", "make", "show", "build", "generate", "new"]
            if any(keyword in prompt_lower for keyword in create_keywords):
                operation_type = "create"
                intent = "create"
                confidence = 0.8
            
            # Check for edit intent
            edit_keywords = ["update", "change", "modify", "edit", "adjust", "fix"]
            context_widget_ids = dashboard_context.get("context_widget_ids")
            if any(keyword in prompt_lower for keyword in edit_keywords) or context_widget_ids:
                operation_type = "edit"
                intent = "edit"
                confidence = 0.8
            
            # Check for analysis intent
            analysis_keywords = ["analyze", "explain", "insights", "summary", "what", "how", "why"]
            if any(keyword in prompt_lower for keyword in analysis_keywords):
                if operation_type == "none":
                    operation_type = "analyze"
                    intent = "analyze"
                    confidence = 0.7
            
            # Determine widget types
            if "chart" in prompt_lower or "graph" in prompt_lower or "plot" in prompt_lower:
                widget_types.append("chart")
            if "table" in prompt_lower or "list" in prompt_lower:
                widget_types.append("table")
            if "metric" in prompt_lower or "kpi" in prompt_lower or "number" in prompt_lower:
                widget_types.append("kpi")
            if "text" in prompt_lower or "summary" in prompt_lower or "explanation" in prompt_lower:
                widget_types.append("text")
            
            # Use target widget type if specified
            if target_widget_type and target_widget_type not in widget_types:
                widget_types.append(target_widget_type)
            
            # Default to chart if creating but no type specified
            if operation_type == "create" and not widget_types:
                widget_types = ["chart"]
            
            analysis = {
                "intent": intent,
                "operation_type": operation_type,
                "widget_types": widget_types,
                "confidence": confidence,
                "reasoning": f"Detected {intent} intent based on keywords and context"
            }
            
            # Add specific widget specifications if creating
            if operation_type == "create":
                analysis["widget_specs"] = await self._generate_widget_specs(
                    user_prompt, analysis, dashboard_context
                )
            
            # Add update specifications if editing
            elif operation_type == "edit":
                analysis["widget_updates"] = await self._generate_widget_updates(
                    user_prompt, analysis, dashboard_context
                )
            
            logfire.info(
                "Intent analysis completed",
                intent=analysis["intent"],
                operation_type=analysis["operation_type"],
                confidence=analysis["confidence"],
                widget_types=analysis["widget_types"]
            )
            
            return analysis
            
        except Exception as e:
            logfire.error(f"Error in intent analysis: {e}")
            
            # Return fallback analysis
            return {
                "intent": "question",
                "operation_type": "none",
                "widget_types": [],
                "confidence": 0.1,
                "reasoning": f"Error in analysis: {str(e)}",
                "widget_specs": None,
                "widget_updates": None
            }
    
    async def _generate_widget_specs(
        self,
        user_prompt: str,
        analysis: Dict[str, Any],
        dashboard_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate specifications for widgets to create."""
        widget_specs = []
        
        for widget_type in analysis.get("widget_types", []):
            spec = {
                "type": widget_type,
                "title": self._generate_widget_title(user_prompt, widget_type),
                "config": self._generate_default_config(widget_type),
                "data": None,  # Will be populated by data processing
                "sql": None,   # Will be generated by SQL agent
                "layout": None  # Will be generated by layout manager
            }
            widget_specs.append(spec)
        
        return widget_specs
    
    async def _generate_widget_updates(
        self,
        user_prompt: str,
        analysis: Dict[str, Any],
        dashboard_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate update specifications for existing widgets."""
        updates = {}
        
        # Analyze what aspects the user wants to update
        prompt_lower = user_prompt.lower()
        
        if any(word in prompt_lower for word in ["title", "name", "rename"]):
            updates["title"] = self._extract_new_title(user_prompt)
        
        if any(word in prompt_lower for word in ["color", "style", "format"]):
            updates["config"] = {"style_updates": True}
        
        if any(word in prompt_lower for word in ["data", "filter", "query"]):
            updates["sql"] = "-- SQL will be updated by SQL agent"
        
        return updates
    
    def _generate_widget_title(self, user_prompt: str, widget_type: str) -> str:
        """Generate a title for a new widget based on user prompt."""
        # Simple heuristic - could be enhanced with NLP
        prompt_words = user_prompt.lower().split()
        
        # Look for key terms
        key_terms = []
        for word in prompt_words:
            if len(word) > 3 and word not in ["show", "create", "make", "add", "chart", "graph", "table"]:
                key_terms.append(word.title())
        
        if key_terms:
            base_title = " ".join(key_terms[:3])  # Max 3 words
        else:
            base_title = "New Analysis"
        
        # Add widget type context
        type_suffixes = {
            "chart": "Chart",
            "table": "Table", 
            "kpi": "Metrics",
            "text": "Summary"
        }
        
        suffix = type_suffixes.get(widget_type, "Widget")
        return f"{base_title} {suffix}"
    
    def _generate_default_config(self, widget_type: str) -> Dict[str, Any]:
        """Generate default configuration for a widget type."""
        configs = {
            "chart": {
                "chartType": "line",
                "showLegend": True,
                "showGrid": True,
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
            },
            "table": {
                "showPagination": True,
                "pageSize": 10,
                "sortable": True,
                "filterable": True
            },
            "kpi": {
                "showChange": True,
                "showTrend": True,
                "format": "number"
            },
            "text": {
                "format": "markdown",
                "maxLength": 500
            }
        }
        
        return configs.get(widget_type, {})
    
    def _extract_new_title(self, user_prompt: str) -> str:
        """Extract new title from user prompt."""
        # Simple extraction - could be enhanced
        prompt_lower = user_prompt.lower()
        
        # Look for patterns like "rename to X" or "change title to X"
        patterns = [
            "rename to ",
            "change title to ",
            "call it ",
            "title it "
        ]
        
        for pattern in patterns:
            if pattern in prompt_lower:
                after_pattern = prompt_lower.split(pattern, 1)[1]
                # Take first few words
                title_words = after_pattern.split()[:4]
                return " ".join(word.title() for word in title_words)
        
        return "Updated Widget"


# Alias for backward compatibility with orchestrator_agent
AnalysisOutput = IntentAnalysis

# Create enhanced agent instance that can call SQL and viz agents
from apps.backend.core.models import Deps

intent_analysis_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    result_type=IntentAnalysis,
)

@intent_analysis_agent.system_prompt
async def intent_analysis_system_prompt(ctx: RunContext[Deps]) -> str:
    """Generate system prompt for intent analysis agent."""
    
    # Check if this is a dashboard request
    is_dashboard_request = ctx.deps.dashboard_id is not None
    dashboard_context = ""
    
    if is_dashboard_request:
        dashboard_context = f"""
        
        DASHBOARD CONTEXT:
        - Dashboard ID: {ctx.deps.dashboard_id}
        - Context Widget IDs: {ctx.deps.context_widget_ids or "None"}
        - Target Widget Type: {ctx.deps.target_widget_type or "Any"}
        
        This is a dashboard widget creation request. Your goal is to:
        1. Analyze the user's intent to create or edit widgets
        2. Generate appropriate SQL queries to fetch relevant data
        3. Create meaningful visualizations based on the data
        4. Return proper widget specifications with real data
        """
    
    return f"""
    You are an expert at analyzing user intentions in data visualization contexts and creating meaningful widgets.
    
    Your responsibilities:
    1. Determine if the user wants to create widgets, edit existing ones, or get insights
    2. If creating widgets, generate SQL queries to fetch appropriate data
    3. Create visualizations with real data from the database
    4. Provide complete widget specifications ready for dashboard display
    
    Current user request: {ctx.deps.user_prompt}
    {dashboard_context}
    
    You have access to tools for:
    - SQL query generation and execution (use the query_data tool)
    - Visualization creation (use the create_visualization tool)
    
    Always use these tools to create widgets with real data, not empty specifications.
    """

@intent_analysis_agent.tool
async def create_data_visualization(ctx: RunContext[Deps], chart_type: str, title: str, data_description: str) -> Dict[str, Any]:
    """Create a complete data visualization by calling SQL and viz agents in sequence."""
    try:
        logfire.info(f"Intent agent creating {chart_type} visualization: {title}")
        
        # Import here to avoid circular imports
        from apps.backend.services.sql_agent import sql_agent
        from apps.backend.services.viz_agent import viz_agent
        
        # Step 1: Generate and execute SQL query
        logfire.info(f"Step 1: Calling SQL agent for data: {data_description}")
        sql_result = await sql_agent.run(
            f"Generate SQL query to get data for: {data_description}. User request: {ctx.deps.user_prompt}",
            deps=ctx.deps
        )
        
        if not sql_result.output:
            logfire.error("SQL agent returned no result")
            return {"error": "Failed to generate SQL query"}
        
        logfire.info("SQL agent completed successfully", chart_id=sql_result.output.chart_id)
        
        # Step 2: Create visualization using the chart_id from SQL agent
        if sql_result.output.chart_id:
            logfire.info(f"Step 2: Calling Viz agent with chart_id: {sql_result.output.chart_id}")
            viz_result = await viz_agent.run(
                f"Create a {chart_type} visualization titled '{title}' for chart_id {sql_result.output.chart_id}. User request: {ctx.deps.user_prompt}",
                deps=ctx.deps
            )
            
            if viz_result.output:
                logfire.info("Viz agent completed successfully", result=viz_result.output.dict())
                return {
                    "chart_id": sql_result.output.chart_id,
                    "sql_query": sql_result.output.sql_query if hasattr(sql_result.output, 'sql_query') else None,
                    "visualization": viz_result.output.dict(),
                    "success": True
                }
            else:
                logfire.error("Viz agent returned no result")
                return {
                    "chart_id": sql_result.output.chart_id,
                    "sql_query": sql_result.output.sql_query if hasattr(sql_result.output, 'sql_query') else None,
                    "error": "Failed to create visualization"
                }
        else:
            logfire.error("SQL agent did not return a chart_id")
            return {"error": "SQL processing failed to create chart"}
        
    except Exception as e:
        logfire.error(f"Error in create_data_visualization tool: {e}")
        return {"error": str(e)}

# The class is already defined above as IntentAnalysisAgent