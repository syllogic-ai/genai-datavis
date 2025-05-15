# Migration from Redis Queue to QStash

This document outlines the migration from a Redis-based task queue to Upstash QStash for the GenAI DataVis application.

## Overview of Changes

### 1. Redis to QStash Migration
- Replaced Redis-based polling queue with QStash push-based queue
- Eliminated the need for a separate worker process
- Reduced operational costs and infrastructure complexity

### 2. Benefits
- **Cost Reduction**: Removed need for constant polling (~172,800 Redis commands/day)
- **Infrastructure Simplification**: Eliminated separate worker process
- **Better Reliability**: Using QStash's built-in retries and delivery guarantees
- **Lower Latency**: Push-based architecture instead of polling intervals

## Files Changed

1. Created `apps/backend/utils/qstash_queue.py`
   - QStash client initialization
   - Task enqueuing functionality
   - Signature verification for security

2. Updated `apps/backend/app/main.py`
   - Replaced Redis enqueue with QStash publish
   - Added internal endpoint to process tasks from QStash
   - Updated health check

3. Removed `apps/backend/utils/worker.py`
   - Worker functionality has been merged into the main FastAPI application
   - Tasks are now processed directly when QStash sends them to the API

## Required Environment Variables

The following environment variables must be set:

```
# QStash Configuration
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key
API_URL=https://your-api-url.com
```

## Testing the Migration

To verify the migration is working:

1. Send a request to the `/analyze` endpoint with the same payload as before
2. The task should be enqueued to QStash
3. QStash will send the task to the `/internal/process-analysis_tasks` endpoint
4. Verify that the results are properly sent to the chat

## Monitoring

- Check QStash dashboard for task queue status and delivery metrics
- API health endpoint (`/health`) provides QStash connection status
- All operations are logged with LogFire

## Rollback Plan

If issues arise with QStash implementation:

1. Restore Redis-based implementation from version control
2. Restart worker process
3. Update `main.py` to use Redis queue again

## Next Steps

- Remove Redis dependencies if no longer needed elsewhere
- Consider implementing URL groups in QStash for task distribution
- Optimize QStash retry configuration based on performance data 