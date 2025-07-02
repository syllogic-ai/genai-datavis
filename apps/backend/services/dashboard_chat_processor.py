"""
Dashboard Chat Processor

Handles dashboard-centric chat messages and orchestrates widget operations.
Determines whether to create new widgets or edit existing ones based on user intent.
"""

import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import logfire
from supabase import Client
import duckdb

from apps.backend.core.models import WidgetOperation, ConversationItem
from apps.backend.services.orchestrator_stub import OrchestratorAgent
from apps.backend.services.intent_analysis_agent import IntentAnalysisAgent
# Note: append_chat_message will be handled by the main orchestrator
from apps.backend.utils.widget_operations import create_widget, update_widget, get_dashboard_files


logger = logging.getLogger(__name__)


class DashboardChatProcessor:
    """Processes dashboard-centric chat messages and manages widget operations."""
    
    def __init__(self, supabase_client: Client, duck_connection: duckdb.DuckDBPyConnection):
        self.supabase = supabase_client
        self.duck = duck_connection
        self.intent_agent = IntentAnalysisAgent()
        self.orchestrator = OrchestratorAgent()
    
    async def process_message(
        self,
        chat_id: str,
        request_id: str,
        dashboard_id: str,
        user_prompt: str,
        context_widget_ids: Optional[List[str]] = None,
        target_widget_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a dashboard chat message and determines appropriate widget operations.
        
        Args:
            chat_id: Chat session ID
            request_id: Unique request identifier
            dashboard_id: Dashboard ID for context
            user_prompt: User's message
            context_widget_ids: Optional widget IDs for context
            target_widget_type: Optional target widget type
            
        Returns:
            Processing result with response message and any widget operations
        """
        start_time = datetime.now()
        
        logfire.info(
            "Processing dashboard chat message",
            chat_id=chat_id,
            request_id=request_id,
            dashboard_id=dashboard_id,
            message_length=len(user_prompt),
            has_context_widgets=context_widget_ids is not None,
            target_widget_type=target_widget_type
        )
        
        try:
            # Get dashboard context
            dashboard_context = await self._get_dashboard_context(dashboard_id, context_widget_ids)
            
            # Analyze user intent
            intent_result = await self.intent_agent.analyze_intent(
                user_prompt=user_prompt,
                dashboard_context=dashboard_context,
                target_widget_type=target_widget_type
            )
            
            logfire.info(
                "Intent analysis completed",
                request_id=request_id,
                intent=intent_result.get("intent"),
                operation_type=intent_result.get("operation_type"),
                widget_types=intent_result.get("widget_types")
            )
            
            # Execute widget operations based on intent
            widget_operations = []
            response_message = "I've analyzed your request."
            
            if intent_result.get("operation_type") == "create":
                # Create new widgets
                operations = await self._create_widgets(
                    dashboard_id=dashboard_id,
                    chat_id=chat_id,
                    intent_result=intent_result,
                    dashboard_context=dashboard_context
                )
                widget_operations.extend(operations)
                if len(operations) > 0:
                    response_message = f"I've successfully created {len(operations)} new widget(s) for your dashboard. The dashboard will refresh automatically to show your new widgets."
                else:
                    response_message = "I've analyzed your request and prepared to create widgets for your dashboard."
                
            elif intent_result.get("operation_type") == "edit":
                # Edit existing widgets
                operations = await self._edit_widgets(
                    dashboard_id=dashboard_id,
                    chat_id=chat_id,
                    intent_result=intent_result,
                    dashboard_context=dashboard_context,
                    context_widget_ids=context_widget_ids
                )
                widget_operations.extend(operations)
                response_message = f"I've updated {len(operations)} widget(s) on your dashboard."
                
            else:
                # Provide analysis or insights without widget operations
                response_message = await self._generate_insights(
                    user_prompt=user_prompt,
                    dashboard_context=dashboard_context
                )
            
            # Note: Chat conversation will be updated by the main API handler
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logfire.info(
                "Dashboard chat processing completed",
                request_id=request_id,
                processing_time=processing_time,
                widget_operations_count=len(widget_operations),
                operation_types=[op.operation for op in widget_operations]
            )
            
            return {
                "answer": response_message,
                "request_id": request_id,
                "widget_operations": [op.dict() for op in widget_operations],
                "dashboard_id": dashboard_id,
                "processing_time": processing_time
            }
            
        except Exception as e:
            error_message = str(e)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logfire.error(
                "Error processing dashboard chat message",
                request_id=request_id,
                error=error_message,
                error_type=type(e).__name__,
                processing_time=processing_time
            )
            
            # Note: Error handling will be done by the main API handler
            
            raise e
    
    async def _get_dashboard_context(
        self, 
        dashboard_id: str, 
        context_widget_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get dashboard context including widgets and data files."""
        try:
            # Get dashboard info
            dashboard_result = self.supabase.table("dashboards").select("*").eq("id", dashboard_id).execute()
            dashboard = dashboard_result.data[0] if dashboard_result.data else None
            
            # Get dashboard widgets
            widgets_query = self.supabase.table("widgets").select("*").eq("dashboard_id", dashboard_id)
            if context_widget_ids:
                widgets_query = widgets_query.in_("id", context_widget_ids)
            
            widgets_result = widgets_query.execute()
            widgets = widgets_result.data or []
            
            # Get dashboard files
            files = await get_dashboard_files(dashboard_id, self.supabase)
            
            return {
                "dashboard": dashboard,
                "widgets": widgets,
                "files": files,
                "context_widget_ids": context_widget_ids
            }
            
        except Exception as e:
            logfire.error(f"Error getting dashboard context: {e}")
            return {"dashboard": None, "widgets": [], "files": []}
    
    async def _create_widgets(
        self,
        dashboard_id: str,
        chat_id: str,
        intent_result: Dict[str, Any],
        dashboard_context: Dict[str, Any]
    ) -> List[WidgetOperation]:
        """Create new widgets based on intent analysis."""
        operations = []
        
        widget_specs = intent_result.get("widget_specs", [])
        if not widget_specs:
            # Create a default widget if none specified
            widget_specs = [{
                "type": "chart",
                "title": "Data Analysis Chart",
                "config": {"chartType": "line"},
                "data": None,
                "sql": None,
                "layout": None
            }]
        
        for i, widget_spec in enumerate(widget_specs):
            try:
                # Generate unique widget ID
                widget_id = str(uuid.uuid4())
                
                # Enhanced widget configuration
                widget_config = {
                    "chartType": widget_spec.get("config", {}).get("chartType", "line"),
                    "showLegend": True,
                    "showGrid": True,
                    "colors": ["#8884d8", "#82ca9d", "#ffc658"],
                    "title": widget_spec.get("title", f"New {widget_spec.get('type', 'chart').title()} Widget"),
                    **widget_spec.get("config", {})
                }
                
                # Generate layout
                layout = widget_spec.get("layout") or self._generate_default_layout(i)
                layout["i"] = widget_id  # Ensure layout ID matches widget ID
                
                # Create widget operation
                operation = WidgetOperation(
                    operation="create",
                    widget_id=widget_id,
                    widget_type=widget_spec.get("type", "chart"),
                    title=widget_spec.get("title", f"New {widget_spec.get('type', 'chart').title()} Widget"),
                    config=widget_config,
                    data=widget_spec.get("data"),
                    sql=widget_spec.get("sql"),
                    layout=layout
                )
                
                # Execute the create operation
                await create_widget(
                    dashboard_id=dashboard_id,
                    widget_operation=operation,
                    chat_id=chat_id,
                    supabase=self.supabase
                )
                
                operations.append(operation)
                
                logfire.info(
                    "Widget created successfully",
                    widget_id=widget_id,
                    widget_type=operation.widget_type,
                    dashboard_id=dashboard_id
                )
                
            except Exception as e:
                logfire.error(f"Error creating widget: {e}")
                continue
        
        return operations
    
    async def _edit_widgets(
        self,
        dashboard_id: str,
        chat_id: str,
        intent_result: Dict[str, Any],
        dashboard_context: Dict[str, Any],
        context_widget_ids: Optional[List[str]] = None
    ) -> List[WidgetOperation]:
        """Edit existing widgets based on intent analysis."""
        operations = []
        
        target_widgets = dashboard_context.get("widgets", [])
        if context_widget_ids:
            target_widgets = [w for w in target_widgets if w["id"] in context_widget_ids]
        
        for widget in target_widgets:
            try:
                # Determine what needs to be updated
                updates = intent_result.get("widget_updates", {})
                
                operation = WidgetOperation(
                    operation="edit",
                    widget_id=widget["id"],
                    widget_type=widget["type"],
                    title=updates.get("title", widget["title"]),
                    config={**widget["config"], **updates.get("config", {})},
                    data=updates.get("data", widget["data"]),
                    sql=updates.get("sql", widget["sql"]),
                    layout={**widget["layout"], **updates.get("layout", {})}
                )
                
                # Execute the update operation
                await update_widget(
                    widget_operation=operation,
                    supabase=self.supabase
                )
                
                operations.append(operation)
                
            except Exception as e:
                logfire.error(f"Error updating widget {widget['id']}: {e}")
                continue
        
        return operations
    
    async def _generate_insights(
        self,
        user_prompt: str,
        dashboard_context: Dict[str, Any]
    ) -> str:
        """Generate insights or analysis without widget operations."""
        # Use orchestrator to generate insights
        result = await self.orchestrator.generate_insights(
            user_prompt=user_prompt,
            dashboard_context=dashboard_context
        )
        
        return result.get("insights", "I've analyzed your dashboard and data.")
    
    async def _update_chat_conversation(
        self,
        chat_id: str,
        user_message: str,
        assistant_response: str,
        context_widget_ids: Optional[List[str]] = None,
        target_widget_type: Optional[str] = None,
        is_error: bool = False
    ):
        """Update the chat conversation with new messages."""
        timestamp = datetime.now().isoformat()
        
        # Add user message
        user_msg = ConversationItem(
            role="user",
            message=user_message,
            timestamp=timestamp,
            contextWidgetIds=context_widget_ids,
            targetWidgetType=target_widget_type
        )
        
        # Add assistant response
        assistant_msg = ConversationItem(
            role="assistant" if not is_error else "system",
            message=assistant_response,
            timestamp=timestamp
        )
        
        # Update chat in database
        try:
            chat_result = self.supabase.table("chats").select("conversation").eq("id", chat_id).execute()
            current_conversation = chat_result.data[0]["conversation"] if chat_result.data else []
            
            # Append new messages
            updated_conversation = current_conversation + [
                user_msg.dict(exclude_none=True),
                assistant_msg.dict(exclude_none=True)
            ]
            
            # Update database
            self.supabase.table("chats").update({
                "conversation": updated_conversation,
                "updated_at": timestamp
            }).eq("id", chat_id).execute()
            
        except Exception as e:
            logfire.error(f"Error updating chat conversation: {e}")
    
    def _generate_default_layout(self, index: int) -> Dict[str, Any]:
        """Generate default layout for new widgets."""
        # Simple grid placement
        cols = 4
        x = (index % cols) * 3
        y = (index // cols) * 4
        
        return {
            "i": str(uuid.uuid4()),
            "x": x,
            "y": y,
            "w": 3,
            "h": 4,
            "minW": 2,
            "minH": 3,
            "isResizable": True
        }


async def process_dashboard_chat_request(
    chat_id: str,
    request_id: str,
    dashboard_id: str,
    user_prompt: str,
    context_widget_ids: Optional[List[str]] = None,
    target_widget_type: Optional[str] = None,
    duck_connection: duckdb.DuckDBPyConnection = None,
    supabase_client: Client = None
) -> Dict[str, Any]:
    """
    Main entry point for processing dashboard chat requests.
    
    This function is called from the main API endpoint.
    """
    processor = DashboardChatProcessor(supabase_client, duck_connection)
    
    return await processor.process_message(
        chat_id=chat_id,
        request_id=request_id,
        dashboard_id=dashboard_id,
        user_prompt=user_prompt,
        context_widget_ids=context_widget_ids,
        target_widget_type=target_widget_type
    )