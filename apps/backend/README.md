# GenAI DataVis Backend

This is the backend server for the GenAI DataVis application, built with FastAPI.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

## Required Packages

The following critical packages are needed:
- `fastapi`: Web framework for building APIs
- `uvicorn`: ASGI server to run the FastAPI application
- `python-dotenv`: For loading environment variables
- `pandas` & `numpy`: For data manipulation and analysis
- `requests`: For making HTTP requests to external APIs
- `plotly`: For generating data visualizations

All these dependencies are listed in `requirements.txt`.

## Setup Instructions

### Cross-Platform Setup (Windows, Mac, Linux)

1. Open your terminal or command prompt
2. Navigate to the backend directory:
   ```
   # On Mac/Linux
   cd path/to/genai-datavis/apps/backend
   
   # On Windows
   cd path\to\genai-datavis\apps\backend
   ```
3. Run the setup script:
   ```
   python setup.py
   ```
   
   This will set up the environment but not start the server.
   
4. Alternatively, to set up the environment AND start the server in one command:
   ```
   python setup.py --run
   ```
   
5. The setup script will:
   - Create a virtual environment (`venv`)
   - Activate the virtual environment
   - Upgrade pip
   - Install required dependencies
   - Optionally start the server (if --run flag is used)

## Environment Variables

This application uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=8000               # Port the server will run on
HOST=0.0.0.0            # Host address to bind to
DEBUG=True              # Enable debug mode (True/False)

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# API Keys and Secrets 
SECRET_KEY=your_secret_key_here
JWT_SECRET=your_jwt_secret_here

# CORS Settings
FRONTEND_URL=http://localhost:3000

# Other Services
OPENAI_API_KEY=your_openai_api_key_here
```

A `.env.example` file is provided as a template. Copy it to `.env` and fill in the values:

```bash
cp .env.example .env
# Edit the .env file with your actual values
```

## Running the Application

To run the application with environment variables:

```bash
# Make sure you have created .env file
python run.py
```

This will start the server using the configuration from your environment variables.

## Running the Server

### After Setup

Once you've run the setup script, you can start the server by:

1. Ensure your virtual environment is activated:
   ```
   # On Mac/Linux
   source venv/bin/activate
   
   # On Windows
   call venv\Scripts\activate
   ```
2. Start the server:
   ```
   python run.py
   ```
   
   Or directly with uvicorn:
   ```
   uvicorn app.main:app --reload
   ```

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Available Endpoints

- `GET /`: API information
- `GET /datasets`: List available datasets
- `GET /datasets/{name}`: Get dataset by name
- `POST /datasets`: Create a new dataset
- `POST /visualize`: Generate visualization configuration 

## Troubleshooting

If you encounter errors while running the application, try the following:

### Module Not Found Errors

If you see errors like `ModuleNotFoundError: No module named 'uvicorn'` or similar, you might need to reinstall missing dependencies:

```bash
# Make sure you're in the backend directory and virtual environment is activated
python setup.py  # Run the setup script again to fix missing dependencies

# Or install individual packages if needed
pip install uvicorn fastapi requests plotly pandas numpy python-dotenv
```

### Server Not Starting

If the server isn't starting, check:
1. You have Python 3.8+ installed (`python --version`)
2. You've installed all dependencies (`pip list`)
3. You're running the command from the correct directory

### API Connection Issues

If the frontend cannot connect to the backend:
1. Ensure the backend server is running (`lsof -i :8000`)
2. Check that the CORS settings in `main.py` include your frontend origin
3. Verify the API_URL in the frontend points to `http://localhost:8000`
4. Try accessing the API directly: `curl http://localhost:8000/`

For further assistance, please check the logs or open an issue in the project repository. 