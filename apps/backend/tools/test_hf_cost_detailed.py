#!/usr/bin/env python3
"""
Detailed test script for HuggingFace API cost tracking.
"""

import os
import json
from dotenv import load_dotenv
import sys
import traceback

# Check for required dependencies
DEPENDENCIES_AVAILABLE = True
try:
    from huggingface_hub import InferenceClient
    import requests
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    print(f"Warning: Could not import required dependencies: {e}")
    print("Some tests may be skipped. Run 'pip install huggingface_hub requests' to enable all tests.")

# Try to import our local module
try:
    from hf_cost_tracker import infer_and_track_cost, calculate_cost_from_headers
except ImportError as e:
    print(f"Error importing local module: {e}")
    print("Make sure you're running this script from the correct directory.")
    sys.exit(1)

def test_direct_headers():
    """Test direct access to headers from InferenceClient."""
    if not DEPENDENCIES_AVAILABLE:
        print("\n--- Skipping test_direct_headers due to missing dependencies ---")
        return
        
    # Get token from environment
    token = os.getenv('HUGGINGFACE_TOKEN') or os.getenv('LLAMA_API_KEY')
    if not token:
        print("No API token found in environment variables.")
        return
    
    # Initialize client
    model = "meta-llama/Meta-Llama-3.1-8B-Instruct"
    client = InferenceClient(model=model, token=token)
    
    # Simple prompt
    prompt = "What's the capital of France?"
    
    try:
        # Make request
        print(f"\n--- Testing with model: {model} ---")
        response = client.text_generation(
            prompt,
            max_new_tokens=100,
            details=True  # Request full details
        )
        
        # Print response type and structure
        print(f"\nResponse type: {type(response)}")
        print(f"Response attributes: {dir(response)[:20]}...")
        
        # Try to access headers in different ways
        print("\nTrying to access headers from response:")
        
        if hasattr(response, 'headers'):
            print("Found response.headers:", response.headers)
        else:
            print("No response.headers attribute")
            
        if hasattr(response, 'raw_headers'):
            print("Found response.raw_headers:", response.raw_headers)
        else:
            print("No response.raw_headers attribute")
            
        if hasattr(response, 'details'):
            print("Found response.details:", response.details)
            if hasattr(response.details, 'headers'):
                print("Found response.details.headers:", response.details.headers)
        else:
            print("No response.details attribute")
            
        if hasattr(client, 'headers'):
            print("Found client.headers:", client.headers)
        else:
            print("No client.headers attribute")
            
        if hasattr(client, 'last_headers'):
            print("Found client.last_headers:", client.last_headers)
        else:
            print("No client.last_headers attribute")
        
        # Check for completion
        print(f"\nGenerated text: {response}")
        
        # Try to use the client directly to get headers
        print("\nTrying direct request:")
        try:
            # Make a request to the API directly to get headers
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            api_url = f"https://api-inference.huggingface.co/models/{model}"
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 100,
                    "return_full_text": False
                }
            }
            r = requests.post(api_url, headers=headers, json=payload)
            print(f"Status code: {r.status_code}")
            print(f"Response headers: {dict(r.headers)}")
            
            # Check for cost-related headers
            for header in r.headers:
                if 'cost' in header.lower() or 'compute' in header.lower() or 'x-' in header.lower():
                    print(f"Found relevant header: {header}: {r.headers[header]}")
                    
        except Exception as e:
            print(f"Error in direct request: {e}")
    
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

def test_with_util():
    """Test using our utility function."""
    if not DEPENDENCIES_AVAILABLE:
        print("\n--- Skipping test_with_util due to missing dependencies ---")
        return
        
    try:
        # Make an inference request and track cost
        print("\n--- Testing with our utility function ---")
        response, cost, token_stats = infer_and_track_cost(
            "meta-llama/Meta-Llama-3.1-8B-Instruct",
            prompt="What's the capital of France?",
            max_new_tokens=100,  # Using a smaller value for quicker response
            verbose=True
        )
        
        print(f"\nResponse: {response}")
        print(f"Total cost: ${cost:.6f}")
        print(f"Token usage: {token_stats}")
        
        # Specifically check for token counts
        print("\nToken count information:")
        print(f"Input tokens: {token_stats.get('input_tokens', 'NOT FOUND')}")
        print(f"Output tokens: {token_stats.get('output_tokens', 'NOT FOUND')}")
        print(f"Total tokens: {token_stats.get('total_tokens', 'NOT FOUND')}")
        
        # Check for compute time
        headers = token_stats.get('headers', {})
        compute_time = headers.get('x-compute-time', 'NOT FOUND')
        compute_type = headers.get('x-compute-type', 'NOT FOUND')
        print(f"Compute time: {compute_time}")
        print(f"Compute type: {compute_type}")
        
        # Check all headers for token or compute information
        print("\nAll relevant headers:")
        for header, value in headers.items():
            if any(keyword in header.lower() for keyword in ['token', 'compute', 'cost']):
                print(f"{header}: {value}")
    
    except Exception as e:
        print(f"Error with utility function: {str(e)}")
        traceback.print_exc()

def test_with_mock_headers():
    """Test cost calculation with mock headers."""
    print("\n--- Testing with mock headers ---")
    
    # Test case 1: x-total-cost header
    headers1 = {'x-total-cost': '0.000123'}
    cost1 = calculate_cost_from_headers(headers1)
    print(f"Test case 1 (x-total-cost): ${cost1:.6f}")
    
    # Test case 2: x-compute-time with T4 GPU
    headers2 = {'x-compute-time': '1.5', 'x-compute-type': 'T4'}
    cost2 = calculate_cost_from_headers(headers2)
    print(f"Test case 2 (T4, 1.5s): ${cost2:.6f}")
    
    # Test case 3: x-compute-time with A10 GPU
    headers3 = {'x-compute-time': '1.5', 'x-compute-type': 'A10'}
    cost3 = calculate_cost_from_headers(headers3)
    print(f"Test case 3 (A10, 1.5s): ${cost3:.6f}")
    
    # Test case 4: x-compute-time with A100 GPU
    headers4 = {'x-compute-time': '1.5', 'x-compute-type': 'A100'}
    cost4 = calculate_cost_from_headers(headers4)
    print(f"Test case 4 (A100, 1.5s): ${cost4:.6f}")
    
    # Test case 5: No relevant headers
    headers5 = {'content-type': 'application/json'}
    cost5 = calculate_cost_from_headers(headers5)
    print(f"Test case 5 (no cost headers): ${cost5:.6f}")

def test_api_key_available():
    """Simple test to check if API key is available."""
    print("\n--- Testing API key availability ---")
    
    api_key = os.getenv('HUGGINGFACE_TOKEN') or os.getenv('LLAMA_API_KEY')
    if api_key:
        # Mask the key for security
        masked_key = api_key[:4] + '*' * (len(api_key) - 8) + api_key[-4:]
        print(f"API key found: {masked_key}")
        
        # Check if it has the right format 
        if 'hf_' in api_key or len(api_key) > 30:
            print("API key appears to have a valid format")
        else:
            print("Warning: API key format looks unusual")
    else:
        print("No API key found. Set HUGGINGFACE_TOKEN or LLAMA_API_KEY environment variable.")

if __name__ == "__main__":
    load_dotenv()  # Load environment variables
    
    # First run basic checks
    test_api_key_available()
    
    # Run tests with external dependencies
    if DEPENDENCIES_AVAILABLE:
        test_direct_headers()
        test_with_util()
    else:
        print("\nSkipping tests that require external dependencies.")
    
    # Always run the mock test
    test_with_mock_headers() 