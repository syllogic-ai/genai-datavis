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
import httpx
import json
from datetime import datetime
from supabase import create_client, Client
import uuid

# Load environment variables
load_dotenv()

# Fix imports to be correct based on the package structure
from services.ai_service import AIService
from utils.utils import validate_data, get_insights, visualize, agentic_flow

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

# Add a utility function to update the chat conversation in Supabase
async def append_chat_message(chat_id: str, message: Dict[str, Any]) -> bool:
    """
    Append a message to the chat conversation in Supabase.
    
    Args:
        chat_id: The ID of the chat to update
        message: The message to append to the conversation
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Make sure message has a timestamp
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()
            
        # First, get the current conversation
        chat_data = supabase.table("chats").select("conversation").eq("id", chat_id).execute()
        
        if not chat_data.data or len(chat_data.data) == 0:
            print(f"Chat with ID {chat_id} not found")
            return False
            
        # Get the current conversation array
        current_conversation = chat_data.data[0].get("conversation", [])
        
        # Append the new message
        updated_conversation = current_conversation + [message]
        
        # Update the conversation in Supabase
        # Use updated_at instead of updatedAt to match the database schema
        update_result = supabase.table("chats").update({
            "conversation": updated_conversation,
            "updated_at": datetime.now().isoformat()
        }).eq("id", chat_id).execute()
        
        if not update_result.data or len(update_result.data) == 0:
            print(f"Failed to update conversation for chat {chat_id}")
            return False
            
        print(f"Successfully appended message to chat {chat_id}")
        return True
        
    except Exception as e:
        print(f"Error appending chat message: {str(e)}")
        return False

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

    # If session_id is provided (which is the chat_id), update the chat conversation in Supabase
    if session_id and session_id != "default":
        # Extract insights from the agentic_output
        insights = agentic_output.get("insights", "")
        if isinstance(insights, list):
            insights = "\n".join(insights)
        elif not isinstance(insights, str):
            insights = str(insights)
            
        # Create a system message
        system_message = {
            "role": "system",
            "content": insights,
            "timestamp": datetime.now().isoformat()
        }
        
        # Append the system message to the chat conversation
        chat_id = session_id  # The session_id is actually the chat_id
        success = await append_chat_message(chat_id, system_message)
        if success:
            print(f"Successfully appended system message to chat {chat_id}")
        else:
            print(f"Failed to append system message to chat {chat_id}")
            
        # Check if a visualization was created
        if "visual" in agentic_output and agentic_output["visual"]:
            visual_data = agentic_output["visual"]
            
            try:
                # Create a new chart record in Supabase
                chart_type = visual_data[0]["chartType"] if isinstance(visual_data, list) and len(visual_data) > 0 else "unknown"
                
                # Get the chart specs - use only the first object in the array
                chart_specs = visual_data[0] if isinstance(visual_data, list) and len(visual_data) > 0 else visual_data
                
                # Insert the chart record
                chart_id = str(uuid.uuid4())  # Generate a unique ID
                chart_insert = supabase.table("charts").insert({
                    "id": chart_id,
                    "chat_id": chat_id,
                    "chart_type": chart_type,
                    "chart_specs": chart_specs,
                    "created_at": datetime.now().isoformat()
                }).execute()
                
                if chart_insert.data and len(chart_insert.data) > 0:
                    print(f"Successfully created chart record for chat {chat_id}")
                    
                    # Add a chart message to the conversation
                    chart_message = {
                        "role": "chart",
                        "content": chart_id,  # Use the chart_id as the message content
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Append the chart message to the conversation
                    chart_msg_success = await append_chat_message(chat_id, chart_message)
                    if chart_msg_success:
                        print(f"Successfully appended chart message to chat {chat_id}")
                    else:
                        print(f"Failed to append chart message to chat {chat_id}")
                else:
                    print(f"Failed to create chart record for chat {chat_id}")
            except Exception as e:
                print(f"Error creating chart record: {str(e)}")

    # Remove original_data from the response to avoid large payloads
    response_output = {k: v for k, v in agentic_output.items() if k != "original_data"}
    return jsonable_encoder(response_output)

@app.post("/debug/chat-with-analysis")
async def debug_chat_with_analysis(request: Request):
    """Debug endpoint to test chat with predefined analysis results"""
    body = await request.json()
    prompt = body.get("prompt", None)
    file_url = body.get("file_url", None)
    session_id = body.get("session_id", "default")  # Add session_id parameter
    
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
    
    # If session_id is provided and not default, update the chat conversation in Supabase
    if session_id and session_id != "default":
        # Extract insights from the response_dict
        insights = response_dict.get("insights", "")
        if isinstance(insights, list):
            insights = "\n".join(insights)
        elif not isinstance(insights, str):
            insights = str(insights)
            
        # Create a system message
        system_message = {
            "role": "system",
            "content": insights,
            "timestamp": datetime.now().isoformat()
        }
        
        # Append the system message to the chat conversation
        chat_id = session_id  # The session_id is actually the chat_id
        success = await append_chat_message(chat_id, system_message)
        if success:
            print(f"Debug: Successfully appended system message to chat {chat_id}")
        else:
            print(f"Debug: Failed to append system message to chat {chat_id}")
            
        # Check if a visualization was created
        if "visual" in response_dict and response_dict["visual"]:
            visual_data = response_dict["visual"]
            
            try:
                # Create a new chart record in Supabase
                chart_type = visual_data[0]["chartType"] if isinstance(visual_data, list) and len(visual_data) > 0 else "unknown"
                
                # Get the chart specs - use only the first object in the array
                chart_specs = visual_data[0] if isinstance(visual_data, list) and len(visual_data) > 0 else visual_data
                
                # Insert the chart record
                chart_id = str(uuid.uuid4())  # Generate a unique ID
                chart_insert = supabase.table("charts").insert({
                    "id": chart_id,
                    "chat_id": chat_id,
                    "chart_type": chart_type,
                    "chart_specs": chart_specs,
                    "created_at": datetime.now().isoformat()
                }).execute()
                
                if chart_insert.data and len(chart_insert.data) > 0:
                    print(f"Debug: Successfully created chart record for chat {chat_id}")
                    
                    # Add a chart message to the conversation
                    chart_message = {
                        "role": "chart",
                        "content": chart_id,  # Use the chart_id as the message content
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Append the chart message to the conversation
                    chart_msg_success = await append_chat_message(chat_id, chart_message)
                    if chart_msg_success:
                        print(f"Debug: Successfully appended chart message to chat {chat_id}")
                    else:
                        print(f"Debug: Failed to append chart message to chat {chat_id}")
                else:
                    print(f"Debug: Failed to create chart record for chat {chat_id}")
            except Exception as e:
                print(f"Debug: Error creating chart record: {str(e)}")
    
    # Remove original_data from the response
    response_output = {k: v for k, v in response_dict.items() if k != "original_data"}
    return jsonable_encoder(response_output)

@app.post("/generate-title")
async def generate_title(request: Request):
    """
    Generate a title for a chat based on the user's first prompt message and data column names.
    The title will be maximum 5 words.
    """
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        column_names = body.get("column_names", [])
        chat_id = body.get("chat_id", "")
        
        print(f"Generating title for chat {chat_id} with prompt: {prompt}")
        print(f"Column names: {column_names}")
        
        if not prompt:
            raise HTTPException(status_code=400, detail="No prompt message provided")
            
        if not chat_id:
            raise HTTPException(status_code=400, detail="No chat ID provided")
        
        # Create a context with the prompt and column names
        context = f"You are generating a short, descriptive title for a data analysis chat."
        
        # Create a specific query for the title generation
        query = f"""
        Generate a descriptive title for a data analysis chat based on:
        1. User's query: "{prompt}"
        2. Data columns: {', '.join(column_names) if column_names else 'Unknown'}
        
        Requirements:
        - Maximum 5 words
        - Descriptive and relevant to the data and query
        - No quotes, special characters, or punctuation except spaces
        - Return ONLY the title, nothing else
        """
        
        # Process the query with the AI service
        title = ai_service.process_query(context, query).strip()
        print(f"Generated title: '{title}' for chat {chat_id}")
        
        # Ensure the title is no more than 5 words
        words = title.split()
        if len(words) > 5:
            title = " ".join(words[:5])
            print(f"Trimmed title to 5 words: '{title}'")
        
        # Update the chat title in Supabase
        try:
            update_result = supabase.table("chats").update({
                "title": title,
                "updated_at": datetime.now().isoformat()
            }).eq("id", chat_id).execute()
            
            if not update_result.data or len(update_result.data) == 0:
                print(f"Failed to update title for chat {chat_id}")
                # Still return the title even if update failed
            else:
                print(f"Successfully updated title for chat {chat_id} to '{title}'")
                
            return {"title": title, "chat_id": chat_id}
        except Exception as e:
            print(f"Error updating chat title in Supabase: {str(e)}")
            # Return the title even if we couldn't update it in the database
            return {"title": title, "chat_id": chat_id, "error": "Failed to update in database"}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        print(f"Error generating title: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Title generation failed: {str(e)}")