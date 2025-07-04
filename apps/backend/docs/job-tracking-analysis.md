# Job Tracking Architecture Analysis

## Current Architecture Overview

### Job Lifecycle
1. **Job Creation**
   - User sends request via frontend (`/api/chat/analyze`)
   - Frontend generates a unique `request_id` (UUID)
   - Request is forwarded to backend with `user_id` for ownership
   - Backend enqueues task to QStash (async queue)
   - Job record is created in Redis with initial status "pending"

2. **Job Processing**
   - QStash delivers task to internal endpoint (`/internal/process-analysis_tasks`)
   - Job status updated to "processing" with progress tracking
   - Backend processes the request (data analysis, chart generation)
   - Results are stored and job marked as "completed" or "failed"

3. **Job Monitoring**
   - Frontend uses SSE (Server-Sent Events) via `/api/job-status/[jobId]`
   - Hook `useJobStatus` manages real-time updates
   - Redis stores job data with TTL (1 hour default)
   - Job data includes: status, progress, owner, result, error, timestamps

### Current Redis Implementation

#### Data Structure
```
job:{job_id}:owner -> user_id
job:{job_id}:status -> pending|processing|completed|failed
job:{job_id}:progress -> 0-100
job:{job_id}:error -> error message
job:{job_id}:result -> JSON result
job:{job_id}:created_at -> timestamp
job:{job_id}:updated_at -> timestamp
job:{job_id}:completed_at -> timestamp
job:{job_id}:failed_at -> timestamp
job:{job_id}:metadata -> JSON metadata
```

#### Key Components
- **JobTracker class** (`utils/job_tracking.py`): Manages job lifecycle
- **SSE endpoint** (`api/job-status/[jobId]/route.ts`): Real-time updates
- **QStash integration**: Async task queue with retries
- **TTL management**: 1-hour default expiration

### Relationships

#### Job ↔ Dashboard
- Jobs store `dashboard_id` in metadata
- Jobs process requests in dashboard context
- Widget operations are tied to specific dashboards

#### Job ↔ User
- Jobs are owned by users (`user_id` from Clerk)
- Access control based on job ownership
- Rate limiting per user (max 5 concurrent SSE connections)

#### Job ↔ Widget
- Job results include `widget_id` or `widget_ids`
- Widgets are created/updated as job outcomes
- Chat messages reference created widgets

## Redis vs Supabase Analysis

### Redis (Current) - Pros

1. **Performance**
   - Sub-millisecond latency for status updates
   - Perfect for real-time SSE streaming
   - Minimal overhead for high-frequency polling
   - In-memory storage ideal for transient job data

2. **Simplicity**
   - Key-value structure matches job tracking needs
   - Built-in TTL for automatic cleanup
   - No schema migrations needed
   - Easy atomic operations (SETEX, INCR)

3. **Cost Efficiency**
   - Only stores active/recent jobs
   - Automatic expiration reduces storage
   - Upstash Redis serverless pricing model

4. **Real-time Features**
   - Native pub/sub for future enhancements
   - Instant updates without database polling
   - Perfect for SSE/WebSocket scenarios

### Redis (Current) - Cons

1. **Data Persistence**
   - Job history lost after TTL expires
   - No long-term analytics possible
   - Can't audit historical job performance

2. **Query Limitations**
   - No complex queries (e.g., jobs by date range)
   - Can't easily filter jobs by status/user
   - No joins with other data (dashboards, widgets)

3. **Scalability Concerns**
   - Memory-based storage has limits
   - No built-in horizontal scaling
   - Potential memory pressure with many jobs

4. **Feature Limitations**
   - No native search capabilities
   - Limited data relationships
   - No built-in backup/restore

### Supabase (Alternative) - Pros

1. **Data Persistence**
   - Permanent job history
   - Analytics and reporting capabilities
   - Audit trail for all operations

2. **Rich Queries**
   - SQL queries for complex filtering
   - Join with users, dashboards, widgets
   - Aggregations and statistics

3. **Consistency**
   - Single source of truth with other data
   - ACID transactions
   - Foreign key relationships

4. **Features**
   - Full-text search
   - Row-level security
   - Real-time subscriptions
   - Automatic backups

### Supabase (Alternative) - Cons

1. **Performance**
   - Higher latency (5-50ms vs <1ms)
   - Database polling for real-time updates
   - More overhead for frequent status checks

2. **Complexity**
   - Schema design and migrations
   - Index management for performance
   - More complex cleanup strategies

3. **Cost**
   - Stores all historical data
   - Higher storage costs over time
   - Potential query costs at scale

4. **Real-time Limitations**
   - Supabase realtime has connection limits
   - More complex than Redis pub/sub
   - Potential delays in status propagation

## Hybrid Approach Recommendation

### Best of Both Worlds
1. **Redis for Active Jobs**
   - Real-time status tracking
   - SSE streaming
   - High-frequency updates
   - TTL: 2-4 hours

2. **Supabase for Job History**
   - Create job record on completion
   - Store summary, not all updates
   - Enable analytics and reporting
   - Maintain relationships

### Implementation Strategy

#### Phase 1: Add Supabase Table
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  dashboard_id TEXT REFERENCES dashboards(id),
  chat_id TEXT REFERENCES chats(id),
  
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Summary data
  processing_time_ms INTEGER,
  widget_ids TEXT[],
  error_message TEXT,
  
  -- Metadata
  request_type TEXT, -- 'dashboard_chat', 'file_analysis', etc.
  model_used TEXT,
  token_count INTEGER,
  
  INDEX idx_jobs_user_created (user_id, created_at DESC),
  INDEX idx_jobs_dashboard (dashboard_id),
  INDEX idx_jobs_status (status)
);
```

#### Phase 2: Dual Write
- Keep Redis for active job tracking
- Write to Supabase on job completion/failure
- Migrate historical queries to Supabase

#### Phase 3: Enhanced Features
- Job analytics dashboard
- Usage tracking per user
- Performance monitoring
- Cost attribution

## Pain Points with Current Redis Approach

1. **Lost History**
   - Can't show user their job history
   - No debugging for past issues
   - No usage analytics

2. **Limited Filtering**
   - Can't query jobs by dashboard
   - No date range queries
   - No aggregated statistics

3. **Debugging Challenges**
   - Jobs disappear after TTL
   - Hard to trace issues
   - No audit trail

4. **Scaling Issues**
   - Memory constraints
   - No archival strategy
   - Cleanup is all-or-nothing

## Recommendations

### Short Term (Keep Redis)
1. Increase TTL to 4 hours for better debugging
2. Add structured logging for job events
3. Implement job summary endpoint
4. Add basic metrics collection

### Medium Term (Hybrid)
1. Add Supabase jobs table
2. Implement dual-write on completion
3. Build job history UI
4. Add analytics dashboard

### Long Term (Evaluate)
1. Monitor Redis memory usage
2. Analyze query patterns
3. Consider full Supabase migration if:
   - Real-time performance acceptable
   - Redis costs exceed benefits
   - Need complex job relationships

## Conclusion

The current Redis implementation is well-suited for real-time job tracking with its low latency and simple architecture. However, the lack of persistence limits debugging, analytics, and user features. A hybrid approach leveraging Redis for active jobs and Supabase for historical data provides the best balance of performance and functionality.