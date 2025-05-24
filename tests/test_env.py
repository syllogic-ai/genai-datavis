from dotenv import load_dotenv, dotenv_values
from pathlib import Path
import os

# Navigate to the correct .env.local path
env_path = Path(__file__).resolve().parent.parent / "apps" / "backend" / ".env.local"

print(f"Loading from: {env_path}")
print("File exists:", env_path.exists())

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Show what was loaded
print("Loaded from file:")
print(dotenv_values(env_path))

# Check actual environment variables
print("os.getenv('SUPABASE_URL'):", os.getenv("SUPABASE_URL"))
print("os.getenv('SUPABASE_SERVICE_KEY'):", os.getenv("SUPABASE_SERVICE_KEY"))
