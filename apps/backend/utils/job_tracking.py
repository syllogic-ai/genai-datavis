import os
import json
import time
import logging
from typing import Dict, Any, Optional
from upstash_redis import Redis
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("job_tracking")

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

# Connect to Upstash Redis
redis_client: Redis | None = None
try:
    redis_client = Redis(url=UPSTASH_URL, token=UPSTASH_TOKEN)
    redis_client.ping()
    logger.info("Successfully connected to Upstash Redis for job tracking!")
except Exception as e:
    logger.error(f"Error connecting to Upstash Redis for job tracking: {e}")
    redis_client = None


class JobTracker:
    """
    A Redis-based job tracking system for monitoring background job status.
    """
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour default TTL for job data
    
    def create_job(self, job_id: str, user_id: str, initial_status: str = "pending", metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Create a new job record in Redis.
        
        Args:
            job_id: Unique identifier for the job
            user_id: ID of the user who owns the job
            initial_status: Initial status of the job
            metadata: Additional metadata to store with the job
            
        Returns:
            True if job was created successfully, False otherwise
        """
        if not self.redis:
            logger.error("Redis client not available")
            return False
        
        try:
            # Store job ownership
            self.redis.setex(f"job:{job_id}:owner", self.default_ttl, user_id)
            
            # Store job status
            self.redis.setex(f"job:{job_id}:status", self.default_ttl, initial_status)
            
            # Store job progress (initially 0)
            self.redis.setex(f"job:{job_id}:progress", self.default_ttl, "0")
            
            # Store creation timestamp
            self.redis.setex(f"job:{job_id}:created_at", self.default_ttl, str(int(time.time())))
            
            # Store metadata if provided
            if metadata:
                self.redis.setex(f"job:{job_id}:metadata", self.default_ttl, json.dumps(metadata))
            
            logger.info(f"Created job {job_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating job {job_id}: {e}")
            return False
    
    def update_status(self, job_id: str, status: str, progress: Optional[int] = None, error: Optional[str] = None) -> bool:
        """
        Update job status and optionally progress or error information.
        
        Args:
            job_id: Job identifier
            status: New status (pending, processing, completed, failed)
            progress: Progress percentage (0-100)
            error: Error message if job failed
            
        Returns:
            True if update was successful, False otherwise
        """
        if not self.redis:
            logger.error("Redis client not available")
            return False
        
        try:
            # Update status
            self.redis.setex(f"job:{job_id}:status", self.default_ttl, status)
            
            # Update progress if provided
            if progress is not None:
                self.redis.setex(f"job:{job_id}:progress", self.default_ttl, str(progress))
            
            # Update error if provided
            if error is not None:
                self.redis.setex(f"job:{job_id}:error", self.default_ttl, error)
            
            # Update timestamp
            self.redis.setex(f"job:{job_id}:updated_at", self.default_ttl, str(int(time.time())))
            
            logger.info(f"Updated job {job_id}: status={status}, progress={progress}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {e}")
            return False
    
    def complete_job(self, job_id: str, result: Optional[Dict[str, Any]] = None) -> bool:
        """
        Mark a job as completed and optionally store the result.
        
        Args:
            job_id: Job identifier
            result: Job result data to store
            
        Returns:
            True if completion was successful, False otherwise
        """
        if not self.redis:
            logger.error("Redis client not available")
            return False
        
        try:
            # Update status to completed
            self.redis.setex(f"job:{job_id}:status", self.default_ttl, "completed")
            
            # Set progress to 100%
            self.redis.setex(f"job:{job_id}:progress", self.default_ttl, "100")
            
            # Store result if provided
            if result is not None:
                self.redis.setex(f"job:{job_id}:result", self.default_ttl, json.dumps(result))
            
            # Update completion timestamp
            self.redis.setex(f"job:{job_id}:completed_at", self.default_ttl, str(int(time.time())))
            
            logger.info(f"Completed job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error completing job {job_id}: {e}")
            return False
    
    def fail_job(self, job_id: str, error: str) -> bool:
        """
        Mark a job as failed with an error message.
        
        Args:
            job_id: Job identifier
            error: Error message
            
        Returns:
            True if failure was recorded successfully, False otherwise
        """
        if not self.redis:
            logger.error("Redis client not available")
            return False
        
        try:
            # Update status to failed
            self.redis.setex(f"job:{job_id}:status", self.default_ttl, "failed")
            
            # Store error message
            self.redis.setex(f"job:{job_id}:error", self.default_ttl, error)
            
            # Update failure timestamp
            self.redis.setex(f"job:{job_id}:failed_at", self.default_ttl, str(int(time.time())))
            
            logger.info(f"Failed job {job_id}: {error}")
            return True
            
        except Exception as e:
            logger.error(f"Error failing job {job_id}: {e}")
            return False
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive job status information.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Dictionary with job status information, or None if job not found
        """
        if not self.redis:
            logger.error("Redis client not available")
            return None
        
        try:
            # Get all job data
            status = self.redis.get(f"job:{job_id}:status")
            progress = self.redis.get(f"job:{job_id}:progress")
            error = self.redis.get(f"job:{job_id}:error")
            result = self.redis.get(f"job:{job_id}:result")
            owner = self.redis.get(f"job:{job_id}:owner")
            created_at = self.redis.get(f"job:{job_id}:created_at")
            updated_at = self.redis.get(f"job:{job_id}:updated_at")
            completed_at = self.redis.get(f"job:{job_id}:completed_at")
            failed_at = self.redis.get(f"job:{job_id}:failed_at")
            metadata = self.redis.get(f"job:{job_id}:metadata")
            
            if status is None:
                return None  # Job not found
            
            job_info = {
                "job_id": job_id,
                "status": status,
                "progress": int(progress) if progress else 0,
                "owner": owner,
                "created_at": int(created_at) if created_at else None,
                "updated_at": int(updated_at) if updated_at else None,
            }
            
            # Add optional fields if they exist
            if error:
                job_info["error"] = error
            if result:
                try:
                    job_info["result"] = json.loads(result)
                except json.JSONDecodeError:
                    job_info["result"] = result  # Store as string if not valid JSON
            if completed_at:
                job_info["completed_at"] = int(completed_at)
            if failed_at:
                job_info["failed_at"] = int(failed_at)
            if metadata:
                try:
                    job_info["metadata"] = json.loads(metadata)
                except json.JSONDecodeError:
                    job_info["metadata"] = metadata  # Store as string if not valid JSON
            
            return job_info
            
        except Exception as e:
            logger.error(f"Error getting job status for {job_id}: {e}")
            return None
    
    def cleanup_job(self, job_id: str) -> bool:
        """
        Remove all job data from Redis.
        
        Args:
            job_id: Job identifier
            
        Returns:
            True if cleanup was successful, False otherwise
        """
        if not self.redis:
            logger.error("Redis client not available")
            return False
        
        try:
            # Delete all keys associated with this job
            keys_to_delete = [
                f"job:{job_id}:owner",
                f"job:{job_id}:status",
                f"job:{job_id}:progress",
                f"job:{job_id}:error",
                f"job:{job_id}:result",
                f"job:{job_id}:created_at",
                f"job:{job_id}:updated_at",
                f"job:{job_id}:completed_at",
                f"job:{job_id}:failed_at",
                f"job:{job_id}:metadata"
            ]
            
            for key in keys_to_delete:
                self.redis.delete(key)
            
            logger.info(f"Cleaned up job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error cleaning up job {job_id}: {e}")
            return False


# Global instance
job_tracker = None
if redis_client:
    try:
        job_tracker = JobTracker(redis_client)
        logger.info("Job tracker initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize job tracker: {e}")


# Convenience functions for backward compatibility
def create_job(job_id: str, user_id: str, initial_status: str = "pending", metadata: Optional[Dict[str, Any]] = None) -> bool:
    """Create a new job record."""
    if not job_tracker:
        logger.error("Job tracker not available")
        return False
    return job_tracker.create_job(job_id, user_id, initial_status, metadata)


def update_job_status(job_id: str, status: str, progress: Optional[int] = None, error: Optional[str] = None) -> bool:
    """Update job status."""
    if not job_tracker:
        logger.error("Job tracker not available")
        return False
    return job_tracker.update_status(job_id, status, progress, error)


def complete_job(job_id: str, result: Optional[Dict[str, Any]] = None) -> bool:
    """Mark job as completed."""
    if not job_tracker:
        logger.error("Job tracker not available")
        return False
    return job_tracker.complete_job(job_id, result)


def fail_job(job_id: str, error: str) -> bool:
    """Mark job as failed."""
    if not job_tracker:
        logger.error("Job tracker not available")
        return False
    return job_tracker.fail_job(job_id, error)


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Get job status."""
    if not job_tracker:
        logger.error("Job tracker not available")
        return None
    return job_tracker.get_job_status(job_id)


if __name__ == '__main__':
    if job_tracker:
        # Test job tracking
        test_job_id = f"test_job_{int(time.time())}"
        test_user_id = "test_user_123"
        
        logger.info(f"Creating test job: {test_job_id}")
        job_tracker.create_job(test_job_id, test_user_id, "pending", {"test": "metadata"})
        
        logger.info("Getting job status...")
        status = job_tracker.get_job_status(test_job_id)
        logger.info(f"Job status: {status}")
        
        logger.info("Updating job to processing...")
        job_tracker.update_status(test_job_id, "processing", progress=50)
        
        logger.info("Completing job...")
        job_tracker.complete_job(test_job_id, {"result": "success"})
        
        logger.info("Final job status...")
        final_status = job_tracker.get_job_status(test_job_id)
        logger.info(f"Final status: {final_status}")
        
        logger.info("Cleaning up...")
        job_tracker.cleanup_job(test_job_id)
    else:
        logger.error("Job tracker not available for testing")