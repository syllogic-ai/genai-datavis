@echo off
cd /d %~dp0

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate the virtual environment
call venv\Scripts\activate

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install setuptools with a specific version compatible with Python 3.12
echo Installing setuptools...
pip install setuptools==69.0.2

REM Install dependencies from requirements.txt
echo Installing Python packages from requirements.txt...
pip install -r requirements.txt

REM Create a basic app.py file if it doesn't exist
if not exist "app.py" (
    echo Creating basic app.py file...
    (
        echo from fastapi import FastAPI
        echo.
        echo app = FastAPI^(^)
        echo.
        echo @app.get^("/")
        echo def read_root^(^):
        echo     return {"message": "Hello World"}
    ) > app.py
)

echo ✅ Backend setup complete. Virtual environment activated.
