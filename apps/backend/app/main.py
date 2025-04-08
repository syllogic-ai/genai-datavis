from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from apps.backend.services.ai_service import AIService
from apps.backend.utils.utils import validate_data, get_insights, visualize, agentic_flow

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

@app.post("/analyze")
async def analyze(request: Request):
    body = await request.json()
    data = body.get("data", None)
    user_query = body.get("prompt", None)
    if not data:
        return {"error": "No data provided"}, 400
    if not user_query:
        user_query = "What insights can you provide based on the given dataframe?"

    # Convert JSON data to a pandas DataFrame
    df = pd.DataFrame(data)
    # Validate the data
    print(f"user_query: {user_query}")
    agentic_output = agentic_flow(df, user_query, ai_service)

    return jsonable_encoder(agentic_output)