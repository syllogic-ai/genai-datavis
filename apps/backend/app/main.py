from httpx import request
from apps.backend.tools.llm_interaction import process_user_request
from apps.backend.utils.chat import append_chat_message, get_chart_specs, convert_data_to_chart_data, convert_data_to_chart_data_1d
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

# Load environment variables
load_dotenv()

# Import QStash utilities (replacing Redis)
from apps.backend.utils.qstash_queue import enqueue_task, verify_qstash_signature, qstash_client

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the configuration module for Logfire
from apps.backend.core.config import configure_logfire

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
    
    try:
        # Get the data using the utility function
        data_df = get_data(
            file_id=file_id, 
            chart_id=chart_id,
            supabase=get_supabase_client(),
            duck_connection=get_db_connection()
        )
                
        if data_df.empty:
            logfire.warn(
                "No data returned from get_data",
                file_id=file_id,
                chart_id=chart_id
            )
            return ChartSpecResponse(
                chart_specs={}
            )
        
        chart_specs = await get_chart_specs(
            chart_id=chart_id,
            supabase=get_supabase_client()
        )
        

        if chart_specs["chartType"] == "pie":
            # x_key = list(chart_specs["chartConfig"].keys())[0]
            x_key = chart_specs["xAxisConfig"]["dataKey"]
            data_cols = data_df[x_key].unique()
            y_col = chart_specs["dataColumn"]

            chart_config = {}
            for i, col in enumerate(data_cols):
                chart_config[col] = {
                    "color": chart_specs["colors"][i % len(chart_specs["colors"])]
                }
            chart_specs["chartConfig"] = chart_config

            # Update chart specs in the database
            chart_data = await convert_data_to_chart_data_1d(
                data_df,
                data_cols,
                x_key,
                y_col
            )

            chart_specs["data"] = chart_data

            row_count = len(chart_specs["data"])

        elif chart_specs["chartType"] == "table":
            data_cols = list(chart_specs["columns"])
            x_key = ""

            # Update chart specs in the database
            chart_data = await convert_data_to_chart_data(
                data_df,
                data_cols,
                x_key
            )

            chart_specs["data"] = chart_data

            row_count = len(chart_specs["data"])

        elif chart_specs["chartType"] != "kpi":
            logfire.info(
            f"{chart_specs['chartType']} chart under preparation",
            specs=chart_specs,
            processing_time=time.time() - start_time
            )
            data_cols = list(chart_specs["chartConfig"].keys())
            x_key = chart_specs["xAxisConfig"]["dataKey"]

            # Update chart specs in the database
            chart_data = await convert_data_to_chart_data(
                data_df,
                data_cols,
                x_key
            )
            
            chart_specs["data"] = chart_data
            
            row_count = len(chart_specs["data"])

            print("chart_specs: ", chart_specs)
        
        else:
            data_cur = data_df
            data_col = chart_specs["dataColumn"]
            
            logfire.info(
            "KPI card under preparation",
            data_cur_col=data_cur.columns,
            data_col=data_col,
            data_iloc=data_cur.iloc[0][data_col],
            specs=chart_specs,
            processing_time=time.time() - start_time
            )

            if "changeColumn" in chart_specs.keys():
                change_col = chart_specs["changeColumn"]
            else: 
                change_col = None

            print("change_col: ", change_col)
            if change_col:
                logfire.info("KPI Change col exists!", 
                    change_col=change_col)
                change_value = data_cur.iloc[0][change_col]
                change_direction = "up" if data_cur.iloc[0][change_col] > 0 else "down" if data_cur.iloc[0][change_col] < 0 else "flat"
                
                if change_value:
                    chart_specs["kpiChange"] = change_value / 100 # Assuming that the change calculated is %
                    chart_specs["kpiChangeDirection"] = change_direction
            else:
                change_direction = None
                change_value = None
            chart_specs["kpiValue"] = data_cur.iloc[0][data_col]

            logfire.info(
            "KPI card final specs",
            data_cur_col=data_cur.columns,
            data_cur=data_cur,
            data_col=data_col,
            specs=chart_specs,
            processing_time=time.time() - start_time
            )

            row_count = 1


                
        logfire.info(
            "Chart spec data computed successfully",
            chart_id=chart_id,
            row_count=row_count,
            processing_time=time.time() - start_time,
            chart_specs=chart_specs
        )
        
        return ChartSpecResponse(
            chart_specs=chart_specs
        )
        
    except Exception as e:
        logfire.error(
            "Error computing chart spec data",
            chart_id=chart_id,
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