@echo off
cd /d %~dp0

REM Check if the --run flag was passed
set RUN_AFTER_SETUP=false
for %%A in (%*) do (
    if "%%A"=="--run" (
        set RUN_AFTER_SETUP=true
    )
)

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

REM Verify critical dependencies are installed
echo Verifying critical dependencies...
python -c "import uvicorn" 2>nul
if %errorlevel% neq 0 (
    echo Warning: uvicorn not found. Installing...
    pip install uvicorn
)

python -c "import requests" 2>nul
if %errorlevel% neq 0 (
    echo Warning: requests not found. Installing...
    pip install requests
)

python -c "import plotly" 2>nul
if %errorlevel% neq 0 (
    echo Warning: plotly not found. Installing...
    pip install plotly
)

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

echo ✅ Backend setup complete.

REM Start the server if the --run flag was passed
if "%RUN_AFTER_SETUP%"=="true" (
    echo Starting the server...
    python run.py
) else (
    echo To start the server, run: call venv\Scripts\activate ^&^& python run.py
)
