import os
from typing import Union
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import redis
import logfire

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
LOGFIRE_TOKEN = os.getenv("LOGFIRE_TOKEN")  # Logfire write token for production

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

# ---------- Logfire Configuration -------------------------------

LOGFIRE_TOKEN = os.getenv("LOGFIRE_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def configure_logfire():
    """
    Configure Logfire for observability.
    
    This function initializes Logfire with the appropriate settings based on
    the environment. In development, it will use local credentials, while in
    production it will use the LOGFIRE_TOKEN.
    """
    if LOGFIRE_TOKEN:
        # Production configuration with token
        logfire.configure(token=LOGFIRE_TOKEN)
    else:
        # Development configuration
        try:
            logfire.configure()
        except Exception as e:
            print(f"Failed to configure Logfire: {e}. Run 'logfire auth' to authenticate.")
            
    # Enable auto-tracing for key libraries
    logfire.instrument_httpx()  # HTTP client monitoring
    logfire.instrument_psycopg()  # PostgreSQL monitoring - if used
    logfire.instrument_sqlalchemy()  # SQLAlchemy monitoring - if used
    logfire.instrument_asyncpg()  # Asyncpg monitoring - if used
    logfire.instrument_redis()  # Redis monitoring
    
    # Set up OpenAI instrumentation if we're using it
    if OPENAI_API_KEY:
        logfire.instrument_openai()

# Initialize Logfire on module import
try:
    configure_logfire()
except Exception as e:
    print(f"Warning: Logfire initialization failed: {e}")

