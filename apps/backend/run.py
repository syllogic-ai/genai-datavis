import os
import sys
import uvicorn
from dotenv import load_dotenv

# Add the project root to Python path to fix imports
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
sys.path.insert(0, project_root)
print(f"Added to Python path: {project_root}")

# Also add the current directory to help with relative imports
sys.path.insert(0, current_dir)
print(f"Added to Python path: {current_dir}")

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from environment variables with defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    print(f"Starting server on {host}:{port} (debug: {debug})")
    
    # Print Python path for debugging
    print(f"Python path: {sys.path}")
    
    try:
        # Try to import app directly to verify it works
        print("Testing import...")
        from app.main import app
        print("Import successful!")
        
        # Run with direct app reference
        uvicorn.run(
            app,
            host=host,
            port=port,
            reload=debug
        )
    except: 
    # ImportError as e:
    #     print(f"Error importing app: {str(e)}")
        print("Falling back to module:app format...")
        
        # Fall back to module:app format
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=debug
        ) 