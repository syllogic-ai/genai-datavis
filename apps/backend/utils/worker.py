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
from apps.backend.utils.redis import dequeue_task, redis_client, UPSTASH_URL, SmartRedisQueue
from apps.backend.utils.chat import append_chat_message
from apps.backend.core.config import configure_logfire # For Logfire setup

# Main processing function from your tools
from apps.backend.tools.llm_interaction import process_user_request

ANALYSIS_QUEUE_NAME = "analysis_tasks"  # Should match the queue name in app/main.py

# Global Supabase client and DuckDB connection for the worker
# These will be initialized in the main worker function/setup
supabase_worker_client: Client | None = None
duckdb_worker_connection: duckdb.DuckDBPyConnection | None = None
redis_queue: SmartRedisQueue | None = None

# Configure local logger for worker-specific output
import logging
logger = logging.getLogger("worker")
logger.setLevel(logging.INFO)

logger.info("Worker module loaded.")

async def initialize_worker_dependencies():
    """Initializes necessary dependencies for the worker like DB connections and Logfire."""
    global supabase_worker_client, duckdb_worker_connection, redis_queue

    # Supabase setup
    SUPABASE_URL_WORKER = os.getenv("SUPABASE_URL")
    SUPABASE_KEY_WORKER = os.getenv("SUPABASE_SERVICE_KEY")
    if not SUPABASE_URL_WORKER or not SUPABASE_KEY_WORKER:
        raise ValueError("Supabase URL/Key not configured for worker.")
    supabase_worker_client = create_client(SUPABASE_URL_WORKER, SUPABASE_KEY_WORKER)
    logfire.info("Supabase client initialized for worker.")

    # DuckDB setup
    duckdb_worker_connection = duckdb.connect(database=':memory:', read_only=False)

    # Check Redis connection
    if not redis_client or not UPSTASH_URL:
        raise ConnectionError("Redis client not available in worker. Check UPSTASH_REDIS_URL and Redis service.")
    try:
        redis_client.ping()
        # Initialize the SmartRedisQueue for analysis tasks
        redis_queue = SmartRedisQueue(ANALYSIS_QUEUE_NAME, redis_client)
        logfire.info(f"SmartRedisQueue initialized for {ANALYSIS_QUEUE_NAME}")
    except Exception as e:
        raise ConnectionError(f"Worker failed to connect to Redis: {e}")


async def process_task_from_queue():
    """
    Dequeues a task using SmartRedisQueue, then processes it asynchronously.
    Handles results and errors, sending messages back to the chat.
    Returns True if a task was dequeued (even if processing failed), False otherwise.
    """
    
    # Check if redis_queue is initialized
    if not redis_queue:
        logger.error("Redis queue not initialized. Cannot dequeue tasks.")
        return False
    
    raw_task_data = None
    task_data = None # Initialize task_data to None
    request_id = f"unknown_task_no_data_{int(time.time())}" # Default request_id
    chat_id = None # Default chat_id

    try:
        # Use the smart queue to dequeue a task
        # This will handle backoff internally when the queue is empty
        task_data = redis_queue.dequeue(timeout=0)

        if task_data:
            # Extract request_id and chat_id early for logging
            request_id = task_data.get("request_id", f"unknown_task_{int(time.time())}")
            chat_id = task_data.get("chat_id")
            
            logfire.info(
                "Task dequeued from queue",
                request_id=request_id,
                queue_name=ANALYSIS_QUEUE_NAME,
                chat_id=chat_id
            )

            if not chat_id:
                logger.error(f"Dequeued task has no chat_id, cannot process: {request_id}")
                # No chat_id, so we cannot send an error message to the user.
                return True # Task was dequeued, but essential info missing

            task_start_time = time.time()

            try:
                # Ensure all required fields are present
                file_id = task_data["file_id"]
                user_prompt = task_data["user_prompt"]
                is_follow_up = task_data.get("is_follow_up", False)
                last_chart_id = task_data.get("last_chart_id")
                
                logger.info(f"Processing task {request_id} for chat {chat_id}, file {file_id}")

                # Call the main analysis function (this is async)
                # It requires initialized supabase_worker_client and duckdb_worker_connection
                if not supabase_worker_client or not duckdb_worker_connection:
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
                    "Task processed successfully", 
                    request_id=request_id,
                    processing_time=processing_time,
                    has_chart=result.get("chart_id") is not None
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
                
                # Send message to the chat
                await append_chat_message(chat_id, chat_message_payload)
                logger.info(f"Sent analysis results to chat {chat_id} for request {request_id}")

            except KeyError as e:
                processing_time = time.time() - task_start_time
                error_message = f"Missing required field: {e}"
                
                logfire.error(
                    "Task processing failed due to missing required field",
                    request_id=request_id,
                    chat_id=chat_id,
                    error=error_message,
                    processing_time=processing_time
                )
                
                error_content = f"Sorry, there was an issue with your request (ID: {request_id}). It was missing some information: {e}."
                if chat_id: 
                    try:
                        await append_chat_message(chat_id, {
                            "role": "system", 
                            "content": error_content, 
                            "created_at": datetime.now().isoformat(), 
                            "request_id": request_id, 
                            "error": True
                        })
                    except Exception as notify_err:
                        logger.error(f"Failed to send KeyError notification for task {request_id} to chat {chat_id}: {notify_err}")
            
            except Exception as e:
                processing_time = time.time() - task_start_time
                error_message = str(e)
                
                logfire.error(
                    "Task processing failed with exception",
                    request_id=request_id,
                    chat_id=chat_id,
                    error=error_message,
                    error_type=type(e).__name__,
                    processing_time=processing_time
                )
                
                error_content = f"Sorry, an unexpected error occurred while processing your request (ID: {request_id}). Please try again later."
                if chat_id:
                    try:
                        await append_chat_message(chat_id, {
                            "role": "system", 
                            "content": error_content,
                            "created_at": datetime.now().isoformat(), 
                            "request_id": request_id, 
                            "error": True
                        })
                    except Exception as notify_err:
                        logger.error(f"Failed to send error notification for task {request_id} to chat {chat_id}: {notify_err}")
            
            return True # Task was processed (successfully or not)
        
        return False # No task was dequeued
    
    except Exception as e:
        logger.error(f"Unhandled exception in process_task_from_queue: {e}")
        import traceback
        traceback.print_exc()
        logfire.error(
            "Unhandled exception in worker",
            error=str(e),
            error_type=type(e).__name__,
            request_id=request_id
        )
        return False # Error during dequeue attempt

