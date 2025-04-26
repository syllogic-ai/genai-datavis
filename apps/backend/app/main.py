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
import json
from datetime import datetime
from supabase import create_client, Client
import uuid
import time

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
    user_id = body.get("user_id", None)
    
    # Ensure user_id is not None
    if user_id is None:
        print(f"WARNING: No user_id provided in request, user_id will be NULL")
        # Don't set a default - keep it as None since we have a foreign key constraint
    else:
        print(f"Using user_id from request: {user_id}")
    
    # Ensure session_id (chat_id) is not None
    if session_id is None:
        session_id = str(uuid.uuid4())
        print(f"WARNING: No session_id provided in request, generated new one: {session_id}")
    
    print(f"Received analyze request with user_id: '{user_id}', chat_id (session_id): '{session_id}'")
    
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
        print(f"Calling agentic_flow with user_id: {user_id}, chat_id: {session_id}")
        agentic_output = agentic_flow(
            df, 
            user_query, 
            ai_service, 
            is_follow_up=True, 
            previous_analysis=previous_analysis,
            user_id=user_id,
            chat_id=session_id
        )
    elif file_url:
        # Initial analysis with file URL
        try:
            df = await fetch_csv_from_url(file_url)
            print(f"Initial analysis using file URL for session {session_id}: {user_query}")
            print(f"Calling agentic_flow with user_id: {user_id}, chat_id: {session_id}")
            agentic_output = agentic_flow(
                df, 
                user_query, 
                ai_service,
                user_id=user_id,
                chat_id=session_id
            )
            
            # Store the file URL with the analysis results
            agentic_output["file_url"] = file_url
            print(f"Stored file URL with analysis results for session {session_id}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process file from URL: {str(e)}")
    elif data:
        # Initial analysis of direct data
        df = pd.DataFrame(data)
        print(f"Initial analysis for session {session_id}: {user_query}")
        print(f"Calling agentic_flow with user_id: {user_id}, chat_id: {session_id}")
        agentic_output = agentic_flow(
            df, 
            user_query, 
            ai_service,
            user_id=user_id,
            chat_id=session_id
        )
        
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

