import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface JobHistoryItem {
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

export interface JobHistoryStats {
  total: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
}

export interface UseJobHistoryOptions {
  dashboardId?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseJobHistoryReturn {
  jobs: JobHistoryItem[];
  stats: JobHistoryStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useJobHistory(options: UseJobHistoryOptions = {}): UseJobHistoryReturn {
  const { isSignedIn } = useAuth();
  const [jobs, setJobs] = useState<JobHistoryItem[]>([]);
  const [stats, setStats] = useState<JobHistoryStats>({
    total: 0,
    completed: 0,
    failed: 0,
    avgProcessingTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    dashboardId,
    limit = 50,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const fetchJobHistory = async () => {
    if (!isSignedIn) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0'
      });

      if (dashboardId) {
        params.append('dashboardId', dashboardId);
      }

      const response = await fetch(`/api/jobs/history?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job history');
      }

      const data = await response.json();
      setJobs(data.jobs);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching job history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobHistory();

    if (autoRefresh) {
      const interval = setInterval(fetchJobHistory, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isSignedIn, dashboardId, limit, autoRefresh, refreshInterval]);

  return {
    jobs,
    stats,
    isLoading,
    error,
    refresh: fetchJobHistory
  };
}