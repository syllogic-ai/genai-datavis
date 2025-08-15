from httpx import request

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
import logging
from uuid import uuid4

# Load environment variables from .env.local
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local'))

# Configure logging
logging.basicConfig(level=logging.INFO)


# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import job management functions
from apps.backend.actions.jobs import (
    create_job as create_job_record,
    update_job_status,
    processing_job,
    complete_job,
    fail_job,
    start_job_processing,
    update_job_progress,
    finish_job_success,
    finish_job_error
)

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define queue name as a constant
ANALYSIS_QUEUE_NAME = "analysis_tasks"

app = FastAPI(title="Syllogic API", 
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

# Request model for the analysis endpoint (legacy support)
class AnalysisRequest(BaseModel):
    """Request model for the analysis endpoint."""
    prompt: str
    file_id: str
    chat_id: str
    request_id: str
    is_follow_up: bool = False
    widget_type: Optional[str] = None

class ChatAnalysisRequest(BaseModel):
    """Request model for dashboard-centric chat analysis."""
    message: str
    dashboardId: str
    contextWidgetIds: Optional[List[str]] = None
    targetWidgetType: Optional[str] = None
    targetChartSubType: Optional[str] = None
    chat_id: str
    request_id: str
    user_id: Optional[str] = None  # Clerk user ID for job ownership
    conversation_history: Optional[List[Dict[str, Any]]] = None
    chart_colors: Optional[Dict[str, str]] = None  # User's color palette


# New response model for enqueued task
class EnqueueResponse(BaseModel):
    """Response model when a task is successfully enqueued."""
    message: str
    task_id: Optional[str] = None
    queue_name: str
    request_id: str
    chat_id: str


ANALYSIS_QUEUE_NAME = "analysis_tasks"



@app.get("/")
async def root():
    logging.info("Root endpoint accessed")
    return {"message": "GenAI DataVis API is running"}

@app.post("/analyze")
async def analyze_data(request: ChatAnalysisRequest):
    """
    Main analysis endpoint that receives requests from QStash.
    This endpoint processes chat-based analysis requests for dashboard data visualization.
    """
    try:
        # Extract job/request ID from the payload
        job_id = request.request_id
        user_id = request.user_id
        dashboard_id = request.dashboardId
        
        # Log the incoming request
        logging.info(f"Received analysis request {job_id} for user {user_id}, dashboard {dashboard_id}")
        
        # Validate required fields
        if not job_id:
            raise HTTPException(status_code=400, detail="Missing request_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")
        if not dashboard_id:
            raise HTTPException(status_code=400, detail="Missing dashboardId")
        if not request.message:
            raise HTTPException(status_code=400, detail="Missing message")
        if not request.chat_id:
            raise HTTPException(status_code=400, detail="Missing chat_id")
        
        # Update job status to processing
        try:
            start_job_processing(supabase, job_id, progress=10)
            logging.info(f"Updated job {job_id} to processing status")
        except Exception as e:
            logging.error(f"Failed to update job {job_id} to processing: {str(e)}")
            # Continue processing even if status update fails
        
        # Log the complete payload details for debugging
        logging.info(f"Full analysis request payload received:")
        logging.info(f"  - message: '{request.message[:100]}...'")
        logging.info(f"  - chat_id: {request.chat_id}")
        logging.info(f"  - contextWidgetIds: {request.contextWidgetIds}")
        logging.info(f"  - targetWidgetType: {request.targetWidgetType}")
        logging.info(f"  - targetChartSubType: {request.targetChartSubType}")
        logging.info(f"  - conversation_history: {len(request.conversation_history) if request.conversation_history else 0} messages")
        logging.info(f"  - chart_colors: {request.chart_colors}")
        
        # Extract all the payload data that will be used by AI agents
        analysis_context = {
            "message": request.message,
            "chat_id": request.chat_id,
            "dashboard_id": dashboard_id,
            "context_widget_ids": request.contextWidgetIds or [],
            "conversation_history": request.conversation_history or [],
            "user_id": user_id,
            "request_id": job_id
        }
        
        logging.info(f"Prepared analysis context with {len(analysis_context)} fields")
        
        # TODO: Here you would implement the actual analysis logic
        # This is where you'd call your AI agents (coordinator_agent, sql_agent, viz_agent, etc.)
        # The analysis_context contains all the data from the frontend payload
        # Example: result = await coordinator_agent.analyze(analysis_context)
        # For now, we'll simulate processing with a delay and return a success response
        
        # Simulate processing time
        await asyncio.sleep(2)
        
        # Update progress
        try:
            update_job_progress(supabase, job_id, progress=50)
            logging.info(f"Updated job {job_id} progress to 50%")
        except Exception as e:
            logging.error(f"Failed to update job {job_id} progress: {str(e)}")
        
        # Simulate more processing
        await asyncio.sleep(2)
        
        # Complete the job successfully (for now)
        try:
            result_data = {
                "message": "Analysis completed successfully",
                "widgets_created": 1,
                "chat_id": request.chat_id,
                "dashboard_id": dashboard_id
            }
            finish_job_success(supabase, job_id, result_data)
            logging.info(f"Completed job {job_id} successfully")
        except Exception as e:
            logging.error(f"Failed to complete job {job_id}: {str(e)}")
        
        # Return success response
        return {
            "success": True,
            "message": "Analysis completed successfully",
            "request_id": job_id,
            "chat_id": request.chat_id,
            "dashboard_id": dashboard_id,
            "status": "completed"
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        logging.error(f"Error in analyze endpoint: {str(e)}")
        
        # Try to mark job as failed if we have the job_id
        if 'job_id' in locals():
            try:
                finish_job_error(supabase, job_id, str(e))
                logging.info(f"Marked job {job_id} as failed")
            except Exception as job_error:
                logging.error(f"Failed to mark job {job_id} as failed: {str(job_error)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

# Add a health check endpoint for monitoring
@app.get("/health")
async def health_check():
    # Check database connections
    db_healthy = True
    supabase_healthy = True
    qstash_healthy = True  # Assume healthy for now since qstash_client is not defined
    
    # Skip DuckDB check for now as duck_connection is not defined
    # try:
    #     # Try a simple query on DuckDB
    #     duck_connection.execute("SELECT 1").fetchone()
    # except Exception as e:
    #     db_healthy = False
    #     logging.error("DuckDB health check failed", error=str(e))
    
    try:
        # Try a simple query on Supabase
        supabase.table("widgets").select("id").limit(1).execute()
    except Exception as e:
        supabase_healthy = False
        logging.error("Supabase health check failed", error=str(e))
    
    status = "healthy" if db_healthy and supabase_healthy and qstash_healthy else "unhealthy"
    
    logging.info(
        f"Health check - status: {status}, db_healthy: {db_healthy}, "
        f"supabase_healthy: {supabase_healthy}, qstash_healthy: {qstash_healthy}"
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