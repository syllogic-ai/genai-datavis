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


    def generate_response(self,context, query):
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