import uuid
from datetime import datetime
import logfire

from ..core.models import LLMUsageRow
from ..core.config import async_supabase

# Helper function for UUID generation
def uuid_str() -> str:
    return str(uuid.uuid4()) 


def get_cost(model: str, provider: str, input_tokens: int, output_tokens: int) -> float:
    """
    Calculates the cost of an LLM call based on the model, provider, and token usage.
    
    Args:
        model: The name of the LLM model
        provider: The provider of the LLM model
        input_tokens: The number of input tokens used
        output_tokens: The number of output tokens used
        
    Returns:
        The cost of the LLM call
        
    """
    
    if provider == "openai":
        if model == "gpt-4o":
            input_cost = 2.50 / 1000000
            output_cost = 10.00 / 1000000
        elif model == "gpt-4o-mini":
            input_cost = 0.015 / 1000000
            output_cost = 0.60 / 1000000
        elif model == "gpt-4.1":
            input_cost = 2.00 / 1000000
            output_cost = 8.00 / 1000000
        elif model == "gpt-4.1-mini":
            input_cost = 0.40 / 1000000
            output_cost = 1.60 / 1000000
        elif model == "o3":
            input_cost = 2.00 / 1000000
            output_cost = 8.00 / 1000000
        else:
            return 0
        
        # Calculate the raw cost
        raw_cost = (input_cost * input_tokens + output_cost * output_tokens)
        # Round to 6 decimal places
        rounded_cost = round(raw_cost, 6)
        
        return rounded_cost
    
    elif provider == "anthropic":
        return 0
    elif provider == "google":
        return 0
    else:
        return 0
        
        
async def _log_llm(usage: any, agent: any, duration: float, chat_id: str, request_id: str) -> str:
    """
    Logs LLM usage metrics to the llm_usage table in Supabase.
    
    Args:
        usage: LLMUsageRow model containing usage metrics
        
    Returns:
        The ID of the inserted record
    """    
    
    cost = get_cost(agent.model.model_name, agent.model.system, usage.request_tokens, usage.response_tokens)
    
    # Fetch user_id from chats table
    user_id = None
    try:
        chat_record = async_supabase.table("chats").select("user_id").eq("id", chat_id).single().execute()
        if chat_record.data:
            user_id = chat_record.data.get("user_id")
    except Exception as e:
        logfire.warn(f"Could not fetch user_id for chat {chat_id}: {e}")

    
    request_tokens = usage.request_tokens
    response_tokens = usage.response_tokens
    duration = duration
    cost = cost
    model = agent.model.model_name
    provider = agent.model.system
    api_request = agent.name
    
    print("--------------------------------")
    print(f"request_id: {request_id}")
    print(f"chat_id: {chat_id}")    
    print(f"model: {model}")
    print(f"provider: {provider}")
    print(f"api_request: {api_request}")
    print(f"request_tokens: {request_tokens}")
    print(f"response_tokens: {response_tokens}")
    print(f"duration: {duration}")
    print(f"cost: {cost}")
    print("--------------------------------")
    
    # Prepare the data for insertion
    usage_data = {
        "id": uuid_str(),
        "user_id": user_id,
        "chat_id": chat_id,
        "model": model,
        "input_tokens": request_tokens,
        "output_tokens": response_tokens,
        "total_cost": cost,
        "created_at": datetime.now().isoformat(),
    }
    
    # Insert the record into the llm_usage table
    async_supabase.table("llm_usage").insert(usage_data).execute()

