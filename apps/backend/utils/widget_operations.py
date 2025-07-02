"""
Widget Operations Utility

Handles CRUD operations for dashboard widgets.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid
import logfire
from supabase import Client

from apps.backend.core.models import WidgetOperation


async def create_widget(
    dashboard_id: str,
    widget_operation: WidgetOperation,
    chat_id: str,
    supabase: Client
) -> Dict[str, Any]:
    """
    Create a new widget in the database.
    
    Args:
        dashboard_id: Dashboard ID
        widget_operation: Widget operation details
        chat_id: Chat ID that created the widget
        supabase: Supabase client
        
    Returns:
        Created widget data
    """
    try:
        timestamp = datetime.now().isoformat()
        
        widget_data = {
            "id": widget_operation.widget_id,
            "dashboard_id": dashboard_id,
            "title": widget_operation.title,
            "type": widget_operation.widget_type,
            "config": widget_operation.config,
            "data": widget_operation.data,
            "sql": widget_operation.sql,
            "layout": widget_operation.layout,
            "chat_id": chat_id,
            "is_configured": True,
            "created_at": timestamp,
            "updated_at": timestamp
        }
        
        result = supabase.table("widgets").insert(widget_data).execute()
        
        logfire.info(
            "Widget created successfully",
            widget_id=widget_operation.widget_id,
            dashboard_id=dashboard_id,
            widget_type=widget_operation.widget_type
        )
        
        return result.data[0] if result.data else widget_data
        
    except Exception as e:
        logfire.error(
            "Error creating widget",
            widget_id=widget_operation.widget_id,
            error=str(e)
        )
        raise e


async def update_widget(
    widget_operation: WidgetOperation,
    supabase: Client
) -> Dict[str, Any]:
    """
    Update an existing widget in the database.
    
    Args:
        widget_operation: Widget operation details
        supabase: Supabase client
        
    Returns:
        Updated widget data
    """
    try:
        timestamp = datetime.now().isoformat()
        
        update_data = {
            "title": widget_operation.title,
            "config": widget_operation.config,
            "data": widget_operation.data,
            "sql": widget_operation.sql,
            "layout": widget_operation.layout,
            "updated_at": timestamp
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        result = supabase.table("widgets").update(update_data).eq("id", widget_operation.widget_id).execute()
        
        logfire.info(
            "Widget updated successfully",
            widget_id=widget_operation.widget_id,
            updated_fields=list(update_data.keys())
        )
        
        return result.data[0] if result.data else update_data
        
    except Exception as e:
        logfire.error(
            "Error updating widget",
            widget_id=widget_operation.widget_id,
            error=str(e)
        )
        raise e


async def delete_widget(
    widget_id: str,
    supabase: Client
) -> bool:
    """
    Delete a widget from the database.
    
    Args:
        widget_id: Widget ID to delete
        supabase: Supabase client
        
    Returns:
        True if successful
    """
    try:
        result = supabase.table("widgets").delete().eq("id", widget_id).execute()
        
        logfire.info(
            "Widget deleted successfully",
            widget_id=widget_id
        )
        
        return True
        
    except Exception as e:
        logfire.error(
            "Error deleting widget",
            widget_id=widget_id,
            error=str(e)
        )
        raise e


async def get_dashboard_widgets(
    dashboard_id: str,
    supabase: Client
) -> List[Dict[str, Any]]:
    """
    Get all widgets for a dashboard.
    
    Args:
        dashboard_id: Dashboard ID
        supabase: Supabase client
        
    Returns:
        List of widget data
    """
    try:
        result = supabase.table("widgets").select("*").eq("dashboard_id", dashboard_id).execute()
        
        return result.data or []
        
    except Exception as e:
        logfire.error(
            "Error getting dashboard widgets",
            dashboard_id=dashboard_id,
            error=str(e)
        )
        return []


async def get_dashboard_files(
    dashboard_id: str,
    supabase: Client
) -> List[Dict[str, Any]]:
    """
    Get all files associated with a dashboard.
    
    Args:
        dashboard_id: Dashboard ID
        supabase: Supabase client
        
    Returns:
        List of file data
    """
    try:
        result = supabase.table("files").select("*").eq("dashboard_id", dashboard_id).execute()
        
        return result.data or []
        
    except Exception as e:
        logfire.error(
            "Error getting dashboard files",
            dashboard_id=dashboard_id,
            error=str(e)
        )
        return []


async def trigger_dashboard_refresh(
    dashboard_id: str,
    supabase: Client,
    operation_type: str = "widget_update"
) -> bool:
    """
    Trigger a dashboard refresh notification.
    
    This function could be enhanced to use WebSockets or Server-Sent Events
    for real-time updates. For now, it updates the dashboard's updated_at timestamp
    which can be monitored by the frontend.
    
    Args:
        dashboard_id: Dashboard ID
        supabase: Supabase client
        operation_type: Type of operation that triggered the refresh
        
    Returns:
        True if successful
    """
    try:
        timestamp = datetime.now().isoformat()
        
        # Update dashboard timestamp to trigger frontend refresh
        result = supabase.table("dashboards").update({
            "updated_at": timestamp
        }).eq("id", dashboard_id).execute()
        
        logfire.info(
            "Dashboard refresh triggered",
            dashboard_id=dashboard_id,
            operation_type=operation_type
        )
        
        # Here you could also send a real-time notification
        # via Supabase real-time subscriptions or WebSocket
        await _send_realtime_notification(dashboard_id, operation_type, supabase)
        
        return True
        
    except Exception as e:
        logfire.error(
            "Error triggering dashboard refresh",
            dashboard_id=dashboard_id,
            error=str(e)
        )
        return False


async def _send_realtime_notification(
    dashboard_id: str,
    operation_type: str,
    supabase: Client
):
    """
    Send real-time notification to frontend clients.
    
    This could be enhanced with custom channels or WebSocket connections.
    """
    try:
        # Using Supabase real-time features
        # The frontend can subscribe to dashboard changes
        notification_data = {
            "event": "dashboard_updated",
            "dashboard_id": dashboard_id,
            "operation_type": operation_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # For now, we rely on Supabase's built-in real-time subscriptions
        # that the frontend can listen to for dashboard table changes
        
        logfire.info(
            "Real-time notification prepared",
            dashboard_id=dashboard_id,
            operation_type=operation_type
        )
        
    except Exception as e:
        logfire.error(
            "Error sending real-time notification",
            dashboard_id=dashboard_id,
            error=str(e)
        )