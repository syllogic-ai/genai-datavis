#!/usr/bin/env python3
import os
import sys
import subprocess
import platform
import argparse
import importlib.util

# Parse command line arguments
parser = argparse.ArgumentParser(description='Setup the backend environment')
parser.add_argument('--run', action='store_true', help='Start the server after setup')
args = parser.parse_args()

# Determine the OS
is_windows = platform.system() == 'Windows'
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("Setting up backend environment...")

# Create virtual environment if it doesn't exist
venv_dir = "venv"
if not os.path.exists(venv_dir):
    print("Creating virtual environment...")
    subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)

# Activate the virtual environment
if is_windows:
    activate_script = os.path.join(venv_dir, "Scripts", "activate")
    python_path = os.path.join(venv_dir, "Scripts", "python")
else:
    activate_script = os.path.join(venv_dir, "bin", "activate")
    python_path = os.path.join(venv_dir, "bin", "python")

# Function to run a command in the activated environment
def run_in_venv(command):
    if is_windows:
        cmd = f'call "{activate_script}" && {command}'
        subprocess.run(cmd, shell=True, check=True)
    else:
        cmd = f'source "{activate_script}" && {command}'
        subprocess.run(cmd, shell=True, check=True, executable='/bin/bash')

# Upgrade pip
print("Upgrading pip...")
run_in_venv(f"{python_path} -m pip install --upgrade pip")

# Install setuptools
print("Installing setuptools...")
run_in_venv(f"{python_path} -m pip install setuptools==69.0.2")

# Install dependencies from requirements.txt
print("Installing Python packages from requirements.txt...")
run_in_venv(f"{python_path} -m pip install -r requirements.txt")

# Verify critical dependencies are installed
print("Verifying critical dependencies...")
critical_packages = ["uvicorn", "requests", "plotly", "langgraph", "langsmith"]

for package in critical_packages:
    try:
        run_in_venv(f"{python_path} -c \"import {package}\"")
    except subprocess.CalledProcessError:
        print(f"Warning: {package} not found. Installing...")
        run_in_venv(f"{python_path} -m pip install {package}")

# Validate environment variables
print("Validating environment variables...")

def check_env_file():
    """Check if .env file exists and validate configuration."""
    env_file = ".env"
    env_example_file = ".env.example"
    
    if not os.path.exists(env_file):
        if os.path.exists(env_example_file):
            print(f"⚠️  .env file not found. Please copy {env_example_file} to .env and configure your environment variables.")
        else:
            print("⚠️  Neither .env nor .env.example files found.")
        return False
    
    # Check LangSmith configuration
    try:
        from config.langsmith_config import check_environment_variables as check_langsmith
        langsmith_valid, langsmith_missing = check_langsmith()
        if not langsmith_valid and langsmith_missing:
            print(f"⚠️  LangSmith missing required variables: {', '.join(langsmith_missing)}")
            print("   LangSmith tracing will be disabled.")
    except ImportError:
        print("⚠️  Could not import LangSmith configuration. Please ensure config files are properly created.")
    
    # Check LangGraph configuration  
    try:
        from config.langgraph_config import check_environment_variables as check_langgraph
        langgraph_valid, langgraph_missing = check_langgraph()
        if not langgraph_valid and langgraph_missing:
            print(f"⚠️  LangGraph missing required variables: {', '.join(langgraph_missing)}")
    except ImportError:
        print("⚠️  Could not import LangGraph configuration. Please ensure config files are properly created.")
    
    return True

check_env_file()

print("✅ Backend setup complete.")

# Start the server if --run was passed
if args.run:
    print("Starting the server...")
    run_in_venv(f"{python_path} run.py")
else:
    if is_windows:
        print("To start the server, run: call venv\\Scripts\\activate && python run.py")
    else:
        print("To start the server, run: source venv/bin/activate && python run.py") 