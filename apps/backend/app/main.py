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
            
        # Use stored analysis results for follow-up
        previous_analysis = latest_analysis_results[session_id]
        print(f"Follow-up query for session {session_id}: {user_query}")
        
        # Get the original data if it was stored with the analysis results
        df = None
        if "original_data" in previous_analysis:
            orig_data = previous_analysis["original_data"]
            if orig_data:
                # Convert stored data back to DataFrame
                df = pd.DataFrame(orig_data)
                print(f"Using original data for session {session_id}")
        
        # If no original data, use provided data if any
        if df is None and data:
            df = pd.DataFrame(data)
            print(f"Using provided data for follow-up query")
        
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
        
        # Store the original data with the analysis results
        agentic_output["original_data"] = data
        print(f"Stored original data with analysis results for session {session_id}")
    
    # Store the analysis results for this session
    latest_analysis_results[session_id] = agentic_output
    print(f"Stored analysis results for session {session_id}")

    # Remove original_data from the response to avoid large payloads
    response_output = {k: v for k, v in agentic_output.items() if k != "original_data"}
    return jsonable_encoder(response_output)

@app.post("/debug/chat-with-analysis")
async def debug_chat_with_analysis(request: Request):
    """Debug endpoint to test chat with predefined analysis results"""
    body = await request.json()
    prompt = body.get("prompt", None)
    
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    # Create sample data for the debug endpoint
    sample_data_list = [
        {"month": "2023-01", "sales": 100, "profits": 30}, 
        {"month": "2023-02", "sales": 150, "profits": 45}, 
        {"month": "2023-03", "sales": 120, "profits": 35}
    ]
    sample_data = pd.DataFrame(sample_data_list)
    
    # Use predefined analysis results for testing
    test_analysis = {
        "validation": "Data is valid with no missing values",
        "insights": "The max sales value is 150 in February.",
        "calculate": {
            "MAX(sales)": {
                "0": "150"
            }
        },
        "visual": "",
        "original_data": sample_data_list  # Store the original data
    }
    
    # Call agentic_flow with follow-up flag and predefined analysis
    response_dict = agentic_flow(
        sample_data,  # Provide the data as DataFrame
        prompt,
        ai_service,
        is_follow_up=True,
        previous_analysis=test_analysis
    )
    
    # Remove original_data from the response
    response_output = {k: v for k, v in response_dict.items() if k != "original_data"}
    return jsonable_encoder(response_output)

@app.get("/conversation_history")
async def get_conversation_history(session_id: str = "default"):
    """Get the conversation history for a given session"""
    # For testing/demonstration purposes, return a mock history
    # This would normally come from a ConversationManager instance
    
    mock_history = {
        "conversation_history": [
            {
                "role": "user",
                "content": "What insights can you provide from this data?",
                "timestamp": "2023-07-15T10:30:45"
            },
            {
                "role": "system",
                "content": "The data shows an upward trend in sales over the past quarter, with a peak in March.",
                "timestamp": "2023-07-15T10:30:50"
            },
            {
                "role": "user",
                "content": "Show me a visualization of the monthly trend.",
                "timestamp": "2023-07-15T10:31:15"
            },
            {
                "role": "system",
                "content": "Here's a line chart showing the monthly sales trend.",
                "timestamp": "2023-07-15T10:31:20"
            }
        ],
        "analysis_history": [
            {"insights": "Sales are trending upward", "visual": "line chart data"}
        ]
    }
    
    return jsonable_encoder(mock_history)