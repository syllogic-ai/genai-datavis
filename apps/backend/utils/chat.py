from typing import Dict, Any, List
import os
from datetime import datetime
from dotenv import load_dotenv
import sys
from supabase import Client
import pandas as pd
import numpy as np


# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import supabase from the core configuration
from apps.backend.core.config import async_supabase


# Add a utility function to update the chat conversation in Supabase
async def append_chat_message(chat_id: str, message: Dict[str, Any]) -> bool:
    """
    Append a message to the chat conversation in Supabase.
    
    Args:
        chat_id: The ID of the chat to update
        message: The message to append to the conversation
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Make sure message has a timestamp
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()
            
        # First, get the current conversation
        chat_data = await async_supabase.table("chats").select("conversation").eq("id", chat_id).execute()
        
        if not chat_data.data or len(chat_data.data) == 0:
            print(f"Chat with ID {chat_id} not found")
            return False
            
        # Get the current conversation array
        current_conversation = chat_data.data[0].get("conversation", [])
        
        # Append the new message
        updated_conversation = current_conversation + [message]
        
        # Update the conversation in Supabase
        # Use updated_at instead of updatedAt to match the database schema
        update_result = await async_supabase.table("chats").update({
            "conversation": updated_conversation,
            "updated_at": datetime.now().isoformat()
        }).eq("id", chat_id).execute()
        
        if not update_result.data or len(update_result.data) == 0:
            print(f"Failed to update conversation for chat {chat_id}")
            return False
            
        print(f"Successfully appended message to chat {chat_id}")
        return True
        
    except Exception as e:
        print(f"Error appending chat message: {str(e)}")
        return False

async def get_message_history(chat_id: str, last_n: int = None) -> List[Dict[str, Any]]:
    """
    Get the message history for a given chat ID.
    
    Args:
        chat_id: The ID of the chat to get the message history for
        last_n: Optional. If provided, only get the last n messages. If None, get all messages.

    Returns:
        List[Dict[str, Any]]: A list of messages in the chat
    """
    try:
        if last_n is not None:
            # Use the RPC function to get last n messages
            result = await async_supabase.rpc('get_last_messages', {
                'chat_id': chat_id,
                'n': last_n
            }).execute()
            
            if result.data is None:
                print(f"Chat with ID {chat_id} not found")
                return []
                
            # The RPC function returns JSONB, which is already parsed
            return result.data
        else:
            # Get all messages using the original approach
            chat_data = await async_supabase.table("chats").select("conversation").eq("id", chat_id).execute()
            
            if not chat_data.data or len(chat_data.data) == 0:
                print(f"Chat with ID {chat_id} not found")
                return []
                
            # Return the conversation array
            return chat_data.data[0].get("conversation", [])
        
    except Exception as e:
        print(f"Error getting message history for chat {chat_id}: {str(e)}")
        return []

async def update_chart_specs(chart_id: str, chart_specs: Dict[str, Any]) -> bool:
    """
    Update the chart_specs entry in the given chat_id.
    
    Args:
        chat_id: The ID of the chat to update
        chart_specs: The chart specs to update
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Update the chart_specs for the given chat_id
        update_result = await async_supabase.table("charts").update({
            "chart_specs": chart_specs,
            "chart_type": chart_specs["chartType"]
        }).eq("id", chart_id).execute()
            
        if not update_result.data or len(update_result.data) == 0:
            print(f"Failed to update chart_specs for chart {chart_id}")
            return False
            
        print(f"Successfully updated chart_specs for chart {chart_id}")
        return True
        
    except Exception as e:
        print(f"Error updating chart_specs: {str(e)}")
        return False

async def convert_data_to_chart_data(data_cur: pd.DataFrame, data_cols: list[str], x_key: str) -> list[dict]:
    """
    Convert the data to a chart data array.

    Args:
        data_cur: The current data
        data_cols: The Y-axis columns to convert
        x_key: The X-axis column to use

    Returns:
        list[dict]: The chart data array
    """
    chart_data_array = []
    for i in range(min(len(data_cur), 100)):  # Limit to 100 data points
        item = {}
        item[x_key] = data_cur.iloc[i][x_key]
        for col in data_cols:
            item[col] = convert_value(data_cur.iloc[i][col])
        chart_data_array.append(item)
    return chart_data_array 

async def get_chart_specs(chart_id: str, supabase: Client) -> Dict[str, Any]:
    """
    Get the chart specs for a given chart ID.
    """
    chart_specs = await async_supabase.table("charts").select("chart_specs").eq("id", chart_id).execute()
    return chart_specs.data[0]["chart_specs"]

async def get_last_chart_id(chat_id: str) -> str | None:
    """
    Get the last chart message ID for a given chat ID.

    Args:
        chat_id: The ID of the chat to get the last chart message for.

    Returns:
        str | None: The message content of the last chart message, or None if not found.
    """
    try:
        result = await async_supabase.rpc('get_last_chart_message', {
            'chat_id': chat_id
        }).execute()

        if result.data is None or result.data == '':
            print(f"No chart message found for chat ID {chat_id}")
            return None
            
        # The RPC function is expected to return a single text value
        return result.data
        
    except Exception as e:
        print(f"Error getting last chart ID for chat {chat_id}: {str(e)}")
        return None

async def get_last_chart_id_from_chat_id(chat_id: str) -> str | None:
    """
    Get the last chart message ID for a given chat ID.
    """
    result = await async_supabase.table("charts").select("id").eq("chat_id", chat_id).order("created_at", desc=True).limit(1).execute()
    return result.data[0]["id"] if result.data else None


# =============================================== Helper functions ===============================================
def convert_value(value):
    if pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype)):
        return value.isoformat()
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    if isinstance(value, (np.bool_)):
        return bool(value)
    return value

def convert_chart_data_to_chart_config(data_cols: list[str], colors: list[str]) -> dict:
    chart_config = {}
    for i, col in enumerate(data_cols):
        chart_config[col] = {
            "color": colors[i % len(colors)],
            "label": col.replace("_", " ").lower()
        }
    return chart_config

def remove_null_pairs(d):
    """
    Recursively removes key-value pairs from a dictionary where the value is None.
    Args:
        d (dict): The dictionary to process
    Returns:
        dict: A new dictionary with None values removed
    """
    if not isinstance(d, dict):
        return d
        
    result = {}
    for key, value in d.items():
        if value is None:
            # Skip None values
            continue
            
        if isinstance(value, dict):
            # Recursively process nested dictionaries
            nested_result = remove_null_pairs(value)
            if nested_result:  # Only add if the nested dict is not empty
                result[key] = nested_result
        elif isinstance(value, list):
            # Process lists that might contain dictionaries
            processed_list = [remove_null_pairs(item) if isinstance(item, dict) else item for item in value]
            # Filter out None values from the list
            processed_list = [item for item in processed_list if item is not None]
            if processed_list:  # Only add if the list is not empty
                result[key] = processed_list
        else:
            # For non-dict, non-list values, keep them as is
            result[key] = value
            
    return result
