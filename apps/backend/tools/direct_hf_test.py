#!/usr/bin/env python3
"""
Direct test for Hugging Face API to check for headers and token counts.
This script makes a direct request to the Hugging Face API to see what headers are returned.
"""

import os
import json
import requests
from dotenv import load_dotenv

def test_huggingface_api_directly():
    """Make a direct request to the Hugging Face API and inspect all headers."""
    print("\n--- Testing Hugging Face API Directly ---")
    
    # Get the API token
    api_token = os.getenv('HUGGINGFACE_TOKEN') or os.getenv('LLAMA_API_KEY')
    if not api_token:
        print("No API token found. Please set HUGGINGFACE_TOKEN or LLAMA_API_KEY environment variable.")
        return
    
    # For security, print a masked version of the token
    masked_token = api_token[:4] + '*' * (len(api_token) - 8) + api_token[-4:]
    print(f"Using API token: {masked_token}")
    
    # Set up the headers and API URL
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json'
    }
    
    model = "meta-llama/Meta-Llama-3.1-8B-Instruct"
    api_url = f"https://api-inference.huggingface.co/models/{model}"
    
    # Simple prompt for testing
    prompt = "What is the capital of France?"
    
    # Create the payload
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 100,
            "temperature": 0.01,
            "return_full_text": False
        }
    }
    
    try:
        # Make the request
        print(f"Sending request to {api_url}")
        response = requests.post(api_url, headers=headers, json=payload)
        
        # Print basic info
        print(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            # Show all headers (raw)
            print("\nAll response headers:")
            for header, value in response.headers.items():
                print(f"{header}: {value}")
            
            # Look for specific headers related to tokens and compute
            print("\nSearching for token and compute headers:")
            token_headers = {}
            for header, value in response.headers.items():
                if any(keyword in header.lower() for keyword in ['token', 'compute', 'cost', 'input', 'output', 'generated']):
                    token_headers[header] = value
                    print(f"✅ Found: {header}: {value}")
            
            if not token_headers:
                print("❌ No token or compute headers found!")
                
                # Check what headers we do have
                print("\nHeaders we do have:")
                for header, value in response.headers.items():
                    print(f"{header}: {value}")
            
            # Print the response content
            try:
                content = response.json()
                print("\nResponse content:")
                print(json.dumps(content, indent=2)[:300] + "...")
                
                # Check if there's any token information in the response itself
                if isinstance(content, dict):
                    for key, value in content.items():
                        if any(keyword in key.lower() for keyword in ['token', 'compute', 'cost']):
                            print(f"Found token info in response: {key}: {value}")
            except:
                print("\nResponse content (not JSON):")
                print(response.text[:300] + "...")
        else:
            print(f"Error response: {response.text}")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Run the test
    test_huggingface_api_directly() 