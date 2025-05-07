from apps.backend.tools.calculate import process_user_request
from apps.backend.utils.chat import append_chat_message
from apps.backend.utils.files import fetch_dataset
from apps.backend.utils.utils import get_data
from fastapi import FastAPI, HTTPException, Request, Response, Depends
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
import logfire

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


# Load environment variables
load_dotenv()

# Initialize Logfire for observability
configure_logfire()

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# DuckDB setup
duck_connection = duckdb.connect(":memory:")

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

# Response model for the analysis endpoint
class AnalysisResponse(BaseModel):
    """Response model for the analysis endpoint."""
    answer: str
    request_id: str
    chat_id: str
    chart_id: Optional[str] = None
    insights: Optional[Dict[str, str]] = None

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_data(
    request: AnalysisRequest,
    supabase_client: Client = Depends(get_supabase_client),
    duck_connection: duckdb.DuckDBPyConnection = Depends(get_db_connection)
) -> Dict[str, Any]:
    """
    Process a natural language query against CSV data using the multi-agent system.
    
    Args:
        request: The analysis request containing prompt and context
        
    Returns:
        Analysis response containing answer, chart ID, and insights
    """
    start_time = time.time()
    
    # Log the incoming request
    logfire.info(
        "Analysis request received",
        chat_id=request.chat_id,
        request_id=request.request_id,
        file_id=request.file_id,
        prompt=request.prompt,
        is_follow_up=request.is_follow_up,
        has_last_chart=request.last_chart_id is not None
    )
    
    try:
        # Process the request using our multi-agent system
    
        
        result = await process_user_request(
            chat_id=request.chat_id,
            request_id=request.request_id,
            file_id=request.file_id,
            user_prompt=request.prompt,
            is_follow_up=request.is_follow_up,
            last_chart_id=request.last_chart_id,
            duck_connection=duck_connection,
            supabase_client=supabase_client
        )
        
        message = { 
            "role": "system",
            "content": result.get("answer"),
            "created_at": datetime.now().isoformat()
        }
        
        await append_chat_message(request.chat_id, message)
        
        # Log successful processing
        end_time = time.time()
        logfire.info(
            "Analysis request processed successfully",
            chat_id=request.chat_id,
            request_id=request.request_id,
            has_chart=result.get("chart_id") is not None,
            has_insights=result.get("insights") is not None,
            response_length=len(result.get("answer", "")),
            processing_time=end_time - start_time
        )
        
        return result
        
    except Exception as e:
        # Log the error with Logfire
        end_time = time.time()
        logfire.error(
            "Error processing analysis request",
            chat_id=request.chat_id,
            request_id=request.request_id,
            file_id=request.file_id,
            error=str(e),
            error_type=type(e).__name__,
            processing_time=end_time - start_time
        )
        
        # Log the error to console
        print(f"Error processing analysis request: {str(e)}")
        
        # Raise HTTPException with appropriate status code
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
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
    
    status = "healthy" if db_healthy and supabase_healthy else "unhealthy"
    
    logfire.info("Health check", status=status, db_healthy=db_healthy, supabase_healthy=supabase_healthy)
    
    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "database": "healthy" if db_healthy else "unhealthy",
        "supabase": "healthy" if supabase_healthy else "unhealthy"
    }

# Add OPTIONS route handler for CORS preflight requests
@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request):
    response = Response()
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)