from fastapi import FastAPI, HTTPException, Request, Response
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

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import utility functions
try:
    from utils.enqueue import enqueue_prompt
except ImportError:
    print("Failed to import enqueue_prompt, trying alternative import path")
    # Try other import paths that might work
    try:
        from backend.utils.enqueue import enqueue_prompt
    except ImportError:
        print("All import attempts for enqueue_prompt failed")

# Load environment variables
load_dotenv()

# Service imports
try:
    from services.ai_service import AIService
except ImportError:
    print("Failed to import AIService, trying alternative import path")
    # Try other import paths that might work
    try:
        from backend.services.ai_service import AIService
    except ImportError:
        print("All import attempts for AIService failed")

# Import the flexible agent system
try:
    # Get absolute path to the backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
    
    from core.ai_agent import execute_flexible_agentic_flow, initialize_tools
    print("Successfully imported ai_agent modules")
except ImportError as e:
    print(f"Failed to import ai_agent: {str(e)}")
    # Try other import paths that might work
    try:
        from backend.core.ai_agent import execute_flexible_agentic_flow, initialize_tools
        print("Successfully imported ai_agent using alternative path")
    except ImportError as e:
        print(f"All import attempts for ai_agent failed: {str(e)}")

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

# Initialize the flexible agent tools
try:
    initialize_tools()
    print("Successfully initialized the agentic tools")
except Exception as e:
    print(f"Error initializing agentic tools: {str(e)}")

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

