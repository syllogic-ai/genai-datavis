import os
import json
from dotenv import load_dotenv
from pathlib import Path
from upstash_redis import Redis
import inspect # Import the inspect module
import time # Import the time module

# Navigate to the correct .env.local path
env_path = Path(__file__).resolve().parent.parent / ".env.local"

# print(f"Loading from: {env_path}")
# print("File exists:", env_path.exists())

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Get Upstash Redis URL and Token from environment variables
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

# Removed the temporary debug print for the old REDIS_URL

if not UPSTASH_URL:
    raise ValueError("UPSTASH_REDIS_REST_URL environment variable not set.")
if not UPSTASH_TOKEN:
    raise ValueError("UPSTASH_REDIS_REST_TOKEN environment variable not set.")

# Connect to Upstash Redis using the upstash-redis SDK
redis_client: Redis | None = None # Ensure redis_client is defined before try block
try:
    redis_client = Redis(url=UPSTASH_URL, token=UPSTASH_TOKEN)
    redis_client.ping() # Test the connection
    print("Successfully connected to Upstash Redis using upstash-redis SDK!")
except Exception as e: # Catch any exceptions during connection setup
    print(f"Error connecting to Upstash Redis using upstash-redis SDK: {e}")
    redis_client = None # Set to None if connection fails

def enqueue_task(queue_name: str, task_data: dict) -> str | None:
    """
    Enqueues a task to the specified Redis queue.
    Args:
        queue_name: The name of the queue.
        task_data: A dictionary containing the task data.
    Returns:
        The result of rpush (typically number of elements in list after push), or None if error.
    """
    if not redis_client:
        print("Upstash Redis client not available. Task not enqueued.")
        return None
    try:
        # rpush returns the length of the list after the push operation.
        # We'll consider this successful if no exception is raised.
        # The task_id semantic might change slightly; Upstash rpush returns integer length.
        # For consistency with previous use, we might just return a conceptual ID or handle it differently.
        # For now, let's assume success if it doesn't error and we can return a simple confirmation.
        # Let's use a fixed string or a part of task_data as a placeholder if an ID is strictly needed
        # or simply rely on the operation not throwing an error.
        redis_client.rpush(queue_name, json.dumps(task_data))
        # If we need a unique ID and rpush doesn't provide one directly that fits the old model:
        # One option is to just confirm enqueue based on no error.
        # Another is to generate one, but that's not what rpush returns.
        # For now, let's say success is just the operation completing.
        # The previous code returned str(task_id) where task_id was the result of rpush.
        # The redis library's rpush returns the number of items in the list.
        # The upstash-redis library's rpush also returns the integer length of the list.
        task_identifier = f"{queue_name}:{task_data.get('request_id', 'no_request_id')}" # Conceptual identifier
        print(f"Task enqueued to {queue_name}. Conceptual ID: {task_identifier}")
        return task_identifier # Return a conceptual identifier
    except Exception as e:
        print(f"Error enqueuing task to Upstash Redis: {e}")
        return None

def dequeue_task(queue_name: str, timeout: int = 0) -> dict | None:
    """
    Dequeues a task from the specified Redis queue using LPOP with polling to simulate BLPOP.
    Args:
        queue_name: The name of the queue.
        timeout: Timeout in seconds. 0 means block indefinitely.
    Returns:
        A dictionary containing the task data, or None if an error or timeout occurs.
    """
    if not redis_client:
        print("Upstash Redis client not available. Cannot dequeue task.")
        return None
    try:
        print(f"[DEBUG_REDIS] In try block in dequeue_task.", flush=True)
        if redis_client:
            print(f"[DEBUG_REDIS] redis_client type before lpop: {type(redis_client)}", flush=True)
            print(f"[DEBUG_REDIS] Source file of Redis class: {inspect.getfile(type(redis_client))}", flush=True)
            print(f"[DEBUG_REDIS] Attributes of redis_client: {dir(redis_client)}", flush=True)
        else:
            print(f"[DEBUG_REDIS] redis_client IS None before lpop.", flush=True)
        
        # For non-blocking behavior or if timeout is 0
        result = redis_client.lpop(queue_name)
        
        # If we want blocking behavior and no result was found
        start_time = time.time()
        while not result and timeout != 0:
            # If a timeout was specified, check if we've exceeded it
            if timeout > 0 and (time.time() - start_time) > timeout:
                print(f"Dequeue from {queue_name} timed out after {timeout}s.")
                return None
            
            # Sleep for a short time before retrying
            time.sleep(0.5)
            result = redis_client.lpop(queue_name)
        
        print(f"[DEBUG_REDIS] lpop call completed. Result: {result is not None}", flush=True)
        if result:
            # With lpop, the result is directly the value, not a tuple like with blpop
            task_json = result
            task_data = json.loads(task_json)
            print(f"Task dequeued from {queue_name}: {task_data.get('request_id', 'N/A')}")
            return task_data
        else:
            # This will happen if timeout is non-zero and reached or if queue is empty
            print(f"Dequeue from {queue_name} timed out or queue is empty.")
            return None
    except Exception as e:
        print(f"[DEBUG_REDIS] In except block in dequeue_task. Error type: {type(e).__name__}, Error: {e}", flush=True)
        print(f"Error dequeuing task from Upstash Redis: {e}") # This is the original error message
        return None

def get_queue_length(queue_name: str) -> int:
    """
    Gets the current length of the specified Redis queue.
    Args:
        queue_name: The name of the queue.
    Returns:
        The number of tasks in the queue, or 0 if Redis is unavailable or error.
    """
    if not redis_client:
        print("Upstash Redis client not available.")
        return 0
    try:
        length = redis_client.llen(queue_name)
        return length if length is not None else 0
    except Exception as e:
        print(f"Error getting queue length from Upstash Redis: {e}")
        return 0

# Keep the __main__ block for testing if desired, adapting to the new client init
if __name__ == '__main__':
    if redis_client:
        print(f"Connected to Upstash Redis: URL: {UPSTASH_URL[:UPSTASH_URL.find('.')+len('.upstash.io')]}") # Print partial URL for safety
        
        test_queue = "test_sdk_analysis_queue"
        sample_task_data = {"user_id": "user_sdk_123", "file_id": "file_sdk_abc", "analysis_type": "sentiment", "request_id": "test_sdk_req"}
        
        print(f"Enqueuing task: {sample_task_data.get('request_id')}")
        enqueued_id = enqueue_task(test_queue, sample_task_data)
        
        if enqueued_id:
            print(f"Task enqueued with conceptual ID: {enqueued_id}")
            current_length = get_queue_length(test_queue)
            print(f"Queue length for '{test_queue}': {current_length}")
            
            # Test dequeue
            print("Attempting to dequeue task (will block if queue is empty or wait for timeout if set)...")
            dequeued_task = dequeue_task(test_queue, timeout=5) # 5s timeout for test
            if dequeued_task:
                print(f"Dequeued task: {dequeued_task.get('request_id')}")
            else:
                print("No task dequeued (timed out or queue was empty).")
            
            current_length = get_queue_length(test_queue)
            print(f"Queue length for '{test_queue}' after dequeue attempt: {current_length}")
        else:
            print("Failed to enqueue task.")
    else:
        print("Upstash Redis client not connected. Skipping example usage.") 