@app.post("/generate-title")
async def generate_title(request: Request):
    """Generate a title for a chat based on the initial user query."""
    body = await request.json()
    query = body.get("query", "")
    chat_id = body.get("chat_id", None)
    user_id = body.get("user_id", None)
    
    # Ensure user_id is not None
    if user_id is None:
        user_id = "title-user"
        print(f"WARNING: No user_id provided in title request, using default: {user_id}")
    
    # Ensure chat_id is not None
    if chat_id is None:
        chat_id = "title-chat-" + str(uuid.uuid4())[:8]
        print(f"WARNING: No chat_id provided in title request, generated new one: {chat_id}")
    
    print(f"Received generate-title request with user_id: '{user_id}', chat_id: '{chat_id}'")
    
    if not query:
        return {"title": "New Chat"}
    
    try:
        # Create context for the LLM
        context = "You are a creative assistant who creates concise, descriptive titles."
        
        # Keep the query for title generation very direct and simple
        query = f"Generate a short, descriptive title (max 6 words) for a conversation about: {query}"
        
        # Generate the title
        print(f"Processing title generation with user_id: {user_id}, chat_id: {chat_id}")
        title = ai_service.process_query(
            context, 
            query,
            user_id=user_id,
            chat_id=chat_id,
            api_request="/generate-title"
        ).strip()
        
        # Truncate if too long (client-side should enforce this too)
        if len(title) > 50:
            title = title[:47] + "..."
            
        # If chat_id is provided, update the chat title
        if chat_id:
            try:
                update_result = supabase.table("chats").update({
                    "title": title
                }).eq("id", chat_id).execute()
                
                print(f"Updated title for chat {chat_id}: {title}")
            except Exception as e:
                print(f"Error updating chat title: {str(e)}")
        
        return {"title": title}
    except Exception as e:
        print(f"Error generating title: {str(e)}")
        return {"title": "New Chat", "error": str(e)}

    """Test endpoint to verify LLM usage tracking with user_id and chat_id."""
    body = await request.json()
    user_id = body.get("user_id", "test-user-id")
    chat_id = body.get("chat_id", "test-chat-id")
    query = body.get("query", "Test query for LLM usage tracking")
    debug = body.get("debug", False)
    
    # Ensure these IDs are never None
    if user_id is None:
        user_id = "test-user-" + str(uuid.uuid4())[:8]
    if chat_id is None:
        chat_id = "test-chat-" + str(uuid.uuid4())[:8]
    
    print(f"Testing LLM usage tracking with user_id: '{user_id}', chat_id: '{chat_id}', debug: {debug}")
    
    try:
        # Create a simple context
        context = "You are a helpful assistant testing LLM usage tracking."
        
        # Generate a more complex prompt if debug is True
        if debug:
            # More complex prompt to generate more tokens
            context += " Please provide a detailed explanation of how neural networks work, including the basics of backpropagation, activation functions, and different layer types."
            query += " Also, compare different machine learning frameworks and their pros and cons. Provide details on TensorFlow, PyTorch, and scikit-learn."
        
        # Set original_query for logging
        original_query = query
        
        # Make a direct query to the LLM service
        response = ai_service.process_query(
            context,
            query,
            user_id=user_id,
            chat_id=chat_id,
            api_request="/test/llm-usage"
        )
        
        # Wait a moment for the database to update
        time.sleep(1)
        
        # Try to fetch the most recent usage record for this user/chat
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                print(f"Querying llm_usage with user_id='{user_id}' and chat_id='{chat_id}'")
                # First try exact match
                usage_records = supabase.table("llm_usage").select("*").eq("user_id", user_id).eq("chat_id", chat_id).order("created_at", desc=True).limit(1).execute()
                
                if not usage_records.data or len(usage_records.data) == 0:
                    # If no exact match, try just by chat_id
                    print(f"No exact match found, trying with only chat_id='{chat_id}'")
                    usage_records = supabase.table("llm_usage").select("*").eq("chat_id", chat_id).order("created_at", desc=True).limit(3).execute()
                
                if not usage_records.data or len(usage_records.data) == 0:
                    # If still no match, get the most recent records
                    print("No match by chat_id either, fetching most recent records")
                    usage_records = supabase.table("llm_usage").select("*").order("created_at", desc=True).limit(5).execute()
                
                if usage_records.data and len(usage_records.data) > 0:
                    usage_record = usage_records.data[0]
                    print(f"Found LLM usage record: {json.dumps(usage_record, default=str)}")
                    
                    # Check for token counts and user/chat IDs
                    has_tokens = usage_record.get("input_tokens", 0) > 0 or usage_record.get("output_tokens", 0) > 0
                    has_user_id = usage_record.get("user_id") == user_id
                    has_chat_id = usage_record.get("chat_id") == chat_id
                    
                    return {
                        "success": True,
                        "message": "LLM usage test completed and record found",
                        "response": response[:100] + "...",
                        "usage_record": usage_record,
                        "has_tokens": has_tokens,
                        "has_user_id": has_user_id,
                        "has_chat_id": has_chat_id,
                        "expected_user_id": user_id,
                        "expected_chat_id": chat_id,
                        "original_query": original_query,
                        "debug_mode": debug
                    }
                else:
                    return {
                        "success": False,
                        "message": "No LLM usage record found for this user/chat",
                        "response": response[:100] + "...",
                        "expected_user_id": user_id,
                        "expected_chat_id": chat_id,
                        "original_query": original_query,
                        "debug_mode": debug
                    }
            except Exception as e:
                print(f"Error fetching LLM usage record: {str(e)}")
                import traceback
                traceback.print_exc()
                return {
                    "success": False,
                    "message": f"Error fetching LLM usage record: {str(e)}",
                    "response": response[:100] + "...",
                    "expected_user_id": user_id,
                    "expected_chat_id": chat_id,
                    "original_query": original_query,
                    "debug_mode": debug
                }
        else:
            return {
                "success": True,
                "message": "LLM usage test completed, but Supabase is not configured",
                "response": response[:100] + "...",
                "expected_user_id": user_id,
                "expected_chat_id": chat_id,
                "original_query": original_query,
                "debug_mode": debug
            }
    except Exception as e:
        print(f"Error in LLM usage test: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Error in LLM usage test: {str(e)}",
            "expected_user_id": user_id,
            "expected_chat_id": chat_id,
            "debug_mode": debug
        }