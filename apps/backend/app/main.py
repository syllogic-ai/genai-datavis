from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Fix imports to be correct based on the package structure
from services.ai_service import AIService
from utils.utils import validate_data, get_insights, visualize, agentic_flow

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

# Initialize the AI service
ai_service = AIService()

# Store the latest analysis results
latest_analysis_results = {}

@app.post("/analyze")
async def analyze(request: Request):
    body = await request.json()
    data = body.get("data", None)
    user_query = body.get("prompt", None)
    session_id = body.get("session_id", "default")
    is_follow_up = body.get("is_follow_up", False)
    
    if not user_query:
        user_query = "What insights can you provide based on the given dataframe?"

    # For follow-up questions
    if is_follow_up:
        # Check if we have previous analysis for this session
        if session_id not in latest_analysis_results:
            raise HTTPException(
                status_code=400, 
                detail="No previous analysis found for this session. Please upload data first."
            )
            
        # Use stored analysis results for follow-up without requiring data
        previous_analysis = latest_analysis_results[session_id]
        print(f"Follow-up query for session {session_id}: {user_query}")
        
        # Convert data to DataFrame if provided, otherwise use None
        df = pd.DataFrame(data) if data else None
        
        # Call agentic_flow with is_follow_up=True flag and previous analysis
        agentic_output = agentic_flow(
            df, 
            user_query, 
            ai_service, 
            is_follow_up=True, 
            previous_analysis=previous_analysis
        )
    elif not data:
        # If not a follow-up and no data provided
        raise HTTPException(status_code=400, detail="No data provided")
    else:
        # Initial analysis of new data
        df = pd.DataFrame(data)
        print(f"Initial analysis for session {session_id}: {user_query}")
        agentic_output = agentic_flow(df, user_query, ai_service)
    
    # Store the analysis results for this session
    latest_analysis_results[session_id] = agentic_output
    print(f"Stored analysis results for session {session_id}")

    return jsonable_encoder(agentic_output)

@app.post("/debug/chat-with-analysis")
async def debug_chat_with_analysis(request: Request):
    """Debug endpoint to test chat with predefined analysis results"""
    body = await request.json()
    prompt = body.get("prompt", None)
    
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    # Use predefined analysis results for testing
    test_analysis = {
        "validation": "Data is valid with no missing values",
        "insights": "The max value in the data is 9998.0.",
        "calculate": {
            "MAX(AEP_MW)": {
                "0": "9998.0"
            }
        },
        "visual": ""
    }
    
    # Call agentic_flow with follow-up flag and predefined analysis
    response_dict = agentic_flow(
        None,  # No data needed for follow-up
        prompt,
        ai_service,
        is_follow_up=True,
        previous_analysis=test_analysis
    )
    
    return jsonable_encoder(response_dict)