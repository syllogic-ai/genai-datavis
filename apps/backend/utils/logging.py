import uuid

from ..core.models import LLMUsageRow
from ..core.config import supabase

# Helper function for UUID generation
def uuid_str() -> str:
    return str(uuid.uuid4()) 

def _log_llm(usage: LLMUsageRow) -> str:
    """
    Logs LLM usage metrics to the llm_usage table in Supabase.
    
    Args:
        usage: LLMUsageRow model containing usage metrics
        
    Returns:
        The ID of the inserted record
    """    
    # Prepare the data for insertion
    usage_data = {
        "request_id": usage.request_id,
        "chat_id": usage.chat_id,
        "model": usage.model,
        "provider": usage.provider,
        "api_request": usage.api_request,
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "compute_time": usage.compute_time,
        "total_cost": usage.total_cost,
    }
    
    # Insert the record into the llm_usage table
    supabase.table("llm_usage").insert(usage_data).execute()

