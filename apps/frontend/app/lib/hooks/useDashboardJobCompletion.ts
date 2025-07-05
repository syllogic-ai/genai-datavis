import { useState, useEffect, useCallback } from 'react';
import { useJobStatusRealtime, JobStatusData } from './useJobStatusRealtime';
import { Widget } from '@/types/enhanced-dashboard-types';
import toast from 'react-hot-toast';

export interface DashboardJobCompletionOptions {
  dashboardId: string;
  onWidgetRefresh?: () => Promise<void>;
  onCacheInvalidation?: (result: { widgetsInvalidated: number; dashboardCacheCleared: boolean }) => void;
  showToasts?: boolean;
  autoRefresh?: boolean;
}

export interface DashboardJobCompletionReturn {
  trackJob: (jobId: string) => void;
  stopTracking: () => void;
  currentJob: JobStatusData | null;
  isProcessing: boolean;
  completedJobs: string[];
  failedJobs: string[];
}

export function useDashboardJobCompletion(options: DashboardJobCompletionOptions): DashboardJobCompletionReturn {
  const {
    dashboardId,
    onWidgetRefresh,
    onCacheInvalidation,
    showToasts = true,
    autoRefresh = true
  } = options;

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [completedJobs, setCompletedJobs] = useState<string[]>([]);
  const [failedJobs, setFailedJobs] = useState<string[]>([]);
  const [isInvalidatingCache, setIsInvalidatingCache] = useState(false);

  // Cache invalidation via server action
  const invalidateJobRelatedCaches = useCallback(async (jobId: string, dashboardId: string) => {
    try {
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, dashboardId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to invalidate cache');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      return { widgetsInvalidated: 0, dashboardCacheCleared: false };
    }
  }, []);

  // Handle job completion with comprehensive cache invalidation
  const handleJobCompletion = useCallback(async (job: JobStatusData) => {
    console.log('Dashboard job completion handler triggered:', job);
    
    if (showToasts) {
      toast.success('✅ Task completed successfully!', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: '#ffffff',
        },
      });
    }

    // Add to completed jobs
    setCompletedJobs(prev => [...prev, job.id]);
    
    try {
      setIsInvalidatingCache(true);
      
      // Invalidate all related caches
      const invalidationResult = await invalidateJobRelatedCaches(job.id, dashboardId);
      
      if (onCacheInvalidation) {
        onCacheInvalidation(invalidationResult);
      }
      
      console.log('Cache invalidation completed:', invalidationResult);
      
      // Auto refresh dashboard if enabled
      if (autoRefresh && onWidgetRefresh) {
        console.log('Auto-refreshing dashboard widgets');
        
        // Add a small delay to ensure backend operations are complete
        setTimeout(async () => {
          try {
            await onWidgetRefresh();
            console.log('Dashboard refresh completed successfully');
          } catch (error) {
            console.error('Failed to refresh dashboard:', error);
            if (showToasts) {
              toast.error('Failed to refresh dashboard. Please refresh manually.', {
                duration: 5000,
                position: 'top-right',
              });
            }
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error in job completion handling:', error);
      if (showToasts) {
        toast.error('Cache invalidation failed. Some data may be stale.', {
          duration: 5000,
          position: 'top-right',
        });
      }
    } finally {
      setIsInvalidatingCache(false);
    }
  }, [dashboardId, onWidgetRefresh, onCacheInvalidation, showToasts, autoRefresh, invalidateJobRelatedCaches]);

  // Handle job failure
  const handleJobFailure = useCallback((error: string) => {
    console.error('Dashboard job failed:', error);
    
    if (currentJobId) {
      setFailedJobs(prev => [...prev, currentJobId]);
    }
    
    if (showToasts) {
      toast.error(`❌ Task failed: ${error}`, {
        duration: 6000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#ffffff',
        },
      });
    }
  }, [currentJobId, showToasts]);

  // Handle job progress
  const handleJobProgress = useCallback((job: JobStatusData) => {
    console.log('Job progress update:', job);
    
    if (showToasts && job.progress && job.progress > 0) {
      // Only show progress toast for significant progress updates
      if (job.progress === 50 || job.progress === 75) {
        toast.loading(`Processing... ${job.progress}%`, {
          duration: 2000,
          position: 'top-right',
        });
      }
    }
  }, [showToasts]);

  // Job status tracking
  const { job, isConnected, isCompleted, isFailed } = useJobStatusRealtime(currentJobId, {
    onComplete: handleJobCompletion,
    onError: handleJobFailure,
    onProgress: handleJobProgress,
    autoRefreshDashboard: autoRefresh
  });

  // Track a new job
  const trackJob = useCallback((jobId: string) => {
    console.log('Starting to track job:', jobId);
    setCurrentJobId(jobId);
    
    if (showToasts) {
      toast.loading('🔄 Processing your request...', {
        duration: 3000,
        position: 'top-right',
      });
    }
  }, [showToasts]);

  // Stop tracking current job
  const stopTracking = useCallback(() => {
    console.log('Stopping job tracking');
    setCurrentJobId(null);
  }, []);

  // Clean up completed/failed jobs periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      // In a real implementation, you'd want to track timestamps
      // For now, just limit the arrays to prevent memory leaks
      setCompletedJobs(prev => prev.slice(-10));
      setFailedJobs(prev => prev.slice(-10));
    }, 60000); // Run every minute

    return () => clearInterval(cleanup);
  }, []);

  return {
    trackJob,
    stopTracking,
    currentJob: job,
    isProcessing: Boolean(currentJobId && job && !isCompleted && !isFailed) || isInvalidatingCache,
    completedJobs,
    failedJobs
  };
}