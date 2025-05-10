
import asyncio
import os
import sys

# Add the project root to the Python path to allow for absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from apps.backend.utils.chat import get_message_history

async def main():
    chat_id = "87939486-f970-4c1a-8b8d-85262607d47c"
    last_n = 5

    print(f"Attempting to get message history for chat_id: {chat_id}, last_n: {last_n}")

    messages = await get_message_history(chat_id=chat_id, last_n=last_n)

    if messages:
        print("\nMessage History:")
        for i, msg in enumerate(messages):
            print(f"  Message {i+1}:")
            print(f"    Role: {msg.get('role')}")
            print(f"    Content: {msg.get('content')}")
            print(f"    Timestamp: {msg.get('timestamp')}")
    else:
        print("No messages found or an error occurred.")

if __name__ == "__main__":
    # Ensure Supabase client is initialized by importing config
    # This is a bit of a workaround to ensure the Supabase client in config.py is ready
    try:
        from apps.backend.core import config
        if config.supabase:
            print("Supabase client initialized via config import.")
        else:
            print("Supabase client not initialized after config import.")
    except ImportError as e:
        print(f"Could not import config for Supabase initialization: {e}")
        sys.exit(1)
    except AttributeError:
        print("Supabase client likely not initialized in config.py.")
        sys.exit(1)

    asyncio.run(main())
