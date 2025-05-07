from typing import Dict, Any
import os
from datetime import datetime
from dotenv import load_dotenv
import sys
from supabase import Client


# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import supabase from the core configuration
from apps.backend.core.config import supabase


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
        chat_data = supabase.table("chats").select("conversation").eq("id", chat_id).execute()
        
        if not chat_data.data or len(chat_data.data) == 0:
            print(f"Chat with ID {chat_id} not found")
            return False
            
        # Get the current conversation array
        current_conversation = chat_data.data[0].get("conversation", [])
        
        # Append the new message
        updated_conversation = current_conversation + [message]
        
        # Update the conversation in Supabase
        # Use updated_at instead of updatedAt to match the database schema
        update_result = supabase.table("chats").update({
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

