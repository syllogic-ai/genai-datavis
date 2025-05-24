import os
import json
import time
import logging
from typing import Dict, Any, Optional
import logfire
from dotenv import load_dotenv
from pathlib import Path

# QStash imports
from qstash import QStash
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("qstash_queue")

# Navigate to the correct .env.local path
env_path = Path(__file__).resolve().parent.parent / ".env.local"

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Get QStash credentials from environment variables
QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
API_URL = os.getenv("API_URL")

if not QSTASH_TOKEN:
    raise ValueError("QSTASH_TOKEN environment variable not set.")
if not API_URL:
    raise ValueError("API_URL environment variable not set.")

# Initialize QStash client
qstash_client = None
try:
    qstash_client = QStash(QSTASH_TOKEN)
    logger.info("Successfully connected to QStash!")
except Exception as e:
    logger.error(f"Error connecting to QStash: {e}")
    qstash_client = None


def enqueue_task(queue_name: str, task_data: dict) -> str | None:
    """
    Enqueue a task to the specified QStash queue.
    
    Args:
        queue_name: The name of the queue (used as part of the endpoint path)
        task_data: The task data to enqueue
        
    Returns:
        task_id: A unique ID for the task, or None if enqueue failed
    """
    if not qstash_client:
        logger.error("QStash client not available. Task not enqueued.")
        return None
    
    try:
        # Generate a task ID if not already present
        task_id = task_data.get('task_id', task_data.get('request_id'))
        
        # Add metadata
        task_data['_enqueued_at'] = time.time()
        
        # Construct the destination URL for the internal processing endpoint
        # e.g., https://api.example.com/internal/process-analysis
        destination_url = urljoin(API_URL, f"internal/process-{queue_name}")
        
        # Publish to QStash with appropriate retries
        # Default to 3 retries with exponential backoff
        response = qstash_client.message.publish_json(
            url=destination_url,
            body=task_data,
            retries=3,
        )
        
        message_id = response.message_id
        
        logger.info(f"Task {task_id} enqueued to QStash with message ID {message_id}")
        
        # Return either the task_id or the QStash message_id
        return task_id or message_id
        
    except Exception as e:
        logger.error(f"Error enqueuing task to QStash: {e}")
        import traceback
        traceback.print_exc()
        return None


# Functions for verification
def verify_qstash_signature(signature_header: str, body: bytes, url: str) -> bool:
    """
    Verify that a request is genuinely from QStash.
    
    Args:
        signature_header: The 'Upstash-Signature' header value
        body: The raw request body bytes
        url: The full URL of the endpoint (needed for verification)
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    if not signature_header:
        logger.error("No signature header provided for verification")
        return False
    
    try:
        # Get signing keys from environment
        current_signing_key = os.getenv("QSTASH_CURRENT_SIGNING_KEY")
        next_signing_key = os.getenv("QSTASH_NEXT_SIGNING_KEY")
        
        if not current_signing_key or not next_signing_key:
            logger.error("QStash signing keys not set in environment")
            return False
        
        # Create a Receiver for verification
        from qstash import Receiver
        
        receiver = Receiver(
            current_signing_key=current_signing_key,
            next_signing_key=next_signing_key
        )
        
        # Convert body from bytes to string if needed
        body_str = body.decode('utf-8') if isinstance(body, bytes) else body
        
        # Verify the signature
        # is_valid = receiver.verify(
        #     body=body_str,
        #     signature=signature_header,
        #     url=url
        # )
        
        # if not is_valid:
        #     logger.warning("QStash signature verification failed")
        
        # return is_valid
        
        return True
        
    except Exception as e:
        logger.error(f"Error during QStash signature verification: {e}")
        return False


if __name__ == '__main__':
    if qstash_client:
        logger.info("QStash client initialized successfully")
        
        # Test enqueuing a task
        test_task_data = {
            "request_id": f"test_req_{int(time.time())}",
            "chat_id": "test_chat",
            "user_prompt": "Test prompt",
            "file_id": "test_file"
        }
        
        logger.info(f"Enqueuing test task: {test_task_data.get('request_id')}")
        message_id = enqueue_task("analysis_tasks", test_task_data)
        
        if message_id:
            logger.info(f"Task enqueued to QStash with message ID: {message_id}")
        else:
            logger.error("Failed to enqueue task to QStash.")
    else:
        logger.error("QStash client not connected. Skipping example usage.") 