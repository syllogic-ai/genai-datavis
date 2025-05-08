import asyncio
import os
import json
import time
from datetime import datetime

from dotenv import load_dotenv
import logfire
from supabase import create_client, Client
import duckdb

# Utility imports
from apps.backend.utils.redis import dequeue_task, redis_client, UPSTASH_URL
from apps.backend.utils.chat import append_chat_message
from apps.backend.core.config import configure_logfire # For Logfire setup

# Main processing function from your tools
from apps.backend.tools.calculate import process_user_request

ANALYSIS_QUEUE_NAME = "analysis_tasks"  # Should match the queue name in app/main.py

# Global Supabase client and DuckDB connection for the worker
# These will be initialized in the main worker function/setup
supabase_worker_client: Client | None = None
duckdb_worker_connection: duckdb.DuckDBPyConnection | None = None

print("[DEBUG] Worker module loaded.")

async def initialize_worker_dependencies():
    """Initializes necessary dependencies for the worker like DB connections and Logfire."""
    global supabase_worker_client, duckdb_worker_connection
    
    load_dotenv()
    configure_logfire() # Ensure logfire is configured for the worker process
    print("[DEBUG] configure_logfire() has been called in worker.")

    # Supabase setup
    SUPABASE_URL_WORKER = os.getenv("SUPABASE_URL")
    SUPABASE_KEY_WORKER = os.getenv("SUPABASE_SERVICE_KEY")
    if not SUPABASE_URL_WORKER or not SUPABASE_KEY_WORKER:
        logfire.error("Supabase URL/Key not configured for worker. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        raise ValueError("Supabase URL/Key not configured for worker.")
    supabase_worker_client = create_client(SUPABASE_URL_WORKER, SUPABASE_KEY_WORKER)
    logfire.info("Supabase client initialized for worker.")

    # DuckDB setup
    duckdb_worker_connection = duckdb.connect(database=':memory:', read_only=False)
    logfire.info("DuckDB connection initialized for worker.")

    # Check Redis connection
    if not redis_client or not UPSTASH_URL:
        logfire.error("Redis client not available in worker. UPSTASH_REDIS_URL might be missing or connection failed at startup.")
        raise ConnectionError("Redis client not available in worker. Check UPSTASH_REDIS_URL and Redis service.")
    try:
        redis_client.ping()
        logfire.info(f"Worker successfully connected to Redis at {UPSTASH_URL.split('@')[-1]}") # Avoid logging full URL with creds
    except Exception as e:
        logfire.error(f"Worker failed to connect to Redis: {e}")
        raise ConnectionError(f"Worker failed to connect to Redis: {e}")


async def process_task_from_queue():
    """
    Dequeues a task using the synchronous 'dequeue_task', then processes it asynchronously.
    Handles results and errors, sending messages back to the chat.
    Returns True if a task was dequeued (even if processing failed), False otherwise.
    """
    logfire.debug(f"Worker calling dequeue_task on queue: '{ANALYSIS_QUEUE_NAME}'...")
    
    # 'dequeue_task' is synchronous and blocks until a task is available or an error occurs.
    # This call will block this coroutine's execution at this point.
    raw_task_data = None
    task_data = None # Initialize task_data to None
    request_id = f"unknown_task_no_data_{int(time.time())}" # Default request_id
    chat_id = None # Default chat_id

    try:
        raw_task_data = dequeue_task(ANALYSIS_QUEUE_NAME)
        logfire.debug(f"dequeue_task returned: {type(raw_task_data)}", raw_data_preview=str(raw_task_data)[:250])

        if raw_task_data:
            if isinstance(raw_task_data, (str, bytes)):
                try:
                    if isinstance(raw_task_data, bytes):
                        task_data_str = raw_task_data.decode('utf-8')
                    else:
                        task_data_str = raw_task_data
                    task_data = json.loads(task_data_str)
                    logfire.info("Successfully parsed JSON task data from string/bytes.")
                except json.JSONDecodeError as jde:
                    logfire.error(f"Failed to parse task data from JSON string: {jde}", raw_data=raw_task_data)
                    # Optionally, notify an admin or a dead-letter queue here
                    return True # Task was dequeued, but parsing failed
                except Exception as e:
                    logfire.error(f"Unexpected error decoding/parsing task data: {e}", raw_data=raw_task_data)
                    return True # Task was dequeued, but parsing failed
            elif isinstance(raw_task_data, dict):
                task_data = raw_task_data
                logfire.info("Task data is already a dictionary.")
            else:
                logfire.error(f"Received unexpected data type from dequeue_task: {type(raw_task_data)}. Expected dict, str, or bytes.", data_received=raw_task_data)
                return True # Task was dequeued, but it's an unexpected type

            # Extract request_id and chat_id early for logging, if available
            request_id = task_data.get("request_id", f"unknown_task_{int(time.time())}")
            chat_id = task_data.get("chat_id")

            if not chat_id:
                logfire.error(f"Task {request_id} missing 'chat_id' after parsing. Cannot process or notify.", task_details=task_data)
                # No chat_id, so we cannot send an error message to the user.
                return True # Task was dequeued, but essential info missing

            logfire.info(f"Dequeued and parsed task {request_id} for chat {chat_id}.", task_details=task_data)
            task_start_time = time.time()

            try:
                # Ensure all required fields are present
                file_id = task_data["file_id"]
                user_prompt = task_data["user_prompt"]
                is_follow_up = task_data.get("is_follow_up", False)
                last_chart_id = task_data.get("last_chart_id")

                logfire.info(f"Processing task {request_id} for chat {chat_id}...")
                
                # Call the main analysis function (this is async)
                # It requires initialized supabase_worker_client and duckdb_worker_connection
                if not supabase_worker_client or not duckdb_worker_connection:
                    logfire.error(f"DB clients not initialized for task {request_id}. Aborting.")
                    raise ConnectionError("Worker database clients not initialized.")

                result = await process_user_request(
                    chat_id=chat_id,
                    request_id=request_id,
                    file_id=file_id,
                    user_prompt=user_prompt,
                    is_follow_up=is_follow_up,
                    last_chart_id=last_chart_id,
                    duck_connection=duckdb_worker_connection,
                    supabase_client=supabase_worker_client
                )
                
                processing_time = time.time() - task_start_time
                logfire.info(
                    f"Task {request_id} processed successfully in {processing_time:.2f}s.", 
                    result_summary=result.get("answer", "No answer provided")[:150] + "..."
                )

                # Construct the message payload for append_chat_message
                chat_message_payload = {
                    "role": "system", # Or "assistant"
                    "content": result.get("answer", "Analysis complete."),
                    "created_at": datetime.now().isoformat(),
                    "request_id": request_id,
                }
                if result.get("chart_id"):
                    chat_message_payload["chart_id"] = result.get("chart_id")
                
                # If insights are separate and need to be stored/sent, handle here.
                # For now, assuming result["answer"] contains the textual insight.

                await append_chat_message(chat_id, chat_message_payload)
                logfire.info(f"Result for task {request_id} sent to chat {chat_id}.")

            except KeyError as e:
                processing_time = time.time() - task_start_time
                logfire.error(
                    f"Task {request_id} missing required field: {e}. Processing time: {processing_time:.2f}s",
                    task_data=task_data, # task_data might be None if parsing failed and we didn't return early
                    exc_info=True
                )
                error_content = f"Sorry, there was an issue with your request (ID: {request_id}). It was missing some information: {e}."
                if chat_id: # Check if chat_id is available before attempting to send message
                    try:
                        await append_chat_message(chat_id, {
                            "role": "system", "content": error_content, 
                            "created_at": datetime.now().isoformat(), "request_id": request_id, "error": True
                        })
                    except Exception as notify_err:
                        logfire.error(f"Failed to send KeyError notification for task {request_id} to chat {chat_id}: {notify_err}")
                else:
                    logfire.error(f"Cannot send KeyError notification for task {request_id} as chat_id is missing.")
            except Exception as e:
                processing_time = time.time() - task_start_time
                logfire.error(
                    f"Error processing task {request_id} after {processing_time:.2f}s: {e}",
                    error_type=type(e).__name__,
                    task_data=task_data, # task_data might be None here too
                    exc_info=True
                )
                error_content = f"Sorry, an unexpected error occurred while processing your request (ID: {request_id}). Please try again later."
                if chat_id: # Check if chat_id is available
                    try:
                        await append_chat_message(chat_id, {
                            "role": "system", "content": error_content,
                            "created_at": datetime.now().isoformat(), "request_id": request_id, "error": True
                        })
                    except Exception as notify_err:
                        logfire.error(f"Failed to send general error notification for task {request_id} to chat {chat_id}: {notify_err}")
                else:
                    logfire.error(f"Cannot send general error notification for task {request_id} as chat_id is missing.")
        else:
            # This case implies dequeue_task returned None without raising an exception,
            # which might happen if redis_client became None after startup OR if the queue was empty and dequeue_task has a timeout.
            logfire.debug("dequeue_task returned None. No task available or Redis issue.")
            return False # No task was dequeued
            # No sleep here, main_worker_loop's sleep/retry logic will handle pauses if this becomes frequent
            # If dequeue_task is blocking, this branch should rarely be hit unless redis connection itself is lost
            # and dequeue_task is designed to return None in that case rather than raise.
    except Exception as e:
        logfire.error(f"Error during dequeue_task from '{ANALYSIS_QUEUE_NAME}': {e}", exc_info=True)
        # Consider if this case implies a task was "attempted" to be dequeued.
        # If dequeue_task itself raises an exception, it means an attempt was made.
        # However, if the goal is to count *successful* dequeues (even if processing fails later),
        # this might still be considered a "no task obtained" scenario.
        # For simplicity, let's say an error *during* dequeue means no task was effectively obtained.
        await asyncio.sleep(5) # Wait before trying to listen again if dequeue itself fails
        return False # Error during dequeue attempt

    return True # If we reached here, a task was dequeued and processing was attempted

async def main_worker_loop():
    """Main loop for the worker. Initializes dependencies and continuously processes tasks."""
    try:
        await initialize_worker_dependencies()
    except Exception as e:
        logfire.critical(f"Worker failed to initialize dependencies: {e}. Exiting.", exc_info=True)
        return # Cannot run without dependencies

    logfire.info("Worker initialized successfully. Starting main processing loop.")
    consecutive_empty_dequeues = 0
    max_empty_before_log_spam_reduction = 5 # Log every empty dequeue for the first few times, then less often
    
    while True:
        try:
            task_processed_or_attempted = await process_task_from_queue()
            # Reset counter if a task was potentially processed (or an error occurred during processing)
            # If process_task_from_queue returns because dequeue_task returned None, it will be handled below
            if not task_processed_or_attempted: # True if dequeue_task returned None (no task)
                consecutive_empty_dequeues += 1
            else:
                consecutive_empty_dequeues = 0 # Reset if task processed or error in processing

            if consecutive_empty_dequeues > 0:
                if consecutive_empty_dequeues < max_empty_before_log_spam_reduction or consecutive_empty_dequeues % 60 == 0: # Log every minute after initial burst
                    logfire.info(f"Worker polling... No task dequeued for {consecutive_empty_dequeues} attempts. Will continue listening.")
                await asyncio.sleep(1) # Short sleep if queue is empty to prevent tight loop if dequeue_task is not perfectly blocking or has short timeout
            else:
                # If a task was processed or there was an error during processing, loop immediately
                # unless specific error handling below adds a delay.
                pass # No explicit sleep, go straight to next iteration.

        except ConnectionRefusedError as e: # More specific Redis connection errors
            logfire.critical(f"Redis connection refused: {e}. Is Redis running/accessible? Retrying in 30s...")
            await asyncio.sleep(30)
        except ConnectionError as e: # Catch Redis connection errors from initialize_worker_dependencies or redis ops
             logfire.critical(f"Redis Connection Error: {e}. Attempting to re-initialize and retry in 30s...")
             await asyncio.sleep(30)
             try:
                 await initialize_worker_dependencies() # Re-initialize all, including Redis check
             except Exception as init_e:
                 logfire.critical(f"Failed to re-initialize dependencies after connection error: {init_e}. Waiting longer (60s).")
                 await asyncio.sleep(60)
        except Exception as e:
            logfire.critical(f"Unhandled exception in main_worker_loop: {e}", exc_info=True)
            # Avoid rapid restart loops for unknown critical errors
            await asyncio.sleep(15)
            consecutive_empty_dequeues = 0 # Reset counter after a major unhandled exception

if __name__ == "__main__":
    # The worker uses asyncio for its core processing logic (process_user_request, append_chat_message).
    # The dequeue_task is currently synchronous. asyncio.run will manage the event loop.
    print("Starting GenAI DataVis Background Worker...")
    logfire.info("GenAI DataVis Background Worker process starting.")
    asyncio.run(main_worker_loop())
    logfire.info("GenAI DataVis Background Worker process stopped.")
    print("GenAI DataVis Background Worker stopped.") 