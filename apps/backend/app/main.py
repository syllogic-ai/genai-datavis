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
    
    if not data:
        return {"error": "No data provided"}, 400
    if not user_query:
        user_query = "What insights can you provide based on the given dataframe?"

    # Convert JSON data to a pandas DataFrame
    df = pd.DataFrame(data)
    # Validate the data
    print(f"user_query: {user_query}")
    agentic_output = agentic_flow(df, user_query, ai_service)
    
    # Store the analysis results for this session
    latest_analysis_results[session_id] = agentic_output
    print(f"Stored analysis results for session {session_id}")

    return jsonable_encoder(agentic_output)

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    prompt = body.get("prompt", None)
    data = body.get("data", None)
    analysis_results = body.get("analysis_results", None)
    session_id = body.get("session_id", "default")
    
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    # If analysis_results not provided but we have stored results for this session, use them
    if not analysis_results and session_id in latest_analysis_results:
        analysis_results = latest_analysis_results[session_id]
        print(f"Using stored analysis results for session {session_id}")
    
    # Create a comprehensive context from the analysis results
    context = "You are a data analysis assistant. Help analyze and explain the data."
    
    if analysis_results:
        # Format the analysis results in a structured way
        context += "\n\nAnalysis results:"
        
        # Check validation field
        if isinstance(analysis_results, dict) and "validation" in analysis_results:
            validation = analysis_results["validation"]
            if validation:
                context += f"\n- Data validation: {validation}"
        
        # Check insights field
        if isinstance(analysis_results, dict) and "insights" in analysis_results:
            insights = analysis_results["insights"]
            if insights:
                context += f"\n- Data insights: {insights}"
        
        # Check calculate field - handle both dict and DataFrame
        if isinstance(analysis_results, dict) and "calculate" in analysis_results:
            calculate = analysis_results["calculate"]
            context += "\n- Calculations:"
            
            # Handle DataFrame
            if hasattr(calculate, 'to_dict'):  # Check if it's DataFrame-like
                try:
                    # Convert DataFrame to dict for display
                    calc_dict = calculate.to_dict()
                    for col, values in calc_dict.items():
                        for idx, val in values.items():
                            context += f"\n  * {col} {idx}: {val}"
                except:
                    # Fallback - use string representation
                    context += f"\n  * {str(calculate)}"
            # Handle dict
            elif isinstance(calculate, dict):
                for key, value in calculate.items():
                    if isinstance(value, dict):
                        for subkey, subvalue in value.items():
                            context += f"\n  * {key} {subkey}: {subvalue}"
                    else:
                        context += f"\n  * {key}: {value}"
            else:
                # Fallback for other types
                context += f"\n  * {str(calculate)}"
        
        # Check visual field
        if isinstance(analysis_results, dict) and "visual" in analysis_results:
            visual = analysis_results["visual"]
            if visual:
                context += f"\n- Visualization components: {visual}"
    elif data:
        # If we only have raw data, include it in the context
        context += f"\n\nRaw data: {str(data)}"
    
    # Use the AI service to process the query, waiting for analysis to complete
    response = ai_service.process_query(context, prompt, wait_for_analysis=True)
    
    return {"response": response}

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
    
    # Process the query with a simple context that mimics our structured format
    context = "You are a data analysis assistant. Help analyze and explain the data."
    context += "\n\nAnalysis results:"
    context += "\n- Data validation: Data is valid with no missing values"
    context += "\n- Data insights: The max value in the data is 9998.0."
    context += "\n- Calculations:"
    context += "\n  * MAX(AEP_MW) 0: 9998.0"
    
    # Process the query with the test context
    response = ai_service.process_query(context, prompt, wait_for_analysis=False)
    
    return {"response": response}