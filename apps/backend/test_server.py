import os
import uvicorn
from dotenv import load_dotenv
import sys

# Add the current directory to sys.path to resolve imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from environment variables with defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    print(f"Starting server on {host}:{port} (debug: {debug})")
    
    # Import the app directly to avoid import issues
    from app.main import app
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=debug
    ) 