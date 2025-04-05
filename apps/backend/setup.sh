#!/bin/bash

cd "$(dirname "$0")"

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

echo "✅ Backend setup complete. Virtual environment activated."
