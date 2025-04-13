import requests
import json
import sys

# Test the analyze endpoint with sample data
def test_analyze():
    # Create test data
    test_data = [
        {"month": "2023-01", "sales": 100, "profits": 30},
        {"month": "2023-02", "sales": 150, "profits": 45},
        {"month": "2023-03", "sales": 120, "profits": 35},
    ]
    
    # First request - initial analysis
    print("Testing initial analysis...")
    response = requests.post(
        "http://localhost:8000/analyze",
        headers={"Content-Type": "application/json"},
        json={
            "prompt": "What insights can you provide about sales trends?",
            "data": test_data,
            "is_follow_up": False,
            "session_id": "test123"
        }
    )
    
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        print("Initial analysis successful!")
        result = response.json()
        print(json.dumps(result, indent=2))
        
        # Now test a follow-up query
        print("\nTesting follow-up query...")
        follow_up_response = requests.post(
            "http://localhost:8000/analyze",
            headers={"Content-Type": "application/json"},
            json={
                "prompt": "What was the average profit?",
                "is_follow_up": True,
                "session_id": "test123"
            }
        )
        
        print(f"Status code: {follow_up_response.status_code}")
        if follow_up_response.status_code == 200:
            print("Follow-up query successful!")
            follow_up_result = follow_up_response.json()
            print(json.dumps(follow_up_result, indent=2))
        else:
            print(f"Follow-up query failed: {follow_up_response.text}")
    else:
        print(f"Initial analysis failed: {response.text}")

if __name__ == "__main__":
    test_analyze() 