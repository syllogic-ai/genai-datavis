# GenAI DataVis Backend

This is the backend server for the GenAI DataVis application, built with FastAPI.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

## Setup Instructions

### For Mac/Linux Users

1. Open your terminal
2. Navigate to the backend directory:
   ```
   cd path/to/genai-datavis/apps/backend
   ```
3. Run the setup script:
   ```
   ./setup.sh
   ```
   If you encounter a permission error, make the script executable first:
   ```
   chmod +x setup.sh
   ```
4. The setup script will:
   - Create a virtual environment (`venv`)
   - Activate the virtual environment
   - Upgrade pip
   - Install required dependencies

### For Windows Users

1. Open Command Prompt or PowerShell
2. Navigate to the backend directory:
   ```
   cd path\to\genai-datavis\apps\backend
   ```
3. Run the setup script:
   ```
   setup.bat
   ```
4. The setup script will:
   - Create a virtual environment (`venv`)
   - Activate the virtual environment
   - Upgrade pip
   - Install required dependencies

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

### For Mac/Linux Users

1. Ensure your virtual environment is activated:
   ```
   source venv/bin/activate
   ```
2. Start the server:
   ```
   uvicorn app.main:app --reload
   ```
   
   Alternatively, you can use the run.py script:
   ```
   python run.py
   ```

### For Windows Users

1. Ensure your virtual environment is activated:
   ```
   venv\Scripts\activate
   ```
2. Start the server:
   ```
   uvicorn app.main:app --reload
   ```
   
   Alternatively, you can use the run.py script:
   ```
   python run.py
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