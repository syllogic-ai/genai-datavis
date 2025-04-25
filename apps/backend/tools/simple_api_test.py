#!/usr/bin/env python3
"""
Simple test script for API endpoints that record token usage.
This script doesn't require huggingface_hub and tests the API directly.
"""

import os
import json
import sys
import requests
from dotenv import load_dotenv
import time
import uuid

def test_api_endpoint():
    """Test the /test/llm-usage endpoint to see if token usage is being recorded properly."""
    print("\n--- Testing /test/llm-usage API endpoint ---")
    
    # Base URL for the API
    base_url = os.getenv('API_URL', 'http://localhost:8000')
    
    # Create unique IDs for testing
    test_user_id = f"test-user-{uuid.uuid4()}"
    test_chat_id = f"test-chat-{uuid.uuid4()}"
    
    print(f"Using test_user_id: {test_user_id}")
    print(f"Using test_chat_id: {test_chat_id}")
    
    # Request payload
    payload = {
        "user_id": test_user_id,
        "chat_id": test_chat_id,
        "query": "What is the capital of France? This is a test query to check token counting."
    }
    
    try:
        # Make the request to the test endpoint
        print(f"Sending request to {base_url}/test/llm-usage")
        response = requests.post(f"{base_url}/test/llm-usage", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response status: {response.status_code}")
            print(f"Success: {data.get('success', False)}")
            
            # Check token information in the response
            usage_record = data.get('usage_record', {})
            print("\nToken usage information:")
            print(f"Input tokens: {usage_record.get('input_tokens', 'NOT FOUND')}")
            print(f"Output tokens: {usage_record.get('output_tokens', 'NOT FOUND')}")
            print(f"Compute time: {usage_record.get('compute_time', 'NOT FOUND')}")
            print(f"User ID stored: {usage_record.get('user_id', 'NOT FOUND')}")
            print(f"Chat ID stored: {usage_record.get('chat_id', 'NOT FOUND')}")
            
            # Check for missing values
            if usage_record.get('input_tokens', 0) == 0 and usage_record.get('output_tokens', 0) == 0:
                print("\n⚠️ WARNING: Both input and output tokens are 0. The token count extraction may not be working.")
            
            if usage_record.get('user_id') != test_user_id:
                print(f"\n⚠️ WARNING: User ID mismatch. Expected: {test_user_id}, Got: {usage_record.get('user_id', 'NONE')}")
                
            if usage_record.get('chat_id') != test_chat_id:
                print(f"\n⚠️ WARNING: Chat ID mismatch. Expected: {test_chat_id}, Got: {usage_record.get('chat_id', 'NONE')}")
            
            # Print the full response for inspection
            print("\nFull response data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error response: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error testing API endpoint: {str(e)}")
        import traceback
        traceback.print_exc()

def test_analyze_endpoint():
    """Test the /analyze endpoint to check if chat_id is being passed through."""
    print("\n--- Testing /analyze API endpoint ---")
    
    # Base URL for the API
    base_url = os.getenv('API_URL', 'http://localhost:8000')
    
    # Create unique IDs for testing
    test_user_id = f"test-user-{uuid.uuid4()}"
    test_chat_id = f"test-chat-{uuid.uuid4()}"
    
    print(f"Using test_user_id: {test_user_id}")
    print(f"Using test_chat_id: {test_chat_id}")
    
    # Sample data for testing
    sample_data = [
        {"month": "2023-01", "sales": 100, "profits": 30},
        {"month": "2023-02", "sales": 150, "profits": 45},
        {"month": "2023-03", "sales": 120, "profits": 35}
    ]
    
    # Request payload
    payload = {
        "data": sample_data,
        "prompt": "Analyze the sales data and tell me the month with highest profits",
        "session_id": test_chat_id,
        "user_id": test_user_id,
        "is_follow_up": False
    }
    
    try:
        # Make the request to the analyze endpoint
        print(f"Sending request to {base_url}/analyze")
        response = requests.post(f"{base_url}/analyze", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response status: {response.status_code}")
            
            # Print the insights for verification
            insights = data.get('insights', 'No insights found')
            print(f"\nInsights: {insights[:100]}...")
            
            # Wait a moment for the database to be updated
            print("\nWaiting 3 seconds for database updates...")
            time.sleep(3)
            
            # Now check the llm_usage table for our test user and chat
            print("\nTesting to see if usage was recorded in the llm_usage table...")
            test_usage_endpoint(test_user_id, test_chat_id, base_url)
            
        else:
            print(f"Error response: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error testing analyze endpoint: {str(e)}")
        import traceback
        traceback.print_exc()

def test_usage_endpoint(user_id, chat_id, base_url):
    """Test a custom endpoint to check llm_usage records."""
    # This requires you to create a custom endpoint in your API
    # If you don't have such an endpoint, modify this function
    
    try:
        # Try to use the test endpoint to check for records
        payload = {
            "user_id": user_id,
            "chat_id": chat_id
        }
        
        response = requests.post(f"{base_url}/test/llm-usage", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if we found records
            usage_record = data.get('usage_record', {})
            if usage_record:
                print(f"Success! Found a usage record for our test.")
                
                # Check token information in the response
                print("\nToken usage information:")
                print(f"Input tokens: {usage_record.get('input_tokens', 'NOT FOUND')}")
                print(f"Output tokens: {usage_record.get('output_tokens', 'NOT FOUND')}")
                print(f"Compute time: {usage_record.get('compute_time', 'NOT FOUND')}")
                print(f"User ID stored: {usage_record.get('user_id', 'NOT FOUND')}")
                print(f"Chat ID stored: {usage_record.get('chat_id', 'NOT FOUND')}")
                
                # Check for issues
                if usage_record.get('input_tokens', 0) == 0 and usage_record.get('output_tokens', 0) == 0:
                    print("\n⚠️ WARNING: Both input and output tokens are 0. The token count extraction is not working.")
                else:
                    print("\n✅ SUCCESS: Token counts are being recorded correctly!")
                    
                if usage_record.get('user_id') != user_id:
                    print(f"\n⚠️ WARNING: User ID mismatch. Expected: {user_id}, Got: {usage_record.get('user_id', 'NONE')}")
                else:
                    print("\n✅ SUCCESS: User ID is being recorded correctly!")
                    
                if usage_record.get('chat_id') != chat_id:
                    print(f"\n⚠️ WARNING: Chat ID mismatch. Expected: {chat_id}, Got: {usage_record.get('chat_id', 'NONE')}")
                else:
                    print("\n✅ SUCCESS: Chat ID is being recorded correctly!")
            else:
                print("\n⚠️ WARNING: No usage records found for our test.")
                print("This could mean the LLM usage tracking is not working at all.")
        else:
            print(f"Error checking usage records: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error checking usage records: {str(e)}")

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Get API URL from command line if provided
    if len(sys.argv) > 1:
        os.environ['API_URL'] = sys.argv[1]
    
    # Run the tests
    test_api_endpoint()
    
    # Ask user if they want to test the analyze endpoint
    choice = input("\nDo you want to test the /analyze endpoint as well? (y/n): ")
    if choice.lower() in ('y', 'yes'):
        test_analyze_endpoint() 