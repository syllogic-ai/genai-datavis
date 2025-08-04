import pandas as pd
from fastapi import FastAPI

from services.ai_service import AIService
from utils.utils import *

app = FastAPI()

# @app.get("/"
# def read_root():
#     return {"message": "Hello World"}

# Initialize the AI service
ai_service = AIService()

@app.post("/analyze")
def analyze(request: Request):
    body = request.json()
    data = body.get("data", None)
    user_query = body.get("query", None)
    if not data:
        return {"error": "No data provided"}, 400
    if not user_query:
        user_query = "What insights can you provide based on the given dataframe?"

    # Convert JSON data to a pandas DataFrame
    df = pd.DataFrame(data)
    # Validate the data
    output = agentic_flow(df, user_query, ai_service)

    return jsonify({
        "validation": "",
        "insights": output,
        "visualization": ""
    })
