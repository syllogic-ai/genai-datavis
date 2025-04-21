import requests
import os
from dotenv import load_dotenv

load_dotenv()

ACCESS_TOKEN = os.getenv('LLAMA_API_KEY')
url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct"
#url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"

class LLMTool:
    def __init__(self):
        self.ACCESS_TOKEN = ACCESS_TOKEN
        # url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct"
        self.url = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct"
        self.data_analysis_complete = False  # Flag to track data analysis completion
        self.use_mock = False  # Set to True for testing, False for production

    def generate_response(self, context, query, wait_for_analysis=False):
        # Check if we have a valid API key
        if not self.ACCESS_TOKEN or "%" in self.ACCESS_TOKEN:
            if self.use_mock:
                print("WARNING: No valid API key found, using mock response")
                if wait_for_analysis and not self.data_analysis_complete:
                    # Return a message indicating analysis is still in progress
                    return "Data analysis is still in progress. Please wait for the results."
                return self._mock_response(context, query)
            else:
                raise ValueError("No valid LLAMA_API_KEY found in environment variables. Please configure your API key.")
            
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

            print(f"Sending request to LLM API at {self.url}")
            response = requests.post(self.url, headers=headers, json=payload)
            
            # Check for HTTP errors
            response.raise_for_status()
            
            # Get response text from response JSON
            try:
                response_text = response.json()[0]['generated_text'].strip()
                print(f"LLM API Response: {response_text[:100]}...")
                return response_text
            except (KeyError, IndexError) as e:
                print(f"Error parsing LLM API response: {str(e)}")
                print(f"Full response: {response.text}")
                if self.use_mock:
                    return self._mock_response(context, query)
                else:
                    raise ValueError(f"Unexpected response format from LLM API: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"Error in LLM API request: {str(e)}")
            if self.use_mock:
                return self._mock_response(context, query)
            else:
                raise RuntimeError(f"LLM API request failed: {str(e)}")
        except Exception as e:
            print(f"Unexpected error in LLM API: {str(e)}")
            if self.use_mock:
                return self._mock_response(context, query)
            else:
                raise RuntimeError(f"Unexpected error in LLM API: {str(e)}")
            
    def set_analysis_complete(self, status=True):
        """Set the status of data analysis completion."""
        self.data_analysis_complete = status
        
    def _mock_response(self, context, query):
        """Provide a mock response for testing when API is unavailable"""
        # Check if this is a query to select a tool (from master_query or feedback_query)
        if "decide which tool to use" in context.lower() or "following tools" in context.lower():
            # For tool selection queries, determine which tool is most appropriate
            if "calculate" in query.lower() or "average" in query.lower() or "mean" in query.lower() or "sum" in query.lower():
                return "calculate"
            elif "visual" in query.lower() or "chart" in query.lower() or "graph" in query.lower() or "plot" in query.lower():
                return "visual"
            elif "validate" in query.lower() or "check" in query.lower() or "missing" in query.lower():
                return "validate_data"
            else:
                # Default to insights for most queries
                return "get_insights"
        
        # If this is a response query, provide actual insights
        if "given the user query" in query.lower() and "provide the user with a proper response" in query.lower():
            # Extract information about the dataset from context if available
            dataset_info = ""
            if "dataset information:" in context.lower():
                start_idx = context.lower().find("dataset information:")
                end_idx = context.lower().find("\n\n", start_idx) if context.lower().find("\n\n", start_idx) != -1 else len(context)
                dataset_info = context[start_idx:end_idx].strip()
            
            # Generate meaningful mock insights based on dataset info and user query
            if "AEP_MW" in context:
                return "Based on the data, the AEP power consumption shows hourly measurements from late 2004. The power consumption varies throughout the day with peaks likely occurring during high demand periods. The dataset contains 121,273 rows of hourly power consumption data measured in megawatts (MW). This time-series data would be useful for analyzing power consumption patterns, identifying peak usage times, and forecasting future demand."
            elif "sales" in context.lower() or "revenue" in context.lower():
                return "The analysis shows clear sales trends with fluctuations over time. Sales appear to peak during certain periods, which may correlate with seasonal patterns or marketing initiatives. The data provides valuable insights for optimizing inventory management and sales strategies."
            elif "expense" in context.lower() or "cost" in context.lower():
                return "The expense data reveals consistent spending patterns with some notable outliers. Major expense categories can be identified and prioritized for potential cost optimization. Comparing expenses against revenue metrics would provide a comprehensive view of financial performance."
            else:
                return "The dataset contains valuable information that reveals several key insights. There are clear patterns and trends that emerge from the analysis. The data points to specific opportunities and areas that may require attention. For a more detailed analysis, specific questions about particular aspects of the data would be helpful."
        
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
            return "bar"
        elif "components" in query.lower():
            return '{"title": "Data Visualization", "description": "Overview of key metrics", "xAxisDataKey": "month", "dataColumns": ["value"]}'
        elif "financial" in query.lower() or "insights" in query.lower():
            return "Based on the data, there appears to be consistent growth across metrics with some seasonal variations. The analysis indicates several actionable insights that could help optimize performance."
        else:
            return "I've analyzed your data and found some interesting patterns. The dataset shows variations across different categories and time periods that suggest opportunities for optimization and further analysis."