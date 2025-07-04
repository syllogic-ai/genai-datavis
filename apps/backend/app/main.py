from httpx import request
from apps.backend.tools.llm_interaction import process_user_request
from apps.backend.utils.chat import append_chat_message, get_widget_specs, convert_data_to_chart_data, convert_data_to_chart_data_1d
from apps.backend.utils.files import fetch_dataset
from apps.backend.utils.utils import get_data
from fastapi import FastAPI, HTTPException, Request, Response, Depends, Header
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import os
import sys
from dotenv import load_dotenv
import requests
import io
import json
from datetime import datetime
from supabase import create_client, Client
import uuid
import time
import asyncio
import duckdb
import logging
import logfire
from uuid import uuid4

# Load environment variables
load_dotenv()

# Import QStash utilities (replacing Redis)
from apps.backend.utils.qstash_queue import enqueue_task, verify_qstash_signature, qstash_client

# Import hybrid job tracking utilities (Redis + Supabase)
from apps.backend.utils.job_persistence import create_job, update_job_status, complete_job, fail_job
from apps.backend.utils.job_tracking import get_job_status  # Keep Redis-only for real-time reads

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the configuration module for Logfire
from apps.backend.core.config import configure_logfire
from apps.backend.core.models import ChatMessageRequest, WidgetOperation
from apps.backend.services.dashboard_chat_processor import process_dashboard_chat_request
from apps.backend.utils.widget_operations import trigger_dashboard_refresh

# Import Pydantic AI components
from pydantic_ai import Agent, RunContext

# Import utility functions
try:
    from apps.backend.utils.chat import append_chat_message
except ImportError as e:
    print(f"Failed to import utility functions: {str(e)}")
    # Try other import paths that might work
    try:
        from utils.chat import append_chat_message
    except ImportError as e2:
        print(f"All import attempts for utility functions failed: {str(e2)}")




# Initialize Logfire for observability
configure_logfire()

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# DuckDB setup
duck_connection = duckdb.connect(":memory:")

# Define queue name as a constant
ANALYSIS_QUEUE_NAME = "analysis_tasks"

app = FastAPI(title="GenAI DataVis API", 
              description="API for generating data visualizations with AI",
              version="0.1.0")

# Configure CORS with environment variables
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000", "http://127.0.0.1:3000", "*"],  # Added wildcard as fallback
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)

# Add Logfire middleware to track all requests
@app.middleware("http")
async def logfire_middleware(request: Request, call_next):
    start_time = time.time()
    

    # Process the request
    try:
        response = await call_next(request)
        status_code = response.status_code
        
        # Log successful request
        logfire.info(
            "HTTP request processed",
            method=request.method,
            path=request.url.path,
            status_code=status_code,
            duration=time.time() - start_time
        )
        
        return response
    except Exception as e:
        # Log failed request
        logfire.error(
            "HTTP request failed",
            method=request.method,
            path=request.url.path,
            error=str(e),
            error_type=type(e).__name__,
            duration=time.time() - start_time
        )
        raise

# Dependency functions for database connections
def get_supabase_client():
    return supabase

def get_db_connection():
    return duck_connection

# Request model for the analysis endpoint (legacy support)
class AnalysisRequest(BaseModel):
    """Request model for the analysis endpoint."""
    prompt: str
    file_id: str
    chat_id: str
    request_id: str
    is_follow_up: bool = False
    widget_type: Optional[str] = None

# New request model for dashboard-centric chat messages
class ChatAnalysisRequest(BaseModel):
    """Request model for dashboard-centric chat analysis."""
    message: str
    dashboardId: str
    contextWidgetIds: Optional[List[str]] = None
    targetWidgetType: Optional[str] = None
    chat_id: str
    request_id: str
    user_id: Optional[str] = None  # Clerk user ID for job ownership

# Request model for the chart spec data endpoint
class ChartSpecRequest(BaseModel):
    """Request model for computing chart spec data."""
    file_id: str
    chart_id: str
    chat_id: str
    chart_specs: Dict[str, Any]

# Response model for the analysis endpoint
class AnalysisResponse(BaseModel):
    """Response model for the analysis endpoint."""
    answer: str
    request_id: str
    chat_id: str
    chart_id: Optional[str] = None
    insights: Optional[Dict[str, str]] = None

# New response model for enqueued task
class EnqueueResponse(BaseModel):
    """Response model when a task is successfully enqueued."""
    message: str
    task_id: Optional[str] = None
    queue_name: str
    request_id: str
    chat_id: str

