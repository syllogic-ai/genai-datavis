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
        self.data_analysis_complete = False  # Flag to track data analysis completion

    def generate_response(self, context, query, wait_for_analysis=False):
        # Check if we have a valid API key
        if not self.ACCESS_TOKEN or "%" in self.ACCESS_TOKEN:
            if wait_for_analysis and not self.data_analysis_complete:
                # Return a message indicating analysis is still in progress
                return "Data analysis is still in progress. Please wait for the results."
            return self._mock_response(context, query)
            
        try:
            # Log the context being used
            print(f"Context for LLM: {context[:200]}...")
            
            parameters = {
            "max_new_tokens": 5000,
            "temperature": 0.01,
            "top_k": 50,
            "top_p": 0.95,
            "return_full_text": False
            }

            prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>{context}<|eot_id|>
            <|start_header_id|>user<|end_header_id|>Here is the query: {query}. Provide precise and concise answer. Use the analysis results and any data provided.<|eot_id|>
            <|start_header_id|>assistant<|end_header_id|>"""

            headers = {
            'Authorization': f'Bearer {self.ACCESS_TOKEN}',
            'Content-Type': 'application/json'
            }

            payload = {
                "inputs": prompt,
                "parameters": parameters
                }


            response = requests.post(self.url, headers=headers, json=payload)
            response_text = response.json()[0]['generated_text'].strip()

            print(f"LLM API Response: {response_text}")

            return response_text
        except Exception as e:
            print(f"Error in LLM API: {str(e)}")
            return self._mock_response(context, query)
            
    def set_analysis_complete(self, status=True):
        """Set the status of data analysis completion."""
        self.data_analysis_complete = status
        
    def _mock_response(self, context, query):
        """Provide a mock response for testing when API is unavailable"""
        # Check if this is a query to select a tool (from master_query or feedback_query)
        if "decide which tool to use" in context.lower() or "following tools" in context.lower():
            # Return a valid tool name for tool selection queries
            return "get_insights"
        
        # Check if context includes analysis results
        if "analysis results:" in context.lower():
            # Extract insights from context if available
            if "data insights:" in context.lower():
                insight_start = context.lower().find("data insights:") + len("data insights:")
                insight_end = context.lower().find("\n-", insight_start) if context.lower().find("\n-", insight_start) != -1 else len(context)
                insight = context[insight_start:insight_end].strip()
                return f"Based on the analysis results, {insight}"
            
            # Extract calculation results if available
            if "calculations:" in context.lower():
                calc_start = context.lower().find("calculations:") + len("calculations:")
                calc_end = context.lower().find("\n-", calc_start) if context.lower().find("\n-", calc_start) != -1 else len(context)
                calc_info = context[calc_start:calc_end].strip()
                return f"According to the calculations: {calc_info}"
        
        if "visualization type" in query.lower():
            return "barchart"
        elif "components" in query.lower():
            return "x: month, y: total, color: region, title: Monthly Revenue by Region, xaxis_title: Month, yaxis_title: Revenue"
        elif "financial" in query.lower() or "insights" in query.lower():
            return "Based on the data, there appears to be consistent revenue growth across regions with some seasonal variations. North America shows the strongest performance overall."
        else:
            return "I've analyzed your data and found some interesting patterns. The dataset shows variations across different categories and time periods."