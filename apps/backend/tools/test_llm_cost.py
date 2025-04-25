#!/usr/bin/env python3
"""
Test script for LLMTool with cost tracking.
"""

import os
from dotenv import load_dotenv
from llm_tool import LLMTool

def main():
    """Test the LLMTool inference and cost tracking functionality."""
    # Initialize the LLM tool
    llm_tool = LLMTool()
    
    # Simple test prompt
    prompt = """<|begin_of_text|><|start_header_id|>system<|end_header_id|>You are a helpful assistant.<|eot_id|>
    <|start_header_id|>user<|end_header_id|>What's the capital of France?<|eot_id|>
    <|start_header_id|>assistant<|end_header_id|>"""
    
    try:
        # Test direct use of infer_and_track_cost
        print("\n--- Testing infer_and_track_cost ---")
        response, cost, token_stats = llm_tool.infer_and_track_cost(prompt)
        print(f"Response: {response}")
        print(f"Cost: ${cost:.6f}")
        print(f"Tokens: Input={token_stats['input_tokens']}, Output={token_stats['output_tokens']}, Total={token_stats['total_tokens']}")
        
        # Test generate_response (which now uses infer_and_track_cost internally)
        print("\n--- Testing generate_response ---")
        response = llm_tool.generate_response("You are a helpful assistant.", "What's the capital of France?")
        print(f"Response: {response}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        # Check if we have a valid API key configured
        api_key = os.getenv('LLAMA_API_KEY')
        if not api_key or "%" in api_key:
            print("\nNo valid LLAMA_API_KEY found in environment. Please set it before running this test.")
        else:
            print(f"\nAPI key is configured, but there was an error: {str(e)}")

if __name__ == "__main__":
    load_dotenv()  # Load environment variables
    main() 