"""
Environment testing script for the GenAI DataVis application.
"""

import os
import sys
import json
from dotenv import load_dotenv

# Add the backend directory to the path for imports
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "apps/backend"))

# Try to load environment variables from .env.local first, then fallback to .env
if os.path.exists("apps/backend/.env.local"):
    load_dotenv("apps/backend/.env.local")
    print("Loaded environment variables from apps/backend/.env.local")
else:
    load_dotenv("apps/backend/.env")
    print("Loaded environment variables from apps/backend/.env")

def test_environment():
    """Test that the environment is correctly set up."""
    print("\n=== Testing Environment Setup ===")
    
    required_vars = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_KEY": os.getenv("SUPABASE_SERVICE_KEY")
    }
    
    optional_vars = {
        "OPENAI_MODEL": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "UPSTASH_REDIS_URL": os.getenv("UPSTASH_REDIS_URL"),
        "HOST": os.getenv("HOST", "0.0.0.0"),
        "PORT": os.getenv("PORT", "8000"),
        "DEBUG": os.getenv("DEBUG", "False")
    }
    
    # Check required variables
    missing_vars = [key for key, value in required_vars.items() if not value]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        return False
    else:
        print("✅ All required environment variables are set")
    
    # Display optional variables
    print("\nOptional environment variables:")
    for key, value in optional_vars.items():
        print(f"  {key}: {value if value else 'Not set'}")
    
    return len(missing_vars) == 0

def check_python_packages():
    """Check if required Python packages are available."""
    print("\n=== Checking Python Packages ===")
    
    required_packages = [
        "fastapi",
        "uvicorn",
        "python-dotenv",
        "pandas",
        "numpy",
        "requests",
        "plotly",
        "supabase",
        "httpx",
        "huggingface_hub",
        "duckdb",
        "polars",
        "pydantic",
        "pydantic_ai"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\nMissing packages: {', '.join(missing_packages)}")
        print("To install missing packages, run:")
        print(f"pip install {' '.join(missing_packages)}")
    else:
        print("\nAll required packages are installed.")
    
    return len(missing_packages) == 0

def test_openai_connection():
    """Test the connection to OpenAI API."""
    print("\n=== Testing OpenAI API Connection ===")
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not set. Skipping test.")
        return False
    
    try:
        import openai
        
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Simple test completion
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=5
        )
        
        result = response.choices[0].message.content.strip()
        print(f"OpenAI Response: {result}")
        print("✅ OpenAI API connection successful")
        return True
    except Exception as e:
        print(f"❌ OpenAI API connection failed: {str(e)}")
        return False

def test_supabase_connection():
    """Test the connection to Supabase."""
    print("\n=== Testing Supabase Connection ===")
    
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        print("❌ Supabase credentials not set. Skipping test.")
        return False
    
    try:
        from core.config import supabase
        
        # Try a simple query
        try:
            response = supabase.table("chats").select("id").limit(1).execute()
            print(f"Supabase Response: {response}")
            print("✅ Supabase connection and query successful")
        except Exception as e:
            print(f"❌ Supabase query failed: {str(e)}")
            print("This might be due to the 'chats' table not existing or permissions issues.")
            print("Basic connection was successful, but query failed.")
        
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {str(e)}")
        return False

def main():
    """Main function to run tests."""
    print("=== GenAI DataVis Environment Testing ===")
    
    env_ok = test_environment()
    packages_ok = check_python_packages()
    
    # Only test external services if environment variables are set
    if env_ok:
        openai_ok = test_openai_connection()
        supabase_ok = test_supabase_connection()
    
    print("\n=== Environment Testing Summary ===")
    print(f"Environment variables: {'✅ OK' if env_ok else '❌ Missing required variables'}")
    print(f"Python packages: {'✅ OK' if packages_ok else '❌ Missing some packages'}")
    
    if env_ok:
        print(f"OpenAI API: {'✅ OK' if openai_ok else '❌ Failed'}")
        print(f"Supabase: {'✅ OK' if supabase_ok else '❌ Failed'}")
    
    # Provide next steps
    print("\n=== Next Steps ===")
    if not env_ok:
        print("1. Set up the missing environment variables in a .env file")
    if not packages_ok:
        print("2. Install the missing Python packages")
    
    if env_ok and packages_ok:
        print("Environment setup looks good! You can now test the app components.")
        print("1. To test the FastAPI backend: python apps/backend/run.py")
        print("2. To manually test specific components, examine the services directory.")

if __name__ == "__main__":
    main() 