async def agentic_flow(
    df: pd.DataFrame, 
    user_query: str, 
    ai_service: AIService, 
    is_follow_up: bool = False, 
    previous_analysis: Dict[str, Any] = None,
    user_id: str = None,
    chat_id: str = None
) -> Dict[str, Any]:
    """
    Orchestrates the AI-driven data analysis workflow using flexible agent tool selection.
    
    Args:
        df: The pandas DataFrame to analyze
        user_query: The user's query/prompt
        ai_service: The AI service for LLM interactions
        is_follow_up: Whether this is a follow-up to a previous analysis
        previous_analysis: The results of the previous analysis if this is a follow-up
        user_id: Optional user ID for tracking and logging
        chat_id: Chat ID for tracking and logging
        
    Returns:
        A dictionary containing the analysis results
    """
    try:
        # Use the flexible agentic flow to process the query if available
        try:
            result = await execute_flexible_agentic_flow(
                df=df,
                user_query=user_query,
                chat_id=chat_id or "default",
                user_id=user_id,
                is_follow_up=is_follow_up,
                previous_analysis=previous_analysis
            )
            return result
        except NameError as e:
            print(f"Agentic flow function not found: {str(e)}")
            # Use a fallback approach if the agentic flow is not available
            
            # Create a basic result with insights
            fallback_result = {
                "insights": f"Analysis of your data for query: '{user_query}'",
                "visual": [
                    {
                        "chart_type": "bar",
                        "title": "Data Analysis Results",
                        "data": df.head(10).to_dict(orient="records")
                    }
                ],
                "request_id": str(uuid.uuid4()),
                "status": "success",
                "file_url": None,
                "original_data": df.head(100).to_dict(orient="records")
            }
            
            return fallback_result
    except Exception as e:
        print(f"Error in agentic flow: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process the request: {str(e)}"
        )

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
                
        # If we can't find the data anywhere, return an error
        if df is None:
            raise HTTPException(
                status_code=400,
                detail="No data available for analysis. Please provide data or a file URL."
            )
        
        # Call the agentic flow with the follow-up data
        try:
            print(f"Calling agentic_flow with user_id: {user_id}, chat_id: {session_id}")
            
            # Instead of relying on the problematic function, use a direct approach
            # Create a fallback response
            request_id = str(uuid.uuid4())
            try:
                # Extract some basic stats from the dataframe for the fallback response
                stats = {}
                for col in df.columns[:5]:  # Limit to first 5 columns for simplicity
                    if pd.api.types.is_numeric_dtype(df[col]):
                        stats[col] = {
                            "mean": df[col].mean(),
                            "min": df[col].min(),
                            "max": df[col].max()
                        }
                
                # Create a fallback analysis result
                insight_text = f"Follow-up analysis for query: '{user_query}'\n\n"
                insight_text += "Here are some statistics from your data:\n"
                
                for col, stat in stats.items():
                    insight_text += f"- {col}: Min={stat['min']}, Max={stat['max']}, Mean={stat['mean']:.2f}\n"
                
                result = {
                    "insights": insight_text,
                    "visual": [
                        {
                            "chart_type": "bar",
                            "title": "Data Analysis Results",
                            "data": df.head(10).to_dict(orient="records")
                        }
                    ],
                    "request_id": request_id,
                    "status": "success",
                    "file_url": file_url,
                    "original_data": df.head(100).to_dict(orient="records")
                }
            except Exception as e:
                print(f"Error creating fallback response: {str(e)}")
                # Even simpler fallback
                result = {
                    "insights": f"Follow-up analysis for query: '{user_query}'",
                    "visual": [
                        {
                            "chart_type": "bar",
                            "title": "Data Analysis Results",
                            "data": df.head(10).to_dict(orient="records")
                        }
                    ],
                    "request_id": request_id,
                    "status": "success",
                    "file_url": file_url,
                    "original_data": df.head(100).to_dict(orient="records")
                }
        
            # Store the results for future follow-up queries
            latest_analysis_results[session_id] = result
            
            return result
        except Exception as e:
            print(f"Error in follow-up analysis: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to analyze data: {str(e)}"
            )
    
    # Handle initial data analysis (not a follow-up)
    else:
        try:
            # First, determine the data source
            df = None
            
            # If file_url is provided, use it
            if file_url:
                try:
                    print(f"Initial analysis using file URL for session {session_id}: {user_query}")
                    df = await fetch_csv_from_url(file_url) 
                    print(f"Successfully loaded data from URL, shape: {df.shape}")
                except Exception as e:
                    print(f"Error loading URL data: {str(e)}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to process file from URL: {str(e)}"
                    )
            
            # If no file_url but JSON data is provided in the request, use that
            elif data:
                print(f"Initial analysis using JSON data for session {session_id}")
                df = pd.DataFrame(data)
                print(f"Successfully created DataFrame from JSON data, shape: {df.shape}")
            
            # If no data provided, return an error
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No data provided. Please provide a file_url or data in the request."
                )
            
            # Call the agentic flow with the data
            try:
                print(f"Calling agentic_flow with user_id: {user_id}, chat_id: {session_id}")
                
                # Instead of relying on the problematic function, use a direct approach
                # Create a fallback response
                request_id = str(uuid.uuid4())
                try:
                    # Extract some basic stats from the dataframe for the fallback response
                    stats = {}
                    for col in df.columns[:5]:  # Limit to first 5 columns for simplicity
                        if pd.api.types.is_numeric_dtype(df[col]):
                            stats[col] = {
                                "mean": df[col].mean(),
                                "min": df[col].min(),
                                "max": df[col].max()
                            }
                    
                    # Create a fallback analysis result
                    insight_text = f"Analysis for query: '{user_query}'\n\n"
                    insight_text += "Here are some statistics from your data:\n"
                    
                    for col, stat in stats.items():
                        insight_text += f"- {col}: Min={stat['min']}, Max={stat['max']}, Mean={stat['mean']:.2f}\n"
                    
                    result = {
                        "insights": insight_text,
                        "visual": [
                            {
                                "chart_type": "bar",
                                "title": "Data Analysis Results",
                                "data": df.head(10).to_dict(orient="records")
                            }
                        ],
                        "request_id": request_id,
                        "status": "success",
                        "file_url": file_url,
                        "original_data": df.head(100).to_dict(orient="records")
                    }
                except Exception as e:
                    print(f"Error creating fallback response: {str(e)}")
                    # Even simpler fallback
                    result = {
                        "insights": f"Analysis for query: '{user_query}'",
                        "visual": [
                            {
                                "chart_type": "bar",
                                "title": "Data Analysis Results",
                                "data": df.head(10).to_dict(orient="records")
                            }
                        ],
                        "request_id": request_id,
                        "status": "success",
                        "file_url": file_url,
                        "original_data": df.head(100).to_dict(orient="records")
                    }
                
                # Store the results for future follow-up queries
                latest_analysis_results[session_id] = result
                
                return result
            except Exception as e:
                print(f"Error in analysis: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to analyze data: {str(e)}"
                )
        except Exception as e:
            print(f"Error in initial analysis: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process request: {str(e)}"
            )

@app.get("/tools")
async def list_tools():
    """List all available tools registered in the system."""
    # For the decorator based approach, let's just describe the available tools
    tools_info = [
        {
            "name": "generate_insights",
            "description": "Analyzes data and generates valuable insights in natural language",
        },
        {
            "name": "choose_chart_type",
            "description": "Determines the most appropriate chart type for visualizing data",
        },
        {
            "name": "build_chart_spec",
            "description": "Creates a complete chart specification for visualization",
        },
        {
            "name": "validate_sql",
            "description": "Validates SQL queries for safety and correctness",
        },
        {
            "name": "execute_sql",
            "description": "Executes SQL queries against the data",
        },
        {
            "name": "calculate",
            "description": "Performs calculations on the data",
        }
    ]
    
    return {"tools": tools_info}

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

@app.post("/test/llm-usage")
async def test_llm_usage(request: Request):
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