import requests
import os
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from typing import Dict, List, Optional, Tuple, Union, Any
import time
from .hf_cost_tracker import infer_and_track_cost
import uuid
import json
from datetime import datetime

load_dotenv()

ACCESS_TOKEN = os.getenv('LLAMA_API_KEY')
MODEL_ID = "meta-llama/Meta-Llama-3.1-8B-Instruct"
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# GPU pricing constants based on documented pricing for NVIDIA L4 GPUs
L4_COST_PER_HOUR = 0.80  # $0.60 per hour for NVIDIA L4
COST_PER_SECOND = L4_COST_PER_HOUR / 3600  # Cost per second

class LLMTool:
    """Tool for using LLMs with cost tracking."""
    
    def __init__(
        self, 
        api_key: Optional[str] = None, 
        model_name: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"
    ):
        """
        Initialize the LLM tool with API key and model information.
        
        Args:
            api_key: HuggingFace API key. If None, tries to get from env var HUGGINGFACE_TOKEN
            model_name: The model ID to use for inference
        """
        self.api_key = api_key or os.getenv('LLAMA_API_KEY')
        if not self.api_key:
            raise ValueError("No API key provided. Please provide a key or set HUGGINGFACE_TOKEN environment variable.")
        
        self.model_name = model_name
        self.total_cost = 0.0
        self.total_tokens = 0
        self.request_count = 0
        self.cached_requests = 0
        self.request_stats = []
        
        # Initialize supabase client if available
        self.supabase = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client, Client
                self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            except ImportError:
                print("Supabase Python client not installed. Usage data will not be stored in the database.")
            except Exception as e:
                print(f"Error initializing Supabase client: {str(e)}")
    
    def infer_and_track_cost(
        self, 
        prompt: str,
        max_new_tokens: int = 1000,
        temperature: float = 0.01,
        verbose: bool = False
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Make an inference request and track the cost and token usage.
        
        Args:
            prompt: The prompt to send
            max_new_tokens: Maximum number of tokens to generate
            temperature: Temperature for sampling
            verbose: Whether to print verbose information
            
        Returns:
            tuple: (response_text, stats_dict) where stats_dict includes cost and token information
        """
        # Call the inference function with appropriate parameters
        response_text, cost, token_stats = infer_and_track_cost(
            model=self.model_name,
            token=self.api_key,
            prompt=prompt,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            verbose=verbose
        )
        
        # Get cost directly from headers if available
        headers = token_stats.get("headers", {})
        if headers and 'x-total-cost' in headers:
            try:
                cost = float(headers['x-total-cost'])
                print(f"Using exact cost from headers: ${cost}")
            except (ValueError, TypeError):
                print(f"Warning: Could not convert x-total-cost to float: {headers['x-total-cost']}")
        
        # Update tracking metrics
        self.total_cost += cost
        self.total_tokens += token_stats.get("total_tokens", 0)
        self.request_count += 1
        
        # Track cached requests
        if token_stats.get("is_cached", False):
            self.cached_requests += 1
        
        # Create stats dictionary with all relevant information
        stats = {
            "cost": cost,
            "total_cost": self.total_cost,
            "input_tokens": token_stats.get("input_tokens", 0),
            "output_tokens": token_stats.get("output_tokens", 0),
            "total_tokens": token_stats.get("total_tokens", 0),
            "cumulative_tokens": self.total_tokens,
            "request_count": self.request_count,
            "cached_requests": self.cached_requests,
            "is_cached": token_stats.get("is_cached", False),
            # Add headers and other fields from token_stats
            "headers": token_stats.get("headers", {}),
            "compute_time": token_stats.get("compute_time", 0.0),
            "equipment": token_stats.get("equipment", "unknown")
        }
        
        # Store stats for this request
        self.request_stats.append(stats)
        
        return response_text, stats
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get current usage statistics.
        
        Returns:
            dict: Dictionary containing usage statistics
        """
        return {
            "total_cost": self.total_cost,
            "total_tokens": self.total_tokens,
            "request_count": self.request_count,
            "cached_requests": self.cached_requests,
            "avg_cost_per_request": self.total_cost / max(1, self.request_count),
            "avg_tokens_per_request": self.total_tokens / max(1, self.request_count),
            "cache_hit_rate": self.cached_requests / max(1, self.request_count),
            "input_tokens_total": sum(stats.get("input_tokens", 0) for stats in self.request_stats) if hasattr(self, "request_stats") else 0,
            "output_tokens_total": sum(stats.get("output_tokens", 0) for stats in self.request_stats) if hasattr(self, "request_stats") else 0
        }

    def store_usage_data(self, stats: Dict[str, Any], api_request: str, user_id: Optional[str] = None, chat_id: Optional[str] = None) -> Optional[str]:
        """
        Store LLM usage data in the database.
        
        Args:
            stats: Statistics from the LLM request
            api_request: The API endpoint or function that made the request
            user_id: Optional user ID associated with the request
            chat_id: Optional chat ID associated with the request
            
        Returns:
            Optional[str]: ID of the created record, or None if storage failed
        """
        if not self.supabase:
            print("Supabase client not available. Usage data not stored.")
            return None
            
        try:
            # For chat_id, use a safe default if None
            safe_chat_id = chat_id if chat_id is not None else "no-chat-id"
            
            # Note: user_id can be None due to foreign key constraint - don't set a default
            print(f"Storing LLM usage with user_id: '{user_id}', chat_id: '{safe_chat_id}'")
            
            # Extract relevant data from stats
            headers = stats.get("headers", {})
            
            # Get token counts
            input_tokens = stats.get("input_tokens", 0)
            output_tokens = stats.get("output_tokens", 0)
            
            # Get compute time directly from token_stats if available
            compute_time = stats.get("compute_time", 0.0)
            if compute_time == 0.0 and headers:
                # Check if compute_time is in headers
                if "x-compute-time" in headers:
                    try:
                        compute_time = float(headers["x-compute-time"])
                        print(f"Using compute_time from headers: {compute_time}")
                    except (ValueError, TypeError):
                        print(f"Warning: Could not convert x-compute-time to float: {headers['x-compute-time']}")
            
            # Get equipment/GPU type directly from stats if available
            equipment = stats.get("equipment", "unknown")
            if equipment == "unknown" and headers:
                # Check if equipment is in headers
                if "x-compute-type" in headers:
                    equipment = headers["x-compute-type"]
                    print(f"Using equipment from headers: {equipment}")
            
            # If this is a cached response, mark it as such
            if stats.get("is_cached", False):
                equipment = "cache"
            
            print(f"Token counts - input: {input_tokens}, output: {output_tokens}")
            print(f"Compute time: {compute_time}, Equipment: {equipment}")
            
            # Create usage record
            usage_id = str(uuid.uuid4())
            
            # IMPORTANT: Always get cost from headers if available
            total_cost = 0.0
            if headers and 'x-total-cost' in headers:
                try:
                    total_cost = float(headers['x-total-cost'])
                    print(f"Using cost from x-total-cost header: ${total_cost}")
                except (ValueError, TypeError):
                    print(f"Warning: Could not convert x-total-cost to float: {headers['x-total-cost']}")
            
            usage_data = {
                "id": usage_id,
                "chat_id": safe_chat_id,
                "model": self.model_name,
                "equipment": equipment,
                "api_request": api_request,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "compute_time": compute_time,
                "total_cost": total_cost,  # Use the cost directly from headers
                "created_at": datetime.now().isoformat()
            }
            
            # Only add user_id if it's not None (to avoid foreign key constraint error)
            if user_id is not None:
                usage_data["user_id"] = user_id
            
            print(f"Storing LLM usage data: {json.dumps(usage_data, default=str)}")
            
            # Store in database
            try:
                result = self.supabase.table("llm_usage").insert(usage_data).execute()
                
                if result.data and len(result.data) > 0:
                    print(f"Successfully stored LLM usage data with ID {usage_id}")
                    return usage_id
                else:
                    print("Failed to store LLM usage data")
                    print(f"Result: {result}")
                    return None
            except Exception as db_error:
                print(f"Database error when storing LLM usage: {str(db_error)}")
                import traceback
                traceback.print_exc()
                # Try to reconnect to Supabase if we have connection issues
                try:
                    from supabase import create_client, Client
                    self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
                    print("Reconnected to Supabase after error")
                    # Try one more time
                    result = self.supabase.table("llm_usage").insert(usage_data).execute()
                    if result.data and len(result.data) > 0:
                        print(f"Successfully stored LLM usage data after reconnect with ID {usage_id}")
                        return usage_id
                except Exception as reconnect_error:
                    print(f"Failed to reconnect to Supabase: {str(reconnect_error)}")
                return None
                
        except Exception as e:
            print(f"Error storing LLM usage data: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def generate_response(self, context, query, user_id=None, chat_id=None, api_request="/analyze", wait_for_analysis=False):
        # Check if we have a valid API key
        if not self.api_key or "%" in self.api_key:
            if hasattr(self, 'verbose') and self.verbose:
                print("WARNING: No valid API key found, using mock response")
            if wait_for_analysis:
                # Return a message indicating analysis is still in progress
                return "Data analysis is still in progress. Please wait for the results."
            return self._mock_response(context, query)
            
        try:
            # Log the context being used
            print(f"Context for LLM: {context[:200]}...")
            print(f"USER_ID: '{user_id}' | CHAT_ID: '{chat_id}' | API_REQUEST: '{api_request}'")
            
            if user_id is None:
                print("WARNING: user_id is None in generate_response")
            if chat_id is None:
                print("WARNING: chat_id is None in generate_response")
            
            prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>{context}<|eot_id|>
            <|start_header_id|>user<|end_header_id|>Here is the query: {query}. Provide precise and concise answer. Use the analysis results and any data provided.<|eot_id|>
            <|start_header_id|>assistant<|end_header_id|>"""

            print(f"Sending request to LLM API for model: {self.model_name}")
            
            # Use new infer_and_track_cost method
            response_text, stats = self.infer_and_track_cost(prompt)
            
            # Log the stats before storing
            print(f"LLM API Stats before storing: {json.dumps(stats, default=str)}")
            
            # Ensure we have headers with cost information
            headers = stats.get("headers", {})
            if not headers or 'x-total-cost' not in headers:
                print("WARNING: Missing x-total-cost in headers. This request may not track cost correctly.")
            
            # Store usage data in database 
            # Retry logic to ensure all requests are tracked
            max_retries = 3
            attempt = 0
            usage_id = None
            
            while attempt < max_retries and usage_id is None:
                if attempt > 0:
                    print(f"Retrying database storage, attempt {attempt+1}/{max_retries}")
                usage_id = self.store_usage_data(stats, api_request, user_id, chat_id)
                attempt += 1
                if usage_id is None and attempt < max_retries:
                    print(f"Storage attempt {attempt} failed, waiting 1 second before retry...")
                    time.sleep(1)  # Add a small delay between retries
            
            if usage_id:
                print(f"Stored LLM usage data with ID: {usage_id}")
            else:
                print(f"WARNING: Failed to store usage data after {max_retries} attempts")
            
            print(f"LLM API Response: {response_text[:100]}... (Cost: ${stats['cost']:.6f}, Tokens: {stats['total_tokens']})")
            return response_text
                
        except Exception as e:
            print(f"Unexpected error in LLM API: {str(e)}")
            import traceback
            traceback.print_exc()
            if hasattr(self, 'verbose') and self.verbose:
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