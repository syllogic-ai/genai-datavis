import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface JobStatusData {
  id: string;
  userId: string;
  dashboardId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  processingTimeMs: number | null;
  queueTimeMs: number | null;
}

export interface UseJobStatusOptions {
  onStatusChange?: (job: JobStatusData) => void;
  onComplete?: (job: JobStatusData) => void;
  onError?: (error: string) => void;
}

export interface UseJobStatusReturn {
  job: JobStatusData | null;
  status: string | null;
  progress: number;
  error: string | null;
  isConnected: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  disconnect: () => void;
}

export function useJobStatusRealtime(
  jobId: string | null,
  options: UseJobStatusOptions = {}
): UseJobStatusReturn {
  const { isSignedIn, userId } = useAuth();
  const [job, setJob] = useState<JobStatusData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const {
    onStatusChange,
    onComplete,
    onError
  } = options;

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const fetchInitialJob = useCallback(async (supabase: any, retryCount = 0) => {
    if (!jobId || !userId) return;

    try {
      // Fetch initial job state
      // Note: RLS will automatically filter to only show jobs owned by the authenticated user
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        // If job not found and this is the first attempt, retry after a delay
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log(`Job not found yet, retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => {
            fetchInitialJob(supabase, retryCount + 1);
          }, (retryCount + 1) * 1000);
          return;
        }
        
        console.error('Error fetching job:', error);
        // Only show error after retries exhausted
        if (retryCount >= 3 && onError) {
          onError('Job not found. It may still be initializing.');
        }
        return;
      }

      if (data) {
        setJob(data);
        if (onStatusChange) {
          onStatusChange(data);
        }

        // Check if already completed
        if (data.status === 'completed' && !hasCompleted) {
          setHasCompleted(true);
          if (onComplete) {
            onComplete(data);
          }
          // Don't set up subscription if job is already done
          return;
        } else if (data.status === 'failed' && !hasCompleted) {
          setHasCompleted(true);
          if (onError) {
            onError(data.error || 'Job failed');
          }
          // Don't set up subscription if job is already done
          return;
        }
      }
    } catch (err) {
      console.error('Error in fetchInitialJob:', err);
      // Only show error on final retry
      if (retryCount >= 3 && onError) {
        onError('Failed to connect to job status');
      } else if (retryCount < 3) {
        // Retry on network errors
        setTimeout(() => {
          fetchInitialJob(supabase, retryCount + 1);
        }, (retryCount + 1) * 1000);
      }
    }
  }, [jobId, userId, onStatusChange, onComplete, onError, hasCompleted]);

  useEffect(() => {
    if (!jobId || !isSignedIn || !userId || hasCompleted) {
      return;
    }

    const supabase = createClient();
    
    // Fetch initial job state
    fetchInitialJob(supabase);
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('Job update received:', payload);
          
          const updatedJob = payload.new as JobStatusData;
          setJob(updatedJob);
          
          if (onStatusChange) {
            onStatusChange(updatedJob);
          }

          // Handle completion (only if not already completed)
          if (updatedJob.status === 'completed' && !hasCompleted) {
            setHasCompleted(true);
            if (onComplete) {
              onComplete(updatedJob);
            }
            // Disconnect immediately after completion
            disconnect();
          }

          // Handle failure (only if not already failed)
          if (updatedJob.status === 'failed' && !hasCompleted) {
            setHasCompleted(true);
            if (onError) {
              onError(updatedJob.error || 'Job failed');
            }
            // Disconnect immediately after failure
            disconnect();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('Job created:', payload);
          const newJob = payload.new as JobStatusData;
          setJob(newJob);
          if (onStatusChange) {
            onStatusChange(newJob);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [jobId, isSignedIn, userId, hasCompleted]);

  return {
    job,
    status: job?.status || null,
    progress: job?.progress || 0,
    error: job?.error || null,
    isConnected,
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    disconnect
  };
}