import os
import json
from dotenv import load_dotenv
from pathlib import Path
from upstash_redis import Redis
import time
import uuid
import random
from typing import Dict, Any, Optional, Union, List, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("redis_queue")

# Navigate to the correct .env.local path
env_path = Path(__file__).resolve().parent.parent / ".env.local"

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Get Upstash Redis URL and Token from environment variables
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

if not UPSTASH_URL:
    raise ValueError("UPSTASH_REDIS_REST_URL environment variable not set.")
if not UPSTASH_TOKEN:
    raise ValueError("UPSTASH_REDIS_REST_TOKEN environment variable not set.")

# Connect to Upstash Redis using the upstash-redis SDK
redis_client: Redis | None = None
try:
    redis_client = Redis(url=UPSTASH_URL, token=UPSTASH_TOKEN)
    redis_client.ping()
    logger.info("Successfully connected to Upstash Redis using upstash-redis SDK!")
except Exception as e:
    logger.error(f"Error connecting to Upstash Redis using upstash-redis SDK: {e}")
    redis_client = None


class SmartRedisQueue:
    """
    A smarter implementation of Redis queue that:
    - Uses optimal polling strategy with exponential backoff
    - Properly handles different response formats from Upstash Redis
    - Reduces Redis command usage when queue is empty
    - Provides comprehensive error handling and logging
    """
    
    def __init__(self, queue_name: str, redis_client: Redis):
        """
        Initialize a new SmartRedisQueue.
        
        Args:
            queue_name: The name of the Redis queue
            redis_client: An initialized Redis client
        """
        self.queue_name = queue_name
        self.redis = redis_client
        self.min_backoff = 0.1  # Start with 100ms
        self.max_backoff = 5.0  # Max 5 seconds between polls when idle
        self.backoff_factor = 1.5  # Exponential backoff multiplier
        self.jitter_factor = 0.1  # Add randomness to prevent thundering herd
        self.current_backoff = self.min_backoff
        self.consecutive_empty = 0
        self.last_activity_time = time.time()
        
    def enqueue(self, task_data: Dict[str, Any]) -> str:
        """
        Add a task to the queue.
        
        Args:
            task_data: Dictionary containing task data
            
        Returns:
            task_id: A unique ID for the task
            
        Raises:
            ConnectionError: If Redis is not available
            ValueError: If task_data is invalid
        """
        if not self.redis:
            logger.error("Redis client not available. Task not enqueued.")
            raise ConnectionError("Redis client not available")
        
        if not isinstance(task_data, dict):
            raise ValueError("Task data must be a dictionary")
        
        try:
            # Generate a proper task ID if not already present
            task_id = task_data.get('task_id', str(uuid.uuid4()))
            if 'task_id' not in task_data:
                task_data['task_id'] = task_id
            
            # Add queue metadata
            task_data['_enqueued_at'] = time.time()
            
            # Convert task to JSON string
            task_json = json.dumps(task_data)
            
            # Use RPUSH to add to the queue
            self.redis.rpush(self.queue_name, task_json)
            
            # Reset backoff when there's activity
            self.last_activity_time = time.time()
            self.consecutive_empty = 0
            
            logger.info(f"Task {task_id} enqueued to {self.queue_name}")
            return task_id
            
        except Exception as e:
            logger.error(f"Error enqueuing task: {e}")
            raise
    
    def _parse_response(self, result: Any) -> Optional[Dict[str, Any]]:
        """
        Parse the response from Redis LPOP command, handling different formats.
        
        Args:
            result: The result from Redis LPOP
            
        Returns:
            Parsed task data as dict, or None if parsing failed
        """
        if result is None:
            return None
            
        # Debug log the exact response type and format
        logger.debug(f"Redis LPOP result type: {type(result)}, value: {result}")
        
        task_json = None
        
        # Handle different result formats from Upstash Redis
        if isinstance(result, list) and len(result) > 0:
            task_json = result[0]  # Take first element if it's a list
        elif isinstance(result, (str, bytes)):
            task_json = result
        else:
            logger.warning(f"Unexpected result format: {type(result)}, {result}")
            return None
        
        # Decode if necessary
        if isinstance(task_json, bytes):
            task_json = task_json.decode('utf-8')
        
        # Parse JSON
        try:
            return json.loads(task_json)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode JSON: {task_json}")
            return None
    
    def _calculate_next_backoff(self) -> float:
        """
        Calculate the next backoff time with jitter.
        
        Returns:
            The next backoff time in seconds
        """
        # Increase consecutive empty count
        self.consecutive_empty += 1
        
        # Calculate base backoff with exponential increase
        if self.consecutive_empty > 1:
            self.current_backoff = min(
                self.current_backoff * self.backoff_factor,
                self.max_backoff
            )
        
        # Add jitter to prevent thundering herd problem
        jitter = random.uniform(
            -self.jitter_factor * self.current_backoff,
            self.jitter_factor * self.current_backoff
        )
        
        return max(self.min_backoff, self.current_backoff + jitter)
    
    def dequeue(self, timeout: int = 0) -> Optional[Dict[str, Any]]:
        """
        Remove and return a task from the queue with smart polling.
        
        Args:
            timeout: Maximum time to wait for a task (0 = wait forever)
            
        Returns:
            Task data as a dictionary, or None if no task available within timeout
            
        Raises:
            ConnectionError: If Redis is not available
        """
        if not self.redis:
            logger.error("Redis client not available. Cannot dequeue task.")
            raise ConnectionError("Redis client not available")
        
        try:
            start_time = time.time()
            
            while True:
                # Check if we've exceeded the timeout
                if timeout > 0 and (time.time() - start_time) > timeout:
                    return None
                
                # Attempt to get a task from the queue
                try:
                    result = self.redis.lpop(self.queue_name)
                    task_data = self._parse_response(result)
                    
                    if task_data:
                        # Success! Reset backoff and return the task
                        self.current_backoff = self.min_backoff
                        self.consecutive_empty = 0
                        self.last_activity_time = time.time()
                        
                        request_id = task_data.get('request_id', 'N/A')
                        logger.info(f"Task dequeued from {self.queue_name}: {request_id}")
                        return task_data
                    
                    # No task available, calculate backoff time
                    backoff_time = self._calculate_next_backoff()
                    
                    # Only log occasionally to avoid log spam
                    if self.consecutive_empty <= 3 or self.consecutive_empty % 100 == 0:
                        logger.debug(f"No task in queue {self.queue_name}. "
                                    f"Backing off for {backoff_time:.2f}s "
                                    f"(attempt {self.consecutive_empty})")
                    
                    # Wait before trying again
                    time.sleep(backoff_time)
                    
                except Exception as e:
                    logger.error(f"Error during LPOP operation: {e}")
                    # Add a small delay before retrying after an error
                    time.sleep(self.min_backoff * 2)
        
        except Exception as e:
            logger.error(f"Unexpected error in dequeue: {e}")
            import traceback
            traceback.print_exc()
            # Rethrow the exception after logging
            raise
    
    def get_length(self) -> int:
        """
        Get the current length of the queue.
        
        Returns:
            Number of items in the queue, or 0 if Redis is unavailable
        """
        if not self.redis:
            logger.warning("Redis client not available. Cannot get queue length.")
            return 0
        
        try:
            length = self.redis.llen(self.queue_name)
            return length if length is not None else 0
        except Exception as e:
            logger.error(f"Error getting queue length: {e}")
            return 0


