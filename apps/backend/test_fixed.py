import os
import sys
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create a minimal API for testing
app = FastAPI(title="GenAI DataVis API Test", 
              description="Test API for debugging",
              version="0.1.0")

# Define models
class AnalysisRequest(BaseModel):
    """Request model for the analysis endpoint."""
    prompt: str
    file_id: str
    chat_id: str
    request_id: str
    is_follow_up: bool = False
    widget_type: Optional[str] = None

class AnalysisResponse(BaseModel):
    """Response model for the analysis endpoint."""
    answer: str
    request_id: str
    chat_id: str
    chart_id: Optional[str] = None
    insights: Optional[Dict[str, str]] = None

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_data(request: AnalysisRequest) -> Dict[str, Any]:
    """Test endpoint for analyze function"""
    return {
        "answer": f"Received prompt: {request.prompt}",
        "request_id": request.request_id,
        "chat_id": request.chat_id,
        "chart_id": None,
        "insights": None
    }

@app.get("/")
async def root():
    return {"message": "Test API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "test"
    }

if __name__ == "__main__":
    host = "0.0.0.0"
    port = 8000
    
    print(f"Starting test server on {host}:{port}")
    
    uvicorn.run(
        "test_fixed:app",
        host=host,
        port=port,
        reload=True
    ) 