#!/usr/bin/env python3
"""
Test script to run the process_user_request function from calculate.py

Usage:
    python run_calculate.py "<user_prompt>"

Arguments:
    user_prompt: The natural language query to analyze the data
"""

import sys
import os
import ssl
import uuid
import asyncio
from supabase import create_client
import duckdb

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)

# Fix SSL certificate verification issues for macOS
ssl._create_default_https_context = ssl._create_unverified_context

# Import the process_user_request function
from apps.backend.tools.calculate import process_user_request
from apps.backend.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY


async def run_process_user_request(user_prompt):
    """
    Run the process_user_request function with the given parameters.
    
    Args:
        user_prompt: The natural language query to analyze the data
    """
    # Generate unique IDs
    chat_id = "87939486-f970-4c1a-8b8d-85262607d47c"
    request_id = str(uuid.uuid4())
    file_id = "0e708fc0-c8ff-4ab5-a77e-810d0462e765"
    
    # Create connections
    duck_connection = duckdb.connect(":memory:")
    supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"Processing request...")
    print(f"File ID: {file_id}")
    print(f"User prompt: {user_prompt}")
    print(f"Chat ID: {chat_id}")
    print(f"Request ID: {request_id}")
    
    try:
        # Call the process_user_request function
        result = await process_user_request(
            chat_id=chat_id,
            request_id=request_id,
            file_id=file_id,
            user_prompt=user_prompt,
            is_follow_up=False,
            last_chart_id=None,
            duck_connection=duck_connection,
            supabase_client=supabase_client
        )
        
        # Print the result
        print("\nResult:")
        print(f"Answer: {result.get('answer', 'No answer')}")
        print(f"Chart ID: {result.get('chart_id', 'No chart created')}")
        
        if result.get('insights'):
            print("\nInsights:")
            print(f"Title: {result['insights'].get('title', 'No title')}")
            print(f"Analysis: {result['insights'].get('analysis', 'No analysis')}")
            
        return result
            
    except Exception as e:
        print(f"Error processing request: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    # Check arguments
    if len(sys.argv) != 2:
        print("Usage: python run_calculate.py \"<user_prompt>\"")
        sys.exit(1)
        
    user_prompt = sys.argv[1]
    
    # Run the async function
    asyncio.run(run_process_user_request(user_prompt))


if __name__ == "__main__":
    main() 