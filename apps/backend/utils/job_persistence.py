"""
Job Persistence Module - Hybrid Redis + Supabase job tracking

This module implements a dual-write strategy:
- Redis: Real-time job status for SSE streaming (TTL: 1 hour)
- Supabase: Persistent job history for analytics and debugging
"""

import os
import time
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from supabase import create_client, Client
from apps.backend.utils.job_tracking import (
    create_job as redis_create_job,
    update_job_status as redis_update_status,
    complete_job as redis_complete_job,
    fail_job as redis_fail_job
)

# Configure logging
logger = logging.getLogger("job_persistence")

# Supabase client (reuse from main app)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None


class HybridJobTracker:
    """
    Hybrid job tracker that writes to both Redis (real-time) and Supabase (persistence)
    """
    
    def __init__(self, supabase: Client = None):
        self.supabase = supabase or supabase_client
        self.job_start_times = {}  # Track start times for performance metrics
    
    def create_job(self, job_id: str, user_id: str, dashboard_id: str) -> bool:
        """
        Create a job in both Redis and Supabase
        """
        success = True
        
        # Track creation time for queue time calculation
        self.job_start_times[job_id] = time.time()
        
        # 1. Create in Redis for real-time tracking
        try:
            metadata = {
                "dashboard_id": dashboard_id
            }
            redis_success = redis_create_job(job_id, user_id, "pending", metadata)
            if not redis_success:
                logger.warning(f"Failed to create job {job_id} in Redis")
                success = False
        except Exception as e:
            logger.error(f"Redis error creating job {job_id}: {e}")
            success = False
        
        # 2. Create in Supabase for persistence
        if self.supabase:
            try:
                job_data = {
                    "id": job_id,
                    "user_id": user_id,
                    "dashboard_id": dashboard_id,
                    "status": "pending",
                    "progress": 0,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                result = self.supabase.table("jobs").insert(job_data).execute()
                logger.info(f"Created job {job_id} in Supabase")
            except Exception as e:
                logger.error(f"Supabase error creating job {job_id}: {e}")
                success = False
        
        return success
    
    def update_status(self, job_id: str, status: str, progress: Optional[int] = None) -> bool:
        """
        Update job status in both systems
        """
        success = True
        update_data = {"status": status}
        
        # Calculate queue time when job starts processing
        if status == "processing" and job_id in self.job_start_times:
            queue_time_ms = int((time.time() - self.job_start_times[job_id]) * 1000)
            update_data["queue_time_ms"] = queue_time_ms
            update_data["started_at"] = datetime.utcnow().isoformat()
            # Track processing start time
            self.job_start_times[f"{job_id}_processing"] = time.time()
        
        if progress is not None:
            update_data["progress"] = progress
        
        # 1. Update Redis (optional - for backward compatibility)
        try:
            redis_success = redis_update_status(job_id, status, progress)
            if not redis_success:
                logger.warning(f"Failed to update job {job_id} status in Redis")
                # Don't fail the whole operation
        except Exception as e:
            logger.error(f"Redis error updating job {job_id}: {e}")
            # Continue without Redis
        
        # 2. Update Supabase (primary - triggers realtime)
        if self.supabase:
            try:
                result = self.supabase.table("jobs").update(update_data).eq("id", job_id).execute()
                logger.info(f"Updated job {job_id} status to {status} in Supabase (progress: {progress})")
                # Supabase update triggers realtime event automatically
            except Exception as e:
                logger.error(f"Supabase error updating job {job_id}: {e}")
                success = False
        else:
            logger.error("Supabase client not available for job updates")
            success = False
        
        return success
    
    def complete_job(self, job_id: str, result: Optional[Dict[str, Any]] = None) -> bool:
        """
        Mark job as completed in both systems
        """
        success = True
        
        # Calculate processing time
        processing_time_ms = None
        if f"{job_id}_processing" in self.job_start_times:
            processing_time_ms = int((time.time() - self.job_start_times[f"{job_id}_processing"]) * 1000)
        
        # 1. Complete in Redis (still store result there for backward compatibility)
        try:
            redis_success = redis_complete_job(job_id, result)
            if not redis_success:
                logger.warning(f"Failed to complete job {job_id} in Redis")
                # Don't fail the whole operation
        except Exception as e:
            logger.error(f"Redis error completing job {job_id}: {e}")
            # Continue without Redis
        
        # 2. Complete in Supabase (simplified - no result column)
        if self.supabase:
            try:
                update_data = {
                    "status": "completed",
                    "progress": 100,
                    "completed_at": datetime.utcnow().isoformat()
                }
                
                if processing_time_ms is not None:
                    update_data["processing_time_ms"] = processing_time_ms
                
                result = self.supabase.table("jobs").update(update_data).eq("id", job_id).execute()
                logger.info(f"Completed job {job_id} in Supabase")
            except Exception as e:
                logger.error(f"Supabase error completing job {job_id}: {e}")
                success = False
        
        # Cleanup tracking
        self.job_start_times.pop(job_id, None)
        self.job_start_times.pop(f"{job_id}_processing", None)
        
        return success
    
    def fail_job(self, job_id: str, error: str) -> bool:
        """
        Mark job as failed in both systems
        """
        success = True
        
        # Calculate processing time if applicable
        processing_time_ms = None
        if f"{job_id}_processing" in self.job_start_times:
            processing_time_ms = int((time.time() - self.job_start_times[f"{job_id}_processing"]) * 1000)
        
        # 1. Fail in Redis
        try:
            redis_success = redis_fail_job(job_id, error)
            if not redis_success:
                logger.warning(f"Failed to mark job {job_id} as failed in Redis")
                success = False
        except Exception as e:
            logger.error(f"Redis error failing job {job_id}: {e}")
            success = False
        
        # 2. Fail in Supabase
        if self.supabase:
            try:
                update_data = {
                    "status": "failed",
                    "error": error,
                    "completed_at": datetime.utcnow().isoformat()
                }
                
                if processing_time_ms is not None:
                    update_data["processing_time_ms"] = processing_time_ms
                
                result = self.supabase.table("jobs").update(update_data).eq("id", job_id).execute()
                logger.info(f"Failed job {job_id} in Supabase: {error}")
            except Exception as e:
                logger.error(f"Supabase error failing job {job_id}: {e}")
                success = False
        
        # Cleanup tracking
        self.job_start_times.pop(job_id, None)
        self.job_start_times.pop(f"{job_id}_processing", None)
        
        return success


# Global instance
hybrid_tracker = HybridJobTracker() if supabase_client else None


# Convenience functions that maintain backward compatibility
def create_job(job_id: str, user_id: str, dashboard_id: str = None, **kwargs) -> bool:
    """Create a job using hybrid tracking"""
    if hybrid_tracker and dashboard_id:
        return hybrid_tracker.create_job(job_id, user_id, dashboard_id)
    else:
        # Fallback to Redis-only
        metadata = {"dashboard_id": dashboard_id} if dashboard_id else kwargs
        return redis_create_job(job_id, user_id, "pending", metadata)


def update_job_status(job_id: str, status: str, progress: Optional[int] = None) -> bool:
    """Update job status using hybrid tracking"""
    if hybrid_tracker:
        return hybrid_tracker.update_status(job_id, status, progress)
    else:
        # Fallback to Redis-only
        return redis_update_status(job_id, status, progress)


def complete_job(job_id: str, result: Optional[Dict[str, Any]] = None) -> bool:
    """Complete a job using hybrid tracking"""
    if hybrid_tracker:
        return hybrid_tracker.complete_job(job_id, result)
    else:
        # Fallback to Redis-only
        return redis_complete_job(job_id, result)


def fail_job(job_id: str, error: str) -> bool:
    """Fail a job using hybrid tracking"""
    if hybrid_tracker:
        return hybrid_tracker.fail_job(job_id, error)
    else:
        # Fallback to Redis-only
        return redis_fail_job(job_id, error)