#!/usr/bin/env python3
"""
HuggingFace API Cost Tracker

A utility for tracking the cost of inference requests to Hugging Face's API.
"""

import os
import time
import requests
from dotenv import load_dotenv
from typing import Dict, Any, Optional, Tuple, Union
from huggingface_hub import InferenceClient

# Load environment variables
load_dotenv()

# Default model
DEFAULT_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct"

# Constants for cost calculation
L4_COST_PER_HOUR = 0.60  # $0.60 per hour for NVIDIA L4
COST_PER_SECOND = L4_COST_PER_HOUR / 3600  # Cost per second

def calculate_cost_from_headers(headers: Dict[str, Any]) -> float:
    """
    Calculate the cost of an inference request from response headers.
    
    Args:
        headers: Response headers from the inference request
        
    Returns:
        float: Cost in USD
    """
    # Check if x-total-cost is present
    if headers and 'x-total-cost' in headers:
        return float(headers['x-total-cost'])
    
    # Fall back to x-compute-time
    if headers and 'x-compute-time' in headers:
        compute_time = float(headers['x-compute-time'])
        
        # Get GPU type (if available)
        gpu_type = headers.get('x-compute-type', '').lower()
        
        # Determine price per second based on GPU type
        price_per_second = COST_PER_SECOND  # Default to L4 price
        
        # Check various GPU types
        for gpu, price in {
            "t4": 0.00012,
            "a10": 0.00034,
            "a100": 0.00149
        }.items():
            if gpu in gpu_type:
                price_per_second = price
                break
                
        # Special case for NVIDIA L4 which is priced same as T4
        if 'l4' in gpu_type or 'nvida-l4' in gpu_type:
            price_per_second = COST_PER_SECOND
        
        # Calculate and return cost
        return compute_time * price_per_second
    
    # If neither header is present, return 0
    return 0.0

