import pandas as pd
import numpy as np
from services.ai_service import AIService
from utils.utils import agentic_flow

# Initialize AI service
ai_service = AIService()

def test_agentic_flow():
    # Create test data
    test_data = pd.DataFrame({
        "month": ["2023-01", "2023-02", "2023-03"],
        "sales": [100, 150, 120],
        "profits": [30, 45, 35]
    })
    
    # Test 1: Initial analysis
    print("Testing initial analysis...")
    try:
        result = agentic_flow(
            test_data, 
            "What insights can you provide about sales trends?", 
            ai_service
        )
        print("Initial analysis successful!")
        print(result)
        
        # Store the result for follow-up testing
        previous_analysis = result
        
        # Test 2: Follow-up query
        print("\nTesting follow-up query...")
        follow_up_result = agentic_flow(
            None,  # No data needed for follow-up
            "What was the average profit?", 
            ai_service, 
            is_follow_up=True, 
            previous_analysis=previous_analysis
        )
        print("Follow-up query successful!")
        print(follow_up_result)
    
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_agentic_flow() 