# Response model for the chart spec data endpoint
class ChartSpecResponse(BaseModel):
    """Response model for computed chart spec data."""
    chart_specs: Dict[str, Any]

# Title generation request and response models
class TitleGenerationRequest(BaseModel):
    """Request model for the title generation endpoint."""
    query: str
    column_names: List[str]
    chat_id: str
    user_id: str

class TitleGenerationResponse(BaseModel):
    """Response model for the title generation endpoint."""
    title: str
    chat_id: str

# Define Pydantic model for LLM response for title generation
class GeneratedTitle(BaseModel):
    """Pydantic model for the generated title."""
    title: str = Field(description="A concise and relevant title, maximum 5 words.")

# Create an agent for title generation
title_agent = Agent(
    "openai:gpt-4o-mini", # Using a cost-effective and fast model
    output_type=GeneratedTitle,
)

@title_agent.system_prompt
async def title_generation_system_prompt(ctx: RunContext) -> str:
    # The context (ctx) is not strictly needed here as we pass relevant info directly
    # but it's good practice to include it for agent system prompts.
    # The actual user query and columns will be part of the main prompt to the agent.
    return (
        "You are an expert in creating concise and informative titles for data analyses. "
        "Generate a title that is a maximum of 5 words. "
        "The title should be directly relevant to the user's query and the provided column names."
    )

ANALYSIS_QUEUE_NAME = "analysis_tasks"

