from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from services.ai_service import AIService
from utils.utils import validate_data, get_insights, visualize

app = FastAPI(title="GenAI DataVis API", 
              description="API for generating data visualizations with AI",
              version="0.1.0")

# Configure CORS with environment variables
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the AI service
ai_service = AIService()

# Sample data model
class DataPoint(BaseModel):
    x: float
    y: float
    label: Optional[str] = None

class DatasetRequest(BaseModel):
    name: str
    data: List[DataPoint]
    
class VisualizationRequest(BaseModel):
    dataset_name: str
    chart_type: str
    title: Optional[str] = None

# New models for query and analyze endpoints
class QueryRequest(BaseModel):
    query: str
    context: Optional[str] = ""
    
class AnalyzeRequest(BaseModel):
    data: List[Dict[str, Any]]
    
class ChatRequest(BaseModel):
    prompt: str
    data: Optional[Dict[str, Any]] = None

# In-memory storage for demo purposes
sample_datasets = {
    "sample1": pd.DataFrame({
        "x": np.random.rand(10),
        "y": np.random.rand(10),
        "label": [f"Point {i}" for i in range(10)]
    })
}

@app.get("/")
def read_root():
    return {
        "message": "Welcome to GenAI DataVis API",
        "endpoints": [
            {"path": "/", "method": "GET", "description": "API information"},
            {"path": "/datasets", "method": "GET", "description": "List available datasets"},
            {"path": "/datasets/{name}", "method": "GET", "description": "Get dataset by name"},
            {"path": "/datasets", "method": "POST", "description": "Create a new dataset"},
            {"path": "/visualize", "method": "POST", "description": "Generate visualization config"},
            {"path": "/query", "method": "POST", "description": "Query an AI agent"},
            {"path": "/analyze", "method": "POST", "description": "Analyze data"},
            {"path": "/chat", "method": "POST", "description": "Chat with the AI about your data"}
        ]
    }

@app.get("/datasets")
def get_datasets():
    return {"datasets": list(sample_datasets.keys())}

@app.get("/datasets/{name}")
def get_dataset(name: str):
    if name not in sample_datasets:
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
    
    df = sample_datasets[name]
    return {
        "name": name,
        "rows": len(df),
        "columns": list(df.columns),
        "data": df.to_dict(orient="records")
    }

@app.post("/datasets")
def create_dataset(request: DatasetRequest):
    data_dict = [point.dict() for point in request.data]
    df = pd.DataFrame(data_dict)
    
    sample_datasets[request.name] = df
    return {"message": f"Dataset '{request.name}' created with {len(df)} points"}

@app.post("/visualize")
def generate_visualization(request: VisualizationRequest):
    if request.dataset_name not in sample_datasets:
        raise HTTPException(status_code=404, detail=f"Dataset '{request.dataset_name}' not found")
    
    # In a real application, this might call an AI service to generate visualization config
    # For demo, we'll return a simple config based on the chart type
    
    df = sample_datasets[request.dataset_name]
    
    if request.chart_type == "scatter":
        return {
            "type": "scatter",
            "data": df.to_dict(orient="records"),
            "config": {
                "x": "x",
                "y": "y",
                "title": request.title or f"Scatter plot of {request.dataset_name}"
            }
        }
    elif request.chart_type == "bar":
        return {
            "type": "bar",
            "data": df.to_dict(orient="records"),
            "config": {
                "x": "label",
                "y": "y",
                "title": request.title or f"Bar chart of {request.dataset_name}"
            }
        }
    else:
        raise HTTPException(status_code=400, detail=f"Chart type '{request.chart_type}' not supported")

@app.post("/query")
def query_agent(request: QueryRequest):
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    response = ai_service.process_query(request.context, request.query)
    return {"response": response}

@app.post("/chat")
def chat(request: ChatRequest):
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    # Prepare context from the data
    context = ""
    if request.data:
        context = f"Analysis results: {request.data}"
    
    # Use the AI service to process the request
    response = ai_service.process_query(context, request.prompt)
    return {"response": response}

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    # Convert JSON data to a pandas DataFrame
    df = pd.DataFrame(request.data)
    
    # Validate the data
    validation_output = validate_data(df)
    
    # Get insights
    insights_output = get_insights(df, ai_service)
    
    # Visualize data
    visualization_output = visualize(df, ai_service)
    
    return {
        "validation": validation_output,
        "insights": insights_output,
        "visualization": visualization_output
    }