# Global instance of SmartRedisQueue for the default task queue
default_queue = None
if redis_client:
    try:
        default_queue = SmartRedisQueue("analysis_tasks", redis_client)
        logger.info(f"Default SmartRedisQueue initialized for 'analysis_tasks'")
    except Exception as e:
        logger.error(f"Failed to initialize default queue: {e}")


# Maintain backward compatibility with existing code
def enqueue_task(queue_name: str, task_data: dict) -> str | None:
    """
    Enqueue a task to the specified queue.
    
    Args:
        queue_name: The name of the Redis queue
        task_data: The task data to enqueue
        
    Returns:
        task_id: A unique ID for the task, or None if enqueue failed
    """
    if not redis_client:
        logger.error("Upstash Redis client not available. Task not enqueued.")
        return None
    
    try:
        # Create a queue instance if it doesn't exist
        queue = SmartRedisQueue(queue_name, redis_client)
        
        # Generate a proper task ID if not already present
        task_id = task_data.get('task_id', str(uuid.uuid4()))
        if 'task_id' not in task_data:
            task_data['task_id'] = task_id
        
        # Enqueue the task
        queue.enqueue(task_data)
        return task_id
    except Exception as e:
        logger.error(f"Error enqueuing task: {e}")
        return None


def dequeue_task(queue_name: str, timeout: int = 0) -> dict | None:
    """
    Dequeue a task from the specified queue.
    
    Args:
        queue_name: The name of the Redis queue
        timeout: Maximum time to wait for a task (0 = wait forever)
        
    Returns:
        The task data, or None if no task available or error occurred
    """
    if not redis_client:
        logger.error("Upstash Redis client not available. Cannot dequeue task.")
        return None
    
    try:
        # Create a queue instance if it doesn't exist
        queue = SmartRedisQueue(queue_name, redis_client)
        
        # Dequeue a task
        return queue.dequeue(timeout)
        
    except Exception as e:
        logger.error(f"Error dequeuing task: {e}")
        import traceback
        traceback.print_exc()
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
        logger.warning("Upstash Redis client not available.")
        return 0
    
    try:
        queue = SmartRedisQueue(queue_name, redis_client)
        return queue.get_length()
    except Exception as e:
        logger.error(f"Error getting queue length: {e}")
        return 0


# Keep the __main__ block for testing if desired, adapting to the new client init
if __name__ == '__main__':
    if redis_client:
        logger.info(f"Connected to Upstash Redis: URL: {UPSTASH_URL[:UPSTASH_URL.find('.')+len('.upstash.io')]}") # Print partial URL for safety
        
        test_queue = "test_sdk_analysis_queue"
        sample_task_data = {"user_id": "user_sdk_123", "file_id": "file_sdk_abc", "analysis_type": "sentiment", "request_id": "test_sdk_req"}
        
        logger.info(f"Enqueuing task: {sample_task_data.get('request_id')}")
        enqueued_id = enqueue_task(test_queue, sample_task_data)
        
        if enqueued_id:
            logger.info(f"Task enqueued with conceptual ID: {enqueued_id}")
            current_length = get_queue_length(test_queue)
            logger.info(f"Queue length for '{test_queue}': {current_length}")
            
            # Test dequeue
            logger.info("Attempting to dequeue task (will block if queue is empty or wait for timeout if set)...")
            dequeued_task = dequeue_task(test_queue, timeout=5) # 5s timeout for test
            if dequeued_task:
                logger.info(f"Dequeued task: {dequeued_task.get('request_id')}")
            else:
                logger.info("No task dequeued (timed out or queue was empty).")
            
            current_length = get_queue_length(test_queue)
            logger.info(f"Queue length for '{test_queue}' after dequeue attempt: {current_length}")
        else:
            logger.error("Failed to enqueue task.")
    else:
        logger.error("Upstash Redis client not connected. Skipping example usage.") 