@app.post("/chat/analyze", response_model=EnqueueResponse)
async def analyze_chat_message(
    request: ChatAnalysisRequest,
) -> EnqueueResponse:
    """
    Receives a chat message for dashboard analysis and enqueues it for background processing.
    
    Args:
        request: The chat message request containing dashboard context
        
    Returns:
        Acknowledgement that the task has been enqueued.
    """
    start_time = time.time()
    
    # Log the incoming request
    logfire.info(
        "Chat analysis request received for queueing",
        chat_id=request.chat_id,
        request_id=request.request_id,
        dashboard_id=request.dashboardId,
        message=request.message[:100],  # Log first 100 chars
        has_context_widgets=request.contextWidgetIds is not None,
        target_widget_type=request.targetWidgetType
    )
    
    # Generate task ID upfront so it's consistent everywhere
    task_id = request.request_id  # Use request_id as task_id for consistency
    
    # Prepare task data with new structure
    task_data = {
        "task_id": task_id,  # Include task_id in the payload
        "chat_id": request.chat_id,
        "request_id": request.request_id,
        "dashboard_id": request.dashboardId,
        "user_prompt": request.message,
        "context_widget_ids": request.contextWidgetIds,
        "target_widget_type": request.targetWidgetType,
        "user_id": request.user_id,  # Include user_id for job tracking
        "received_at": datetime.now().isoformat()
    }

    try:
        # Use QStash to enqueue the task
        enqueued_task_id = enqueue_task(ANALYSIS_QUEUE_NAME, task_data)
        
        if not enqueued_task_id:
            raise HTTPException(
                status_code=503,
                detail="Failed to enqueue task to QStash"
            )
        
        # Create job tracking record with hybrid Redis + Supabase persistence
        try:
            user_id = request.user_id or request.chat_id  # Fallback to chat_id if no user_id
            create_job(
                job_id=task_id,
                user_id=user_id,
                dashboard_id=request.dashboardId
            )
            logfire.info(f"Job {task_id} created for user {user_id} with hybrid tracking")
        except Exception as job_error:
            logfire.warn(f"Failed to create job tracking: {job_error}")
            # Continue without job tracking - SSE will gracefully degrade
        
        processing_time = time.time() - start_time
        logfire.info(
            "Chat task successfully enqueued to QStash",
            request_id=request.request_id,
            chat_id=request.chat_id,
            task_id=task_id,
            queue_name=ANALYSIS_QUEUE_NAME,
            processing_time=processing_time
        )
        
        return EnqueueResponse(
            message="Chat analysis task successfully enqueued.",
            task_id=task_id,
            queue_name=ANALYSIS_QUEUE_NAME,
            request_id=request.request_id,
            chat_id=request.chat_id
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_message = str(e)
        
        logfire.error(
            "Failed to enqueue chat analysis task",
            chat_id=request.chat_id,
            request_id=request.request_id,
            error=error_message,
            error_type=type(e).__name__,
            processing_time=processing_time
        )
        
        raise HTTPException(
            status_code=503,
            detail=f"Chat analysis processing service is temporarily unavailable: {error_message}"
        )

@app.post("/analyze", response_model=EnqueueResponse)
async def analyze_data(
    request: AnalysisRequest,
) -> EnqueueResponse:
    """
    Receives an analysis request and enqueues it for background processing via QStash.
    
    Args:
        request: The analysis request containing prompt and context
        
    Returns:
        Acknowledgement that the task has been enqueued.
    """
    start_time = time.time()
    
    # Log the incoming request
    logfire.info(
        "Analysis request received for queueing",
        chat_id=request.chat_id,
        request_id=request.request_id,
        file_id=request.file_id,
        prompt=request.prompt,
        is_follow_up=request.is_follow_up,
        widget_type=request.widget_type
    )
    
    # Prepare task data
    task_data = {
        "chat_id": request.chat_id,
        "request_id": request.request_id,
        "file_id": request.file_id,
        "user_prompt": request.prompt,
        "is_follow_up": request.is_follow_up,
        "received_at": datetime.now().isoformat(),
        "widget_type": request.widget_type
    }

    try:
        # Use QStash to enqueue the task
        task_id = enqueue_task(ANALYSIS_QUEUE_NAME, task_data)
        
        if not task_id:
            raise HTTPException(
                status_code=503,
                detail="Failed to enqueue task to QStash"
            )
        
        processing_time = time.time() - start_time
        logfire.info(
            "Task successfully enqueued to QStash",
            request_id=request.request_id,
            chat_id=request.chat_id,
            task_id=task_id,
            queue_name=ANALYSIS_QUEUE_NAME,
            processing_time=processing_time
        )
        
        return EnqueueResponse(
            message="Analysis task successfully enqueued.",
            task_id=task_id,
            queue_name=ANALYSIS_QUEUE_NAME,
            request_id=request.request_id,
            chat_id=request.chat_id
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_message = str(e)
        
        logfire.error(
            "Failed to enqueue analysis task",
            chat_id=request.chat_id,
            request_id=request.request_id,
            error=error_message,
            error_type=type(e).__name__,
            processing_time=processing_time
        )
        
        raise HTTPException(
            status_code=503,
            detail=f"Analysis processing service is temporarily unavailable: {error_message}"
        )

@app.post("/internal/process-analysis_tasks")
async def process_analysis_task(
    request: Request,
    upstash_signature: Optional[str] = Header(None)
) -> dict:
    """
    Internal endpoint that receives and processes analysis tasks from QStash.
    This endpoint verifies the QStash signature for security.
    
    Args:
        request: The FastAPI request object containing the task data
        upstash_signature: The Upstash-Signature header for verification
        
    Returns:
        A response indicating the result of processing the task
    """
    start_time = time.time()
    
        # Log all headers for debugging
    print("=== Incoming Request Debug ===")
    print(f"All headers: {dict(request.headers)}")
    print(f"Upstash signature: {upstash_signature}")
    print(f"Request URL: {request.url}")
    print(f"Request method: {request.method}")
    
    # Get the raw request body for signature verification
    body = await request.body()
    request_url = str(request.url)
    
    # Verify the QStash signature
    if not verify_qstash_signature(upstash_signature, body, request_url):
        return Response(
            content=json.dumps({"error": "Invalid signature"}),
            status_code=401,
            media_type="application/json"
        )
    
    # Parse the task data
    try:
        task_data = await request.json()
    except Exception as e:
        logfire.error("Failed to parse JSON from QStash request", error=str(e))
        return Response(
            content=json.dumps({"error": "Invalid JSON payload"}),
            status_code=400,
            media_type="application/json"
        )
    
    # Extract the necessary fields
    try:
        chat_id = task_data.get("chat_id")
        request_id = task_data.get("request_id")
        user_prompt = task_data.get("user_prompt")
        
        # Handle both old and new message formats
        dashboard_id = task_data.get("dashboard_id")
        file_id = task_data.get("file_id")  # Legacy support
        context_widget_ids = task_data.get("contextWidgetIds")
        target_widget_type = task_data.get("targetWidgetType")
        
        # Legacy fields
        is_follow_up = task_data.get("is_follow_up", False)
        # Removed last_widget_id logic - always create new widgets
        widget_type = task_data.get("widget_type")
        
        # Check required fields based on message type
        if dashboard_id:
            # New dashboard-centric message
            required_fields = ["chat_id", "request_id", "dashboard_id", "user_prompt"]
            missing = [field for field, value in {
                "chat_id": chat_id, 
                "request_id": request_id,
                "dashboard_id": dashboard_id,
                "user_prompt": user_prompt
            }.items() if not value]
        else:
            # Legacy file-based message
            required_fields = ["chat_id", "request_id", "file_id", "user_prompt"]
            missing = [field for field, value in {
                "chat_id": chat_id, 
                "request_id": request_id,
                "file_id": file_id,
                "user_prompt": user_prompt
            }.items() if not value]
        
        if missing:
            logfire.error(f"Missing required fields in task: {missing}", request_id=request_id)
            return Response(
                content=json.dumps({"error": f"Missing required fields: {missing}"}),
                status_code=400,
                media_type="application/json"
            )
            
        # Log the task we're about to process
        logfire.info(
            "Processing analysis task from QStash",
            request_id=request_id,
            chat_id=chat_id,
            file_id=file_id
        )
        
        # Update job status to processing (if Redis is available)
        task_id = task_data.get("task_id", request_id)
        user_id_from_task = task_data.get("user_id")
        
        try:
            # Create job if it doesn't exist (for backward compatibility)
            if user_id_from_task and dashboard_id:
                create_job(
                    job_id=task_id,
                    user_id=user_id_from_task,
                    dashboard_id=dashboard_id
                )
            
            update_job_status(task_id, "processing", progress=10)
            logfire.info(f"Job {task_id} status updated to processing")
        except Exception as job_error:
            logfire.warn(f"Failed to update job status: {job_error}")
            # Continue without job tracking
        
        # Call the appropriate analysis function based on message type
        if dashboard_id:
            # Dashboard-centric processing using existing agentic flow
            logfire.info(f"Processing dashboard chat request for dashboard {dashboard_id}")
            
            # Update progress: Starting analysis
            try:
                update_job_status(task_id, "processing", progress=20)
            except Exception as e:
                logfire.warn(f"Failed to update job progress: {e}")
            
            # Get files associated with this dashboard to use existing agentic flow
            try:
                dashboard_files_result = supabase.table("files").select("id").eq("dashboard_id", dashboard_id).limit(1).execute()
                
                if dashboard_files_result.data and len(dashboard_files_result.data) > 0:
                    # Use the first file associated with the dashboard
                    dashboard_file_id = dashboard_files_result.data[0]["id"]
                    logfire.info(f"Using file {dashboard_file_id} from dashboard {dashboard_id} for agentic processing")
                    
                    # Update progress: Processing request
                    try:
                        update_job_status(task_id, "processing", progress=40)
                    except Exception as e:
                        logfire.warn(f"Failed to update job progress: {e}")
                    
                    # Use existing agentic flow with dashboard context
                    result = await process_user_request(
                        chat_id=chat_id,
                        request_id=request_id,
                        file_id=dashboard_file_id,
                        user_prompt=user_prompt,
                        is_follow_up=False,
                        widget_type=target_widget_type,
                        duck_connection=duck_connection,
                        supabase_client=supabase,
                        dashboard_id=dashboard_id,
                        context_widget_ids=context_widget_ids,
                        target_widget_type=target_widget_type
                    )
                    
                    # Add dashboard context to result
                    result["dashboard_id"] = dashboard_id
                    result["contextWidgetIds"] = context_widget_ids
                    result["targetWidgetType"] = target_widget_type
                    
                else:
                    # No files associated with dashboard - create a helpful response
                    logfire.warn(f"No files found for dashboard {dashboard_id}")
                    result = {
                        "answer": f"I'd like to help you create widgets for dashboard {dashboard_id}, but I need some data files to work with. Please upload a data file to this dashboard first, then I can analyze it and create meaningful visualizations based on your request.",
                        "request_id": request_id,
                        "chat_id": chat_id,
                        "dashboard_id": dashboard_id
                    }
                    
            except Exception as e:
                error_msg = str(e)
                logfire.error(f"Error processing dashboard request: {error_msg}", 
                            dashboard_id=dashboard_id,
                            file_id=dashboard_file_id if 'dashboard_file_id' in locals() else None,
                            error_type=type(e).__name__)
                
                # Provide more specific error messages based on the error type
                if "utf-8" in error_msg.lower() or "encoding" in error_msg.lower():
                    user_message = "I encountered an encoding issue with your data file. Please ensure your CSV file is saved with UTF-8 encoding, or try re-uploading the file."
                elif "file" in error_msg.lower() and "not found" in error_msg.lower():
                    user_message = "I couldn't find the data file for this dashboard. Please make sure you've uploaded a CSV file to this dashboard."
                else:
                    user_message = "I encountered an error while processing your request. Please try again, or check if your data file is properly formatted."
                
                result = {
                    "answer": user_message,
                    "request_id": request_id,
                    "chat_id": chat_id,
                    "dashboard_id": dashboard_id
                }
        else:
            # Legacy file-based processing
            result = await process_user_request(
                chat_id=chat_id,
                request_id=request_id,
                file_id=file_id,
                user_prompt=user_prompt,
                is_follow_up=is_follow_up,
                widget_type=widget_type,
                duck_connection=duck_connection,
                supabase_client=supabase
            )
        
        processing_time = time.time() - start_time
        
        logfire.info(
            "Task processed successfully", 
            request_id=request_id,
            processing_time=processing_time,
            has_chart=result.get("chart_id") is not None
        )
        
        # Construct the message payload for append_chat_message
        chat_message_payload = {
            "role": "system", # Or "assistant"
            "content": result.get("answer", "Analysis complete."),
            "created_at": datetime.now().isoformat(),
            "request_id": request_id,
        }
        
        # Handle both single and multiple widgets
        if result.get("widget_id"):
            chat_message_payload["chart_id"] = result.get("widget_id")
        elif result.get("widget_ids"):
            # For multiple widgets, store the first one as chart_id for backward compatibility
            # and store all widget IDs
            chat_message_payload["chart_id"] = result.get("widget_ids")[0]
            chat_message_payload["widget_ids"] = result.get("widget_ids")
        
        # Update progress: Saving results
        try:
            update_job_status(task_id, "processing", progress=90)
        except Exception as e:
            logfire.warn(f"Failed to update job progress: {e}")
        
        # Send message to the chat
        await append_chat_message(chat_id, chat_message_payload)
        
        # Trigger dashboard refresh if this was a dashboard-centric request
        widget_created = result.get("widget_id") or result.get("widget_ids")
        if dashboard_id and (widget_created or result.get("widget_operations")):
            operation_type = "widgets_created" if widget_created else "widget_operations"
            await trigger_dashboard_refresh(dashboard_id, supabase, operation_type)
        
        # Mark job as completed - this triggers Supabase Realtime event
        try:
            complete_job(task_id, {
                "widget_id": result.get("widget_id"),
                "widget_ids": result.get("widget_ids"),
                "answer": result.get("answer"),
                "request_id": request_id,
                "chat_id": chat_id,
                "dashboard_id": dashboard_id
            })
            logfire.info(f"Job {task_id} marked as completed - Realtime event triggered")
        except Exception as job_error:
            logfire.warn(f"Failed to mark job as completed: {job_error}")
            # Continue without job tracking
        
        return Response(
            content=json.dumps({"success": True, "request_id": request_id}),
            status_code=200,
            media_type="application/json"
        )
        
    except Exception as e:
        error_message = str(e)
        request_id = task_data.get("request_id", "unknown")
        chat_id = task_data.get("chat_id")
        task_id = task_data.get("task_id", request_id)
        
        # Mark job as failed (if Redis is available)
        try:
            fail_job(task_id, error_message)
            logfire.info(f"Job {task_id} marked as failed")
        except Exception as job_error:
            logfire.warn(f"Failed to mark job as failed: {job_error}")
            # Continue without job tracking
        
        logfire.error(
            "Error processing task from QStash",
            request_id=request_id,
            chat_id=chat_id,
            error=error_message,
            error_type=type(e).__name__
        )
        
        # If we have a chat_id, send an error message
        if chat_id:
            try:
                # Provide more specific error messages based on error type
                if "file" in error_message.lower() and "not found" in error_message.lower():
                    error_content = "I couldn't find the data file for this request. Please make sure you've uploaded a CSV file to this dashboard."
                elif "encoding" in error_message.lower() or "utf-8" in error_message.lower():
                    error_content = "I encountered an encoding issue with your data file. Please ensure your CSV file is saved with UTF-8 encoding, or try re-uploading the file."
                elif "timeout" in error_message.lower() or "rate" in error_message.lower():
                    error_content = "The AI service is experiencing high load. Please try again in a few moments."
                elif "sql" in error_message.lower() or "query" in error_message.lower():
                    error_content = "I had trouble understanding your request in the context of your data. Could you please rephrase your question or be more specific about what you'd like to see?"
                else:
                    error_content = f"I encountered an unexpected error while processing your request. The technical details: {error_message[:100]}... Please try again or contact support if the issue persists."
                
                await append_chat_message(chat_id, {
                    "role": "assistant", 
                    "content": error_content,
                    "created_at": datetime.now().isoformat(), 
                    "request_id": request_id, 
                    "error": True,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as notify_err:
                logfire.error(f"Failed to send error notification: {notify_err}")
        
        # Return a 500 status to trigger QStash retry logic
        return Response(
            content=json.dumps({
                "error": error_message,
                "detail": "Failed to enqueue analysis task. Please try again."
            }),
            status_code=500,
            media_type="application/json"
        )

@app.post("/compute_chart_spec_data", response_model=ChartSpecResponse)
async def compute_chart_spec_data(
    request: Request,
) -> ChartSpecResponse:
    """
    Computes chart data based on chart specifications.
    
    Args:
        request: The request containing chart_id and file_id in the body
        
    Returns:
        The chart data response with success status and data if successful.
    """
    start_time = time.time()
    
    # Parse the request body
    request_data = await request.json()
    print("request_data: ", request_data)
    
    
    chart_id = request_data.get("chart_id")
    file_id = request_data.get("file_id")
    
    if not chart_id or not file_id:
        raise HTTPException(status_code=400, detail="chart_id and file_id are required")
    
    print("chart_id: ", chart_id)
    print("file_id: ", file_id)
    
    # Log the incoming request
    logfire.info(
        "Chart spec data request received",
        file_id=file_id,
        chart_id=chart_id
    )
    
    logfire.info("Chart ID: ", chart_id=chart_id)

    try:
        # Get the data using the utility function
        data_df = get_data(
            file_id=file_id, 
            widget_id=chart_id,
            supabase=get_supabase_client(),
            duck_connection=get_db_connection()
        )
                
        if data_df.empty:
            logfire.warn(
                "No data returned from get_data",
                file_id=file_id,
                widget_id=chart_id
            )
            return ChartSpecResponse(
                chart_specs={}
            )
        
        widget_specs = await get_widget_specs(
            widget_id=chart_id,
            supabase=get_supabase_client()
        )
        

        if widget_specs["chartType"] == "pie":
            # x_key = list(widget_specs["chartConfig"].keys())[0]
            x_key = widget_specs["xAxisConfig"]["dataKey"]
            data_cols = data_df[x_key].unique()
            y_col = widget_specs["dataColumn"]

            chart_config = {}
            for i, col in enumerate(data_cols):
                chart_config[col] = {
                    "color": widget_specs["colors"][i % len(widget_specs["colors"])]
                }
            widget_specs["chartConfig"] = chart_config

            # Update chart specs in the database
            chart_data = await convert_data_to_chart_data_1d(
                data_df,
                data_cols,
                x_key,
                y_col
            )

            widget_specs["data"] = chart_data

            row_count = len(widget_specs["data"])

        elif widget_specs["chartType"] == "table":
            data_cols = list(widget_specs["columns"])
            x_key = ""

            # Update chart specs in the database
            chart_data = await convert_data_to_chart_data(
                data_df,
                data_cols,
                x_key
            )

            widget_specs["data"] = chart_data

            row_count = len(widget_specs["data"])

        elif widget_specs["chartType"] != "kpi":
            logfire.info(
            f"{widget_specs['chartType']} chart under preparation",
            specs=widget_specs,
            processing_time=time.time() - start_time
            )
            data_cols = list(widget_specs["chartConfig"].keys())
            x_key = widget_specs["xAxisConfig"]["dataKey"]

            # Update chart specs in the database
            chart_data = await convert_data_to_chart_data(
                data_df,
                data_cols,
                x_key
            )
            
            widget_specs["data"] = chart_data
            
            row_count = len(widget_specs["data"])

            print("widget_specs: ", widget_specs)
        
        else:
            data_cur = data_df
            data_col = widget_specs["dataColumn"]
            
            logfire.info(
            "KPI card under preparation",
            data_cur_col=data_cur.columns,
            data_col=data_col,
            data_iloc=data_cur.iloc[0][data_col],
            specs=widget_specs,
            processing_time=time.time() - start_time
            )

            # Handle change column
            if "changeColumn" in widget_specs.keys():
                change_col = widget_specs["changeColumn"]
            else: 
                change_col = None

            print("change_col: ", change_col)
            if change_col:
                logfire.info("KPI Change col exists!", 
                    change_col=change_col)
                change_value = data_cur.iloc[0][change_col]
                
                # Determine change direction using proper mapping
                if change_value > 0:
                    change_direction = "increase"
                elif change_value < 0:
                    change_direction = "decrease"
                else:
                    change_direction = "flat"
                
                # Store the change value as percentage (assuming it's already in percentage format)
                widget_specs["kpiChange"] = float(change_value)
                widget_specs["kpiChangeDirection"] = change_direction
                
                logfire.info("KPI Change calculated", 
                    change_value=change_value,
                    change_direction=change_direction)
            else:
                # Try to calculate percentage change if we have period data
                if "kpiCalculateChange" in widget_specs and widget_specs["kpiCalculateChange"]:
                    try:
                        # Check if we have multiple rows for comparison
                        if len(data_cur) >= 2:
                            current_value = data_cur.iloc[0][data_col]
                            previous_value = data_cur.iloc[1][data_col]
                            
                            if previous_value != 0:
                                change_percentage = ((current_value - previous_value) / previous_value) * 100
                                
                                if change_percentage > 0:
                                    change_direction = "increase"
                                elif change_percentage < 0:
                                    change_direction = "decrease"
                                else:
                                    change_direction = "flat"
                                
                                widget_specs["kpiChange"] = float(change_percentage)
                                widget_specs["kpiChangeDirection"] = change_direction
                                
                                logfire.info("Auto-calculated KPI change", 
                                    current_value=current_value,
                                    previous_value=previous_value,
                                    change_percentage=change_percentage,
                                    change_direction=change_direction)
                    except Exception as e:
                        logfire.error("Failed to auto-calculate KPI change", error=str(e))
            
            # Set the main KPI value
            widget_specs["kpiValue"] = data_cur.iloc[0][data_col]

            logfire.info(
            "KPI card final specs",
            data_cur_col=data_cur.columns,
            data_cur=data_cur,
            data_col=data_col,
            specs=widget_specs,
            processing_time=time.time() - start_time
            )

            row_count = 1


                
        logfire.info(
            "Chart spec data computed successfully",
            widget_id=chart_id,
            row_count=row_count,
            processing_time=time.time() - start_time,
            chart_specs=widget_specs
        )
        
        return ChartSpecResponse(
            chart_specs=widget_specs
        )
        
    except Exception as e:
        logfire.error(
            "Error computing chart spec data",
            widget_id=chart_id,
            error=str(e),
            error_type=type(e).__name__,
            processing_time=time.time() - start_time
        )
        
        # Return empty chart specs on error
        return ChartSpecResponse(
            chart_specs={}
        )

@app.post("/generate-title", response_model=TitleGenerationResponse)
async def generate_title(
    request: TitleGenerationRequest,
) -> TitleGenerationResponse:
    """
    Generates a title based on the user's query and dataset information using an AI agent.
    
    Args:
        request: The request containing query, column names, chat_id, and user_id
        
    Returns:
        A response containing the generated title.
    """
    start_time = time.time()
    
    # Log the incoming request
    logfire.info(
        "Title generation request received",
        chat_id=request.chat_id,
        user_id=request.user_id,
        query=request.query[:50],  # Log first 50 chars of query
        column_count=len(request.column_names)
    )
    
    generated_title = ""
    try:
        # Prepare the prompt for the LLM agent
        prompt_for_agent = (
    f"USER QUERY: '{request.query}'\n"
    f"DATASET COLUMNS: {', '.join(request.column_names) if request.column_names else 'N/A'}\n\n"
    "INSTRUCTIONS:\n"
    "Generate a concise, specific title (maximum 5 words) that captures the essential purpose of this data analysis.\n"
    "- Focus on the core analytical goal or insight the user is seeking\n"
    "- Include relevant data dimension or metric when appropriate\n"
    "- Use concrete, specific terms rather than generic words like 'Analysis' or 'Data'\n"
    "- Prioritize action-oriented or insight-focused wording\n"
    "- Make the title informative and engaging\n\n"
    "TITLE:"
)

        # Call the title generation agent
        agent_response = await title_agent.run(prompt_for_agent)
        
        if agent_response and agent_response.output and agent_response.output.title:
            generated_title = agent_response.output.title.strip()
            # Ensure the title is not more than 5 words
            title_words = generated_title.split()
            if len(title_words) > 5:
                generated_title = " ".join(title_words[:5])
        
        # If title is too long (character wise, though word limit should handle this), truncate it
        if len(generated_title) > 60: # Max length for Supabase column or general display
            generated_title = generated_title[:57] + "..."
        
        # Handle empty title case or if agent failed
        if not generated_title:
            logfire.warn(
                "AI agent failed to generate a title or returned empty. Using fallback.",
                chat_id=request.chat_id
            )
            # Fallback to a simpler heuristic or a default title
            prompt_words = request.query.strip().lower().split()
            important_words = [word.capitalize() for word in prompt_words if len(word) > 3 and word not in 
                             ['what', 'when', 'where', 'which', 'how', 'could', 'would', 'should', 'about', 'using']]
            if len(important_words) < 2 and request.column_names:
                column_words = [col.replace('_', ' ').title() for col in request.column_names[:2]]
                important_words.extend(column_words)
            
            title_components = important_words[:5]
            if title_components:
                generated_title = " ".join(title_components)
                # Ensure fallback is also max 5 words and meets length constraints
                title_words = generated_title.split()
                if len(title_words) > 5:
                    generated_title = " ".join(title_words[:5])
                if len(generated_title) > 60:
                     generated_title = generated_title[:57] + "..."
            else:
                generated_title = f"Analysis {datetime.now().strftime('%b %d')}"

        # Final check for empty title
        if not generated_title:
            generated_title = f"Data Insight {datetime.now().strftime('%H:%M')}"

        # Update chat title in database
        try:
            supabase.table("chats").update({"title": generated_title}).eq("id", request.chat_id).execute()
            logfire.info("Chat title updated in database", chat_id=request.chat_id, title=generated_title)
        except Exception as db_error:
            logfire.warning(
                "Failed to update chat title in database, continuing anyway",
                chat_id=request.chat_id,
                error=str(db_error)
            )
        
        processing_time = time.time() - start_time
        logfire.info(
            "Title generated successfully",
            chat_id=request.chat_id,
            title=generated_title,
            processing_time=processing_time,
            method="AI Agent" if agent_response and agent_response.output and agent_response.output.title else "Fallback Heuristic"
        )
        
        return TitleGenerationResponse(
            title=generated_title,
            chat_id=request.chat_id
        )
        
    except Exception as e:
        error_message = str(e)
        
        logfire.error(
            "Error generating title with AI Agent",
            chat_id=request.chat_id,
            error=error_message,
            error_type=type(e).__name__,
            processing_time=time.time() - start_time
        )
        
        # Return a fallback title on error
        fallback_title = f"Data Analysis {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        # Try to update the title in the database with the fallback
        try:
            supabase.table("chats").update({"title": fallback_title}).eq("id", request.chat_id).execute()
        except Exception as db_err_fallback:
            logfire.error(
                "Failed to update chat title in database with fallback title after error",
                chat_id=request.chat_id,
                error=str(db_err_fallback)
            )
            pass 
        
        return TitleGenerationResponse(
            title=fallback_title,
            chat_id=request.chat_id
        )

# Add your existing endpoints here

@app.get("/")
async def root():
    logfire.info("Root endpoint accessed")
    return {"message": "GenAI DataVis API is running"}

# Add a health check endpoint for monitoring
@app.get("/health")
async def health_check():
    # Check database connections
    db_healthy = True
    supabase_healthy = True
    qstash_healthy = qstash_client is not None
    
    try:
        # Try a simple query on DuckDB
        duck_connection.execute("SELECT 1").fetchone()
    except Exception as e:
        db_healthy = False
        logfire.error("DuckDB health check failed", error=str(e))
    
    try:
        # Try a simple query on Supabase
        supabase.table("widgets").select("id").limit(1).execute()
    except Exception as e:
        supabase_healthy = False
        logfire.error("Supabase health check failed", error=str(e))
    
    status = "healthy" if db_healthy and supabase_healthy and qstash_healthy else "unhealthy"
    
    logfire.info(
        "Health check", 
        status=status, 
        db_healthy=db_healthy, 
        supabase_healthy=supabase_healthy,
        qstash_healthy=qstash_healthy
    )
    
    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "database": "healthy" if db_healthy else "unhealthy",
        "supabase": "healthy" if supabase_healthy else "unhealthy",
        "qstash": "healthy" if qstash_healthy else "unhealthy",
    }

# Add OPTIONS route handler for CORS preflight requests
@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request):
    response = Response()
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)