async def main_worker_loop():
    """Main loop for the worker. Initializes dependencies and continuously processes tasks."""
    try:
        await initialize_worker_dependencies()
    except Exception as e:
        logger.error(f"Worker failed to initialize dependencies: {e}. Exiting.")
        logfire.error("Worker initialization failed", error=str(e))
        return # Cannot run without dependencies

    logger.info("Worker initialized successfully. Starting main processing loop.")
    logfire.info("Worker initialized and ready for processing")
    
    # Track metrics for monitoring
    tasks_processed = 0
    last_activity_time = time.time()
    health_check_interval = 300  # 5 minutes
    last_health_check = time.time()
    
    while True:
        try:
            task_processed = await process_task_from_queue()
            
            if task_processed:
                tasks_processed += 1
                last_activity_time = time.time()
            
            # Periodically log health metrics (every 5 minutes or after processing 100 tasks)
            current_time = time.time()
            if (current_time - last_health_check > health_check_interval or 
                tasks_processed % 100 == 0 and tasks_processed > 0):
                
                # Get queue length for metrics
                queue_length = redis_queue.get_length() if redis_queue else -1
                
                logfire.info(
                    "Worker health check",
                    uptime=int(current_time - last_health_check),
                    tasks_processed=tasks_processed,
                    current_queue_length=queue_length,
                    time_since_last_task=int(current_time - last_activity_time)
                )
                last_health_check = current_time
            
            # The SmartRedisQueue handles its own backoff, so we don't need to add sleep here
            # Just a minimal sleep to prevent CPU throttling in case of issues
            await asyncio.sleep(0.01)

        except ConnectionRefusedError as e: # More specific Redis connection errors
            logger.error(f"Redis connection refused: {e}. Is Redis running/accessible? Retrying in 30s...")
            logfire.error("Redis connection refused", error=str(e))
            await asyncio.sleep(30)
            # Try to re-initialize
            try:
                await initialize_worker_dependencies()
            except Exception:
                pass  # Already logged in initialize_worker_dependencies
                
        except ConnectionError as e: # Catch Redis connection errors
            logger.error(f"Redis Connection Error: {e}. Attempting to re-initialize and retry in 30s...")
            logfire.error("Redis connection error", error=str(e))
            await asyncio.sleep(30)
            try:
                await initialize_worker_dependencies() # Re-initialize all, including Redis check
            except Exception as init_e:
                logger.error(f"Failed to re-initialize dependencies after connection error: {init_e}. Waiting longer (60s).")
                await asyncio.sleep(60)
                
        except Exception as e:
            logger.error(f"Unhandled exception in main_worker_loop: {e}")
            import traceback
            traceback.print_exc()
            logfire.error(
                "Unhandled exception in worker main loop",
                error=str(e),
                error_type=type(e).__name__
            )
            # Avoid rapid restart loops for unknown critical errors
            await asyncio.sleep(15)

if __name__ == "__main__":
    # Configure Logfire for observability
    configure_logfire()
    
    logger.info("Starting GenAI DataVis Background Worker...")
    logfire.info("Worker process starting")
    
    asyncio.run(main_worker_loop())
    
    logger.info("GenAI DataVis Background Worker stopped.")
    logfire.info("Worker process stopped") 