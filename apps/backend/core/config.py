import os
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client
import os, redis

# Load environment variables from .env file
load_dotenv()

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Optional for now

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------- Redis / Upstash --------------------------------------
UPSTASH_REDIS_URL: str | None = os.getenv("UPSTASH_REDIS_URL")  # rediss://:<pwd>@eu1-your-url.upstash.io:12345

def upstash_connection() -> redis.Redis:
    """
    Return a Redis client: Upstash if URL set, else localhost (tests).
    """
    url = UPSTASH_REDIS_URL or "redis://localhost:6379/0"
    return redis.from_url(url, ssl=url.startswith("rediss://") or "upstash" in url)

# Helper function for UUID generation
def uuid_str() -> str:
    return str(uuid.uuid4()) 