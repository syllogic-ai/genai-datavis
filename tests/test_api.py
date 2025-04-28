"""
API testing script for the GenAI DataVis FastAPI server.
"""

import os
import sys
import json
import time
import asyncio
import uvicorn
import threading
import requests
import pandas as pd
from io import StringIO
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Add the backend directory to the path for imports
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "apps/backend"))

# Try to load environment variables from .env.local first, then fallback to .env
if os.path.exists("apps/backend/.env.local"):
    load_dotenv("apps/backend/.env.local")
    print("Loaded environment variables from apps/backend/.env.local")
else:
    load_dotenv("apps/backend/.env")
    print("Loaded environment variables from apps/backend/.env")

# Import the FastAPI app from the project
try:
    from app.main import app
except ImportError as e:
    print(f"Could not import app.main due to: {str(e)}")
    print("Please make sure you're running from the correct directory with the correct Python environment.")
    sys.exit(1)

# Setup test client
client = TestClient(app)

def test_docs():
    """Test that the API documentation is accessible."""
    print("\n=== Testing API Documentation ===")
    response = client.get("/docs")
    if response.status_code == 200:
        print("✅ API documentation is accessible")
        return True
    else:
        print(f"❌ API documentation returned status code {response.status_code}")
        return False

def test_tools_endpoint():
    """Test the /tools endpoint."""
    print("\n=== Testing /tools Endpoint ===")
    response = client.get("/tools")
    if response.status_code == 200:
        data = response.json()
        print(f"Available tools: {data}")
        print("✅ /tools endpoint is working")
        return True
    else:
        print(f"❌ /tools endpoint returned status code {response.status_code}")
        return False

def test_analyze_endpoint():
    """Test the /analyze endpoint with sample data."""
    print("\n=== Testing /analyze Endpoint ===")
    
    # Create a simple dataframe for testing
    df = pd.DataFrame({
        'Year': [2020, 2021, 2022, 2023],
        'Sales': [100, 120, 150, 180],
        'Expenses': [80, 90, 100, 120],
        'Profit': [20, 30, 50, 60]
    })
    
    # Convert the dataframe to CSV for sending in the request
    csv_data = df.to_csv(index=False)
    
    # Create a request with the CSV data
    response = client.post(
        "/analyze",
        json={
            "data": csv_data,
            "prompt": "What is the trend in sales over the years?",
            "session_id": "test_session",
            "is_follow_up": False
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Analysis results available? {'answer' in data}")
        print("✅ /analyze endpoint is working")
        return True
    else:
        print(f"❌ /analyze endpoint returned status code {response.status_code}")
        print(f"Error: {response.text}")
        return False

def test_generate_title_endpoint():
    """Test the /generate-title endpoint."""
    print("\n=== Testing /generate-title Endpoint ===")
    
    response = client.post(
        "/generate-title",
        json={
            "content": "This is a data analysis about sales trends from 2020 to 2023."
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Generated title: {data.get('title')}")
        print("✅ /generate-title endpoint is working")
        return True
    else:
        print(f"❌ /generate-title endpoint returned status code {response.status_code}")
        print(f"Error: {response.text}")
        return False

def run_api_server():
    """Run the API server for testing with actual HTTP requests."""
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)

def test_with_real_http_server():
    """Test the API with a real HTTP server."""
    # Start the server in a separate thread
    server_thread = threading.Thread(target=run_api_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Wait for server to start
    time.sleep(2)
    
    print("\n=== Testing with Real HTTP Server ===")
    try:
        # Test the API documentation
        response = requests.get("http://127.0.0.1:8000/docs")
        if response.status_code == 200:
            print("✅ API documentation is accessible via HTTP")
        else:
            print(f"❌ API documentation returned status code {response.status_code}")
            
        # Test the tools endpoint
        response = requests.get("http://127.0.0.1:8000/tools")
        if response.status_code == 200:
            print("✅ /tools endpoint is accessible via HTTP")
        else:
            print(f"❌ /tools endpoint returned status code {response.status_code}")
            
    except requests.ConnectionError:
        print("❌ Could not connect to the server. Make sure it's running on port 8000.")
        
    return True

def main():
    """Main function to run tests."""
    print("=== GenAI DataVis API Testing ===")
    
    # Choose test to run
    print("\nAvailable tests:")
    print("1. Test API documentation")
    print("2. Test /tools endpoint")
    print("3. Test /analyze endpoint")
    print("4. Test /generate-title endpoint")
    print("5. Test with real HTTP server")
    print("6. Run all tests with TestClient")
    
    choice = input("\nEnter test number (1-6): ")
    
    if choice == '1':
        test_docs()
    elif choice == '2':
        test_tools_endpoint()
    elif choice == '3':
        test_analyze_endpoint()
    elif choice == '4':
        test_generate_title_endpoint()
    elif choice == '5':
        test_with_real_http_server()
    elif choice == '6':
        # Run all tests
        test_docs()
        test_tools_endpoint()
        test_analyze_endpoint()
        test_generate_title_endpoint()
    else:
        print("Invalid choice. Please run again and select a valid option.")

if __name__ == "__main__":
    main() 