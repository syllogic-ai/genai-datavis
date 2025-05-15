# This script is used to test the get_last_chart_id function
import asyncio
import os
import sys

# Add the project root to the Python path to allow for absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from apps.backend.utils.chat import get_last_chart_id

async def main():
    chat_id = "87939486-f970-4c1a-8b8d-85262607d47c"

    last_chart_id = await get_last_chart_id(chat_id=chat_id)

    if last_chart_id:
        print(f"Last chart ID: {last_chart_id}")
           
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
