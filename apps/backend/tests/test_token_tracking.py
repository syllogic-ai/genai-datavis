import os
import time
from dotenv import load_dotenv
from ..tools.llm_tool import LLMTool

# Load environment variables
load_dotenv()

def test_token_tracking():
    """Test LLMTool token tracking functionality."""
    # Initialize LLM tool
    api_key = os.getenv('HUGGINGFACE_TOKEN')
    if not api_key:
        print("No HUGGINGFACE_TOKEN found in environment. Skipping test.")
        return
    
    llm = LLMTool(api_key=api_key)
    
    # Test prompt
    prompt = "Summarize the benefits of data visualization in 2-3 sentences."
    
    # First request (should not be cached)
    print("\nMaking first request (should not be cached)...")
    response, stats = llm.infer_and_track_cost(prompt, verbose=True)
    
    print(f"Response: {response}")
    print("\nStats from first request:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Second request with same prompt (should be cached)
    print("\nMaking second request with same prompt (should be cached)...")
    response2, stats2 = llm.infer_and_track_cost(prompt, verbose=True)
    
    print(f"Response: {response2}")
    print("\nStats from second request:")
    for key, value in stats2.items():
        print(f"  {key}: {value}")
    
    # Request with different prompt
    print("\nMaking request with different prompt...")
    different_prompt = "Explain the difference between supervised and unsupervised learning in 2-3 sentences."
    response3, stats3 = llm.infer_and_track_cost(different_prompt, verbose=True)
    
    print(f"Response: {response3}")
    print("\nStats from third request:")
    for key, value in stats3.items():
        print(f"  {key}: {value}")
    
    # Print overall stats
    print("\nOverall LLM stats:")
    overall_stats = llm.get_stats()
    for key, value in overall_stats.items():
        print(f"  {key}: {value}")

if __name__ == "__main__":
    test_token_tracking() 