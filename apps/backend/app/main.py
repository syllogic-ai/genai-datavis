from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import os
import sys
from dotenv import load_dotenv
import requests
import io
import json
from datetime import datetime
from supabase import create_client, Client
import uuid
import time

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import utility functions
try:
    from utils.enqueue import enqueue_prompt
except ImportError:
    print("Failed to import enqueue_prompt, trying alternative import path")
    # Try other import paths that might work
    try:
        from backend.utils.enqueue import enqueue_prompt
    except ImportError:
        print("All import attempts for enqueue_prompt failed")

# Load environment variables
load_dotenv()


# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
