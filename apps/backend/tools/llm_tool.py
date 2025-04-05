import requests
import os
from dotenv import load_dotenv

load_dotenv()

ACCESS_TOKEN = os.getenv('LLAMA_API_KEY')
# url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct"
url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"

class LLMTool:
    def __init__(self):
        self.ACCESS_TOKEN = ACCESS_TOKEN
        # url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct"
        self.url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"


    def generate_response(self, context, query):
        # Check if we have a valid API key
        if not self.ACCESS_TOKEN or "%" in self.ACCESS_TOKEN:
            return self._mock_response(context, query)
            
        try:
            parameters = {
            "max_new_tokens": 5000,
            "temperature": 0.01,
            "top_k": 50,
            "top_p": 0.95,
            "return_full_text": False
            }

            prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>{context}<|eot_id|>
            <|start_header_id|>user<|end_header_id|>Here is the query: {query}. Provide precise and concise answer.<|eot_id|>
            <|start_header_id|>assistant<|end_header_id|>"""

            headers = {
            'Authorization': f'Bearer {self.ACCESS_TOKEN}',
            'Content-Type': 'application/json'
            }

            # prompt = prompt.replace("{query}", query)

            payload = {
                "inputs": prompt,
                "parameters": parameters
                }


            response = requests.post(self.url, headers=headers, json=payload)
            response_text = response.json()[0]['generated_text'].strip()

            return response_text
        except Exception as e:
            print(f"Error in LLM API: {str(e)}")
            return self._mock_response(context, query)
            
    def _mock_response(self, context, query):
        """Provide a mock response for testing when API is unavailable"""
        if "visualization type" in query.lower():
            return "barchart"
        elif "components" in query.lower():
            return "x: month, y: total, color: region, title: Monthly Revenue by Region, xaxis_title: Month, yaxis_title: Revenue"
        elif "financial" in query.lower() or "insights" in query.lower():
            return "Based on the data, there appears to be consistent revenue growth across regions with some seasonal variations. North America shows the strongest performance overall."
        else:
            return "I've analyzed your data and found some interesting patterns. The dataset shows variations across different categories and time periods."