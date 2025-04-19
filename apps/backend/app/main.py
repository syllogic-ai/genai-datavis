from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import os
from dotenv import load_dotenv
import requests
import io

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

# Add a utility function to fetch data from URL
async def fetch_csv_from_url(file_url):
    """Fetch CSV data from a URL and convert to pandas DataFrame."""
    try:
        response = requests.get(file_url)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        # Read CSV data from the response content
        return pd.read_csv(io.StringIO(response.text))
    except Exception as e:
        print(f"Error fetching data from URL: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch data from URL: {str(e)}")

@app.post("/analyze")
async def analyze(request: Request):
    body = await request.json()
    data = body.get("data", None)
    file_url = body.get("file_url", None)
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
        if "file_url" in previous_analysis:
            stored_url = previous_analysis["file_url"]
            try:
                # Fetch data from URL
                df = await fetch_csv_from_url(stored_url)
                print(f"Using data from URL for session {session_id}")
            except Exception as e:
                print(f"Error loading data from URL: {str(e)}")
        
        # If no data from URL, try original data if available
        if df is None and "original_data" in previous_analysis:
            orig_data = previous_analysis["original_data"]
            if orig_data:
                # Convert stored data back to DataFrame
                df = pd.DataFrame(orig_data)
                print(f"Using original data for session {session_id}")
        
        # If still no data, use provided data if any
        if df is None and data:
            df = pd.DataFrame(data)
            print(f"Using provided data for follow-up query")
        
        # If file_url is provided, try to fetch new data
        if df is None and file_url:
            try:
                df = await fetch_csv_from_url(file_url)
                print(f"Using new URL data for follow-up query")
            except Exception as e:
                print(f"Error loading new URL data: {str(e)}")
        
        # Call agentic_flow with is_follow_up=True flag and previous analysis
        agentic_output = agentic_flow(
            df, 
            user_query, 
            ai_service, 
            is_follow_up=True, 
            previous_analysis=previous_analysis
        )
    elif file_url:
        # Initial analysis with file URL
        try:
            df = await fetch_csv_from_url(file_url)
            print(f"Initial analysis using file URL for session {session_id}: {user_query}")
            agentic_output = agentic_flow(df, user_query, ai_service)
            
            # Store the file URL with the analysis results
            agentic_output["file_url"] = file_url
            print(f"Stored file URL with analysis results for session {session_id}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process file from URL: {str(e)}")
    elif data:
        # Initial analysis of direct data
        df = pd.DataFrame(data)
        print(f"Initial analysis for session {session_id}: {user_query}")
        agentic_output = agentic_flow(df, user_query, ai_service)
        
        # Store the original data with the analysis results
        agentic_output["original_data"] = data
        print(f"Stored original data with analysis results for session {session_id}")
    else:
        # If not a follow-up and no data provided
        raise HTTPException(status_code=400, detail="No data or file URL provided")
    
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
    file_url = body.get("file_url", None)
    
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    # Create sample data for the debug endpoint
    sample_data_list = [
        {"month": "2023-01", "sales": 100, "profits": 30}, 
        {"month": "2023-02", "sales": 150, "profits": 45}, 
        {"month": "2023-03", "sales": 120, "profits": 35}
    ]
    sample_data = pd.DataFrame(sample_data_list)
    
    # Try to fetch data from URL if provided
    if file_url:
        try:
            sample_data = await fetch_csv_from_url(file_url)
            print(f"Debug endpoint using data from URL: {file_url}")
        except Exception as e:
            print(f"Error loading debug data from URL, using sample data: {str(e)}")
    
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
        "original_data": sample_data_list,  # Store the original data
        "file_url": file_url  # Store the file URL if provided
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