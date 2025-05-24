import os
from typing import Any, Dict, List, Optional, Union, Literal
import ssl
import uuid
import asyncio
import json
import time
import re
from datetime import datetime

from apps.backend.utils.chat import append_chat_message, convert_chart_data_to_chart_config, get_last_chart_id_from_chat_id, get_message_history, get_last_chart_id, remove_null_pairs, update_chart_specs
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.utils import get_data, filter_messages_to_role_content
from apps.backend.utils.files import extract_schema_sample, get_column_unique_values as get_unique_values
import duckdb
import logfire
from logfire import span
import pandas as pd
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry
from supabase import create_client, Client
from dotenv import dotenv_values
from pydantic_ai.messages import ModelMessagesTypeAdapter
from httpx import AsyncClient

from apps.backend.core.config import async_supabase as sb
from apps.backend.core.models import Deps, DatasetProfile
from apps.backend.services.orchestrator_agent import orchestrator_agent


# Fix SSL certificate verification issues for macOS
ssl._create_default_https_context = ssl._create_unverified_context

# Configure Logfire - this should be called once at application startup
# This is defined here for convenience but should be moved to a central place
logfire.configure()
logfire.instrument_pydantic_ai()

################################
# Main Handler Function
################################

async def process_user_request(
    chat_id: str,
    request_id: str,
    file_id: str,
    user_prompt: str,
    is_follow_up: bool = False,
    last_chart_id: Optional[str] = None,
    duck_connection: Optional[duckdb.DuckDBPyConnection] = None,
    supabase_client: Optional[Client] = None
) -> Dict[str, Any]:
    """
    Process a user request through the multi-agent system.
    
    Args:
        chat_id: ID of the chat session
        request_id: Unique ID for this request
        file_id: ID of the dataset file
        user_prompt: The user's question or request
        is_follow_up: Whether this is a follow-up question
        last_chart_id: ID of the last chart (if any)
        duck_connection: DuckDB connection (created if not provided)
        supabase_client: Supabase client (created if not provided)
        
    Returns:
        Dict containing the final response
    """
    # Create a span for the entire request processing
    start_time = time.time()
    
    logfire.info("Processing user request", 
               chat_id=chat_id, 
               request_id=request_id,
               file_id=file_id,
               is_follow_up=is_follow_up)
    
    # Create DuckDB connection if not provided
    if duck_connection is None:
        duck_connection = duckdb.connect(database=':memory:')
    
    # Create Supabase client if not provided
    if supabase_client is None:
        supabase_client = sb
    
    # Get message history
    message_history = await get_message_history(chat_id)
    
    # Create dependencies
    deps = Deps(
        chat_id=chat_id,
        request_id=request_id,
        file_id=file_id,
        user_prompt=user_prompt,
        last_chart_id=last_chart_id,
        is_follow_up=is_follow_up,
        duck=duck_connection,
        supabase=supabase_client,
        message_history=message_history
    )
    
    try:
        # Run the orchestrator agent which will manage the workflow
        result = await orchestrator_agent.run(
            user_prompt,
            deps=deps,
        )
        
        logfire.info(
            "Orchestrator result",
            usage=result.usage
        )
       
        output = result.output
        
        # Format the response
        response = {
            "answer": output.answer,
            "request_id": request_id,
            "chat_id": chat_id,
        }
        
        # Add chart ID if available
        if output.chart_id:
            response["chart_id"] = output.chart_id
        
        # Add insights if available
        if output.insights:
            response["insights"] = output.insights
        
        end_time = time.time()
        duration = end_time - start_time
        
        _log_llm(result.usage(), orchestrator_agent, duration, deps.chat_id, deps.request_id)  
        
        logfire.info("Request processed successfully", 
                   execution_time=end_time - start_time,
                   chat_id=chat_id, 
                   request_id=request_id)
        
        return response
    
    except Exception as e:
        end_time = time.time()
        
        logfire.error("Error processing user request",
                     execution_time=end_time - start_time, 
                     error=str(e),
                     error_type=type(e).__name__,
                     chat_id=chat_id,
                     request_id=request_id)
        
        # Re-raise the exception after logging it
        raise