def infer_and_track_cost(
    model: str,
    token: Optional[str] = None,
    prompt: str = "",
    max_new_tokens: int = 1000,
    temperature: float = 0.01,
    verbose: bool = True,
    direct_request_for_headers: bool = True,
    **kwargs
) -> Tuple[str, float, Dict[str, Any]]:
    """
    Make an inference request and track the cost and token usage.
    
    Args:
        model: The model ID to use for inference
        token: Hugging Face API token. If None, tries to get from env var HUGGINGFACE_TOKEN
        prompt: The prompt to send
        max_new_tokens: Maximum number of tokens to generate
        temperature: Temperature for sampling
        verbose: Whether to print verbose information
        direct_request_for_headers: Whether to make a direct request to get headers
        **kwargs: Additional parameters to pass to the text_generation method
        
    Returns:
        tuple: (response_text, cost_in_usd, token_stats)
    """
    # Get API token
    api_token = token or os.getenv('HUGGINGFACE_TOKEN')
    if not api_token:
        raise ValueError("No API token provided. Please provide a token or set HUGGINGFACE_TOKEN environment variable.")
    
    # Create inference client
    client = InferenceClient(model=model, token=api_token)
    
    # Set default parameters with the ability to override
    params = {
        "max_new_tokens": max_new_tokens,
        "temperature": temperature,
        "top_k": 50,
        "top_p": 0.95,
        "return_full_text": False,
    }
    
    # Update with any user-provided parameters
    params.update(kwargs)
    
    try:
        # Make the inference request using the client
        inference_response = client.text_generation(prompt, **params)
        
        # Extract text from the response
        if isinstance(inference_response, str):
            response_text = inference_response
        elif hasattr(inference_response, 'generated_text'):
            response_text = inference_response.generated_text
        else:
            response_text = str(inference_response)
        
        # Initialize token stats
        token_stats = {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "is_cached": False,
            "headers": {}  # Initialize an empty headers dictionary
        }
        
        # Try to get output tokens from details if available
        if hasattr(inference_response, 'details') and hasattr(inference_response.details, 'generated_tokens'):
            token_stats["output_tokens"] = inference_response.details.generated_tokens
        
        # Make a direct request to get headers if requested
        if direct_request_for_headers:
            try:
                # Set up direct request to the API
                headers_for_request = {
                    'Authorization': f'Bearer {api_token}',
                    'Content-Type': 'application/json'
                }
                
                api_url = f"https://api-inference.huggingface.co/models/{model}"
                
                payload = {
                    "inputs": prompt,
                    "parameters": params
                }
                
                # Make the request
                response = requests.post(api_url, headers=headers_for_request, json=payload)
                
                # Print raw headers for debugging
                if verbose:
                    print(f"Raw response headers from HuggingFace API:")
                    for k, v in response.headers.items():
                        print(f"  {k}: {v}")
                
                # Get all headers from the response (normalized to lowercase for consistency)
                headers = {}
                for key, value in response.headers.items():
                    # Store both original and lowercase versions
                    headers[key.lower()] = value
                
                # Store all headers in token_stats for reference
                token_stats["headers"] = headers
                
                # Check for specific Hugging Face headers we know exist (from testing)
                # Token counts
                if 'x-prompt-tokens' in headers:
                    try:
                        token_stats["input_tokens"] = int(headers['x-prompt-tokens'])
                        print(f"Found input tokens: {token_stats['input_tokens']} from x-prompt-tokens")
                    except (ValueError, TypeError):
                        print(f"Warning: Could not convert x-prompt-tokens to int: {headers['x-prompt-tokens']}")
                
                if 'x-generated-tokens' in headers:
                    try:
                        token_stats["output_tokens"] = int(headers['x-generated-tokens'])
                        print(f"Found output tokens: {token_stats['output_tokens']} from x-generated-tokens")
                    except (ValueError, TypeError):
                        print(f"Warning: Could not convert x-generated-tokens to int: {headers['x-generated-tokens']}")
                
                # Compute time
                if 'x-compute-time' in headers:
                    try:
                        compute_time = float(headers['x-compute-time'])
                        token_stats["compute_time"] = compute_time
                        print(f"Found compute time: {compute_time} from x-compute-time")
                    except (ValueError, TypeError):
                        print(f"Warning: Could not convert x-compute-time to float: {headers['x-compute-time']}")
                
                # Equipment/GPU type
                if 'x-compute-type' in headers:
                    token_stats["equipment"] = headers['x-compute-type']
                    print(f"Found equipment: {token_stats['equipment']} from x-compute-type")
                
                # Check for cached response
                if 'x-compute-type' in headers and 'cache' in headers['x-compute-type'].lower():
                    token_stats["is_cached"] = True
                    # Even though it's cached, we should ensure equipment type shows as "cache"
                    token_stats["equipment"] = "cache"
                    
                    # If token counts are zero due to caching but we have a cached response,
                    # we should still report reasonable estimates for token usage.
                    # For cached responses, we'll use minimal values if absent
                    if token_stats.get("input_tokens", 0) == 0 and token_stats.get("output_tokens", 0) == 0:
                        # If we don't have token counts, estimate based on prompt length
                        # Rough estimate: 1 token per 4 characters
                        estimated_input_tokens = max(1, len(prompt) // 4)
                        estimated_output_tokens = max(1, len(response_text) // 4)
                        
                        token_stats["input_tokens"] = estimated_input_tokens
                        token_stats["output_tokens"] = estimated_output_tokens
                        print(f"Cache hit with zero tokens. Using estimates - input: {estimated_input_tokens}, output: {estimated_output_tokens}")
                    
                # Calculate total tokens
                token_stats["total_tokens"] = token_stats.get("input_tokens", 0) + token_stats.get("output_tokens", 0)
                
                # Look for any token-related headers we might have missed
                for header, value in headers.items():
                    if ('token' in header or 'compute' in header) and header not in ['x-prompt-tokens', 'x-generated-tokens', 'x-compute-time', 'x-compute-type']:
                        print(f"Additional header found: {header}: {value}")
                
                # Print all tokens and compute info for debugging
                if verbose:
                    print(f"Token stats after extraction:")
                    print(f"  input_tokens: {token_stats.get('input_tokens', 0)}")
                    print(f"  output_tokens: {token_stats.get('output_tokens', 0)}")
                    print(f"  total_tokens: {token_stats.get('total_tokens', 0)}")
                    print(f"  compute_time: {token_stats.get('compute_time', 0)}")
                    print(f"  equipment: {token_stats.get('equipment', 'unknown')}")
                
            except Exception as e:
                if verbose:
                    print(f"Warning: Could not make direct request for headers: {e}")
                    import traceback
                    traceback.print_exc()
        
        # Calculate cost based on headers
        cost = calculate_cost_from_headers(headers if direct_request_for_headers else {})
        
        # Print information if verbose is enabled
        if verbose:
            # Print headers and cost information
            cost_headers = {k: v for k, v in headers.items() if 'cost' in k.lower() or 'compute' in k.lower() or 'token' in k.lower()} if direct_request_for_headers else {}
            if cost_headers:
                print(f"Cost-related headers: {cost_headers}")
            
            print(f"Inference cost: ${cost:.6f}")
            print(f"Token counts: {token_stats['input_tokens']} input + {token_stats['output_tokens']} output = {token_stats['total_tokens']} total tokens")
            
            if token_stats["is_cached"]:
                print("Note: Response was served from cache")
            
            if direct_request_for_headers and 'x-compute-type' in headers:
                print(f"GPU type: {headers['x-compute-type']}")
            if direct_request_for_headers and 'x-compute-time' in headers:
                print(f"Compute time: {headers['x-compute-time']}s")
        
        # Return the response text, cost, and token stats
        return response_text, cost, token_stats
        
    except Exception as e:
        # Handle errors
        error_msg = f"Inference request failed: {str(e)}"
        print(error_msg)
        raise RuntimeError(error_msg)

def main():
    """Test the cost tracking functionality."""
    # Sample prompt
    prompt = """<|begin_of_text|><|start_header_id|>system<|end_header_id|>You are a helpful assistant.<|eot_id|>
    <|start_header_id|>user<|end_header_id|>What's the capital of France?<|eot_id|>
    <|start_header_id|>assistant<|end_header_id|>"""
    
    try:
        # Make an inference request and track cost
        response, cost, token_stats = infer_and_track_cost(prompt, verbose=True)
        
        print(f"\nResponse: {response}")
        print(f"Total cost: ${cost:.6f}")
        print(f"Token usage: {token_stats}")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 