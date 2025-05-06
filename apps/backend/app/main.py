from apps.backend.utils.files import fetch_dataset
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
    from utils.enqueue import enqueue_prompt
    from utils.files import extract_schema_sample
except ImportError:
    print("Failed to import utility functions, trying alternative import path")
    # Try other import paths that might work
    try:
        from backend.utils.enqueue import enqueue_prompt
        from backend.utils.files import extract_schema_sample
    except ImportError:
        print("All import attempts for utility functions failed")

# Import the multi-agent system
try:
    from services.multi_agent import process_user_request
except ImportError:
    print("Failed to import multi_agent, trying alternative import path")
    try:
        from backend.services.multi_agent import process_user_request
    except ImportError:
        print("All import attempts for multi_agent failed")

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
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Logfire middleware to track all requests
@app.middleware("http")
async def logfire_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Create a span for the request
    with logfire.span(
        name="http_request",
        attributes={
            "http.method": request.method,
            "http.url": str(request.url),
            "http.client_ip": request.client.host if request.client else "unknown",
        }
    ):
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

# Helper function to get data from a chart
def get_data(file_id: str, chart_id: str) -> pd.DataFrame:
    """
    Get the data for a specific chart.
    
    Args:
        file_id: ID of the CSV file
        chart_id: ID of the chart
        
    Returns:
        DataFrame containing the chart data
    """
    start_time = time.time()
    logfire.info("Getting chart data", file_id=file_id, chart_id=chart_id)
    
    try:
        # 1. Get the SQL query for the chart
        chart_result = supabase.table("charts").select("sql").eq("id", chart_id).execute()
        
        if not chart_result.data or len(chart_result.data) == 0:
            logfire.warn("No chart found", chart_id=chart_id)
            print(f"No chart found with ID: {chart_id}")
            return pd.DataFrame()
            
        sql_query = chart_result.data[0].get("sql")
        
        if not sql_query:
            logfire.warn("No SQL query found", chart_id=chart_id)
            print(f"No SQL query found for chart ID: {chart_id}")
            return pd.DataFrame()
        
        # 2. Get the file data
        file_url = supabase.table("storage_path").select("*").eq("id", file_id).execute()
        
        file_data = fetch_dataset(file_url)
        
        # Log metrics about the data
        logfire.info(
            "Dataset loaded", 
            file_id=file_id,
            row_count=len(file_data) if file_data is not None else 0,
            column_count=len(file_data.columns) if file_data is not None else 0
        )
        
        # 4. Execute the SQL query
        # First, register the DataFrame as a table in DuckDB
        duck_connection.register("csv_data", file_data)
        
        # Execute the query
        result = duck_connection.execute(sql_query).fetchdf()
        
        # Log successful data retrieval
        end_time = time.time()
        logfire.info(
            "Chart data retrieved successfully",
            file_id=file_id,
            chart_id=chart_id,
            result_rows=len(result),
            result_columns=len(result.columns),
            execution_time=end_time - start_time
        )
        
        return result
        
    except Exception as e:
        # Log the error
        logfire.error(
            "Error getting chart data",
            file_id=file_id,
            chart_id=chart_id,
            error=str(e),
            error_type=type(e).__name__
        )
        print(f"Error getting data: {str(e)}")
        return pd.DataFrame()

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)