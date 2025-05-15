from apps.backend.tools.calculate import process_user_request
from apps.backend.utils.chat import append_chat_message, get_chart_specs, convert_data_to_chart_data
from apps.backend.utils.files import fetch_dataset
from apps.backend.utils.utils import get_data
from fastapi import FastAPI, HTTPException, Request, Response, Depends, Header
from pydantic import BaseModel
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

# Load environment variables
load_dotenv()

# Import QStash utilities (replacing Redis)
from apps.backend.utils.qstash_queue import enqueue_task, verify_qstash_signature, qstash_client

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the configuration module for Logfire
from apps.backend.core.config import configure_logfire

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

# Request model for the analysis endpoint
class AnalysisRequest(BaseModel):
    """Request model for the analysis endpoint."""
    prompt: str
    file_id: str
    chat_id: str
    request_id: str
    is_follow_up: bool = False
    last_chart_id: Optional[str] = None

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

ANALYSIS_QUEUE_NAME = "analysis_tasks"

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
        has_last_chart=request.last_chart_id is not None
    )
    
    # Prepare task data
    task_data = {
        "chat_id": request.chat_id,
        "request_id": request.request_id,
        "file_id": request.file_id,
        "user_prompt": request.prompt,
        "is_follow_up": request.is_follow_up,
        "last_chart_id": request.last_chart_id,
        "received_at": datetime.now().isoformat()
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
        file_id = task_data.get("file_id")
        user_prompt = task_data.get("user_prompt")
        is_follow_up = task_data.get("is_follow_up", False)
        last_chart_id = task_data.get("last_chart_id")
        
        if not all([chat_id, request_id, file_id, user_prompt]):
            missing = [field for field, value in {
                "chat_id": chat_id, 
                "request_id": request_id,
                "file_id": file_id,
                "user_prompt": user_prompt
            }.items() if not value]
            
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
        
        # Call the main analysis function
        result = await process_user_request(
            chat_id=chat_id,
            request_id=request_id,
            file_id=file_id,
            user_prompt=user_prompt,
            is_follow_up=is_follow_up,
            last_chart_id=last_chart_id,
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
        if result.get("chart_id"):
            chat_message_payload["chart_id"] = result.get("chart_id")
        
        # Send message to the chat
        await append_chat_message(chat_id, chat_message_payload)
        
        return Response(
            content=json.dumps({"success": True, "request_id": request_id}),
            status_code=200,
            media_type="application/json"
        )
        
    except Exception as e:
        error_message = str(e)
        request_id = task_data.get("request_id", "unknown")
        chat_id = task_data.get("chat_id")
        
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
                error_content = f"Sorry, an unexpected error occurred while processing your request (ID: {request_id}). Please try again later."
                await append_chat_message(chat_id, {
                    "role": "system", 
                    "content": error_content,
                    "created_at": datetime.now().isoformat(), 
                    "request_id": request_id, 
                    "error": True
                })
            except Exception as notify_err:
                logfire.error(f"Failed to send error notification: {notify_err}")
        
        # Return a 500 status to trigger QStash retry logic
        return Response(
            content=json.dumps({"error": error_message}),
            status_code=500,
            detail="Failed to enqueue analysis task. Please try again."
        )

@app.post("/compute_chart_spec_data", response_model=ChartSpecResponse)
async def compute_chart_spec_data(
    chart_id: str,
    file_id: str,
) -> ChartSpecResponse:
    """
    Computes chart data based on chart specifications.
    
    Args:
        chart_id: The ID of the chart
        file_id: The ID of the file
        
    Returns:
        The chart data response with success status and data if successful.
    """
    start_time = time.time()
    
    # Log the incoming request
    logfire.info(
        "Chart spec data request received",
        file_id=request.file_id,
        chart_id=request.chart_id
    )
    
    try:
        # Get the data using the utility function
        data_df = get_data(
            file_id=request.file_id, 
            chart_id=request.chart_id,
            supabase=get_supabase_client(),
            duck_connection=get_db_connection()
        )
        
        if data_df.empty:
            logfire.warn(
                "No data returned from get_data",
                file_id=request.file_id,
                chart_id=request.chart_id
            )
            return ChartSpecResponse(
                chart_specs=chart_specs
            )
        
        chart_specs = get_chart_specs(
            chart_id=chart_id,
            supabase=get_supabase_client()
        )

        if chart_specs["chartType"] != "kpi":
            data_cols = list(chart_specs["chartConfig"].keys())
            x_key = chart_specs["xAxisConfig"]["dataKey"]

            # Update chart specs in the database
            chart_specs = await convert_data_to_chart_data(
                data_df,
                data_cols,
                x_key
            )
        
        
        logfire.info(
            "Chart spec data computed successfully",
            chat_id=request.chat_id,
            chart_id=request.chart_id,
            row_count=len(chart_specs["data"]),
            processing_time=time.time() - start_time
        )
        
        return ChartSpecResponse(
            chart_specs=chart_specs
        )
        
    except Exception as e:
        logfire.error(
            "Error computing chart spec data",
            chart_id=request.chart_id,
            error=str(e),
            error_type=type(e).__name__,
            processing_time=time.time() - start_time
        )
        
        return ChartSpecResponse(
            chart_specs=chart_specs
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
        supabase.table("charts").select("id").limit(1).execute()
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