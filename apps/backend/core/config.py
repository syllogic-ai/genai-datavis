import os
from typing import Union
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import redis

# Load environment variables from .env file
# Navigate to the correct .env.local path
env_path = Path(__file__).resolve().parent.parent / ".env.local"

print(f"Loading from: {env_path}")
print("File exists:", env_path.exists())

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Optional for now

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------- Redis / Upstash --------------------------------------
UPSTASH_REDIS_URL: Union[str, None] = os.getenv("UPSTASH_REDIS_URL")  # rediss://:<pwd>@eu1-your-url.upstash.io:12345

def upstash_connection() -> redis.Redis:
    """
    Return a Redis client: Upstash if URL set, else localhost (tests).
    """
    url = UPSTASH_REDIS_URL or "redis://localhost:6379/0"
    return redis.from_url(url, ssl=url.startswith("rediss://") or "upstash" in url)

