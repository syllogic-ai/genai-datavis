#!/bin/bash

cd "$(dirname "$0")"

# Check if the --run flag was passed
RUN_AFTER_SETUP=false
for arg in "$@"; do
  if [ "$arg" = "--run" ]; then
    RUN_AFTER_SETUP=true
  fi
done

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install setuptools with a specific version compatible with Python 3.12
echo "Installing setuptools..."
pip install setuptools==69.0.2

# Install dependencies from requirements.txt
echo "Installing Python packages from requirements.txt..."
pip install -r requirements.txt

# Verify critical dependencies are installed
echo "Verifying critical dependencies..."
if ! python -c "import uvicorn" &> /dev/null; then
  echo "Warning: uvicorn not found. Installing..."
  pip install uvicorn
fi

if ! python -c "import requests" &> /dev/null; then
  echo "Warning: requests not found. Installing..."
  pip install requests
fi

if ! python -c "import plotly" &> /dev/null; then
  echo "Warning: plotly not found. Installing..."
  pip install plotly
fi

# Create a basic app.py file if it doesn't exist
if [ ! -f "app.py" ]; then
  echo "Creating basic app.py file..."
  cat > app.py << 'EOF'
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}
EOF
fi

echo "✅ Backend setup complete."

# Start the server if the --run flag was passed
if [ "$RUN_AFTER_SETUP" = true ]; then
  echo "Starting the server..."
  python run.py
else
  echo "To start the server, run: source venv/bin/activate && python run.py"
fi
