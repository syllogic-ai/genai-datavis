"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  uploadedAt: Date;
}

export interface SetupState {
  hasFiles: boolean;
  hasMessages: boolean;
  isSetupMode: boolean;
  isChatMode: boolean;
  isFullDashboard: boolean;
}

export function useSetupState(dashboardId: string, currentWidgetCount?: number) {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [hasMessages, setHasMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Check phase from URL params
  const urlPhase = searchParams.get('phase');
  const isSetupModeFromURL = searchParams.get('setup') === 'true' || urlPhase === 'setup';
  const isChatModeFromURL = urlPhase === 'chat';
  console.log('[useSetupState] URL params:', { setup: searchParams.get('setup'), phase: urlPhase });

  // Load dashboard data and files
  const loadDashboardData = useCallback(async () => {
    if (!userId) {
      console.log('[useSetupState] No userId available, skipping dashboard load');
      return;
    }
    if (!dashboardId) {
      console.log('[useSetupState] No dashboardId available, skipping dashboard load');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`[useSetupState] Loading dashboard data for ${dashboardId} and user ${userId}`);
      
      // Load dashboard metadata (including setupCompleted)
      const dashboardResponse = await fetch(`/api/dashboards/${dashboardId}`);
      if (dashboardResponse.ok) {
        const dashboard = await dashboardResponse.json();
        setDashboardData(dashboard);
        // For first-time setup flow, ignore setupCompleted from DB if no widgets exist
        const hasWidgets = dashboard.widgetCount > 0;
        const effectiveSetupCompleted = hasWidgets ? (dashboard.setupCompleted || false) : false;
        setSetupCompleted(effectiveSetupCompleted);
        console.log(`[useSetupState] Dashboard data:`, {
          widgetCount: dashboard.widgetCount,
          dbSetupCompleted: dashboard.setupCompleted,
          effectiveSetupCompleted
        });
      } else {
        console.warn(`[useSetupState] Failed to load dashboard metadata: ${dashboardResponse.status}`);
      }
      
      // Load files
      const filesResponse = await fetch(`/api/dashboards/${dashboardId}/files`);
      
      if (!filesResponse.ok) {
        const errorText = await filesResponse.text();
        console.error(`[useSetupState] Files API error: ${filesResponse.status} - ${errorText}`);
        
        // If dashboard doesn't exist or no files, treat as empty state
        if (filesResponse.status === 404 || filesResponse.status === 401) {
          console.log(`[useSetupState] Dashboard not found or no access, treating as new dashboard`);
          setFiles([]);
          return;
        }
        
        throw new Error(`Failed to load files: ${filesResponse.status} - ${errorText}`);
      }

      const filesData = await filesResponse.json();
      console.log(`[useSetupState] Loaded ${filesData.files?.length || 0} files:`, filesData.files);
      setFiles(filesData.files || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      console.warn(`[useSetupState] ${errorMessage}, treating as new dashboard`);
      // Don't set error for new dashboards - this is expected behavior
      setFiles([]);
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dashboardId]);

  // Determine if user has chatted based on widget count
  useEffect(() => {
    console.log('[useSetupState] Widget count changed:', currentWidgetCount);
    if (currentWidgetCount !== undefined) {
      setHasMessages(currentWidgetCount > 0);
    }
  }, [currentWidgetCount]);

  // Initialize data
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Also reload data when user authentication changes
  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
  }, [userId, loadDashboardData]);

  // Remove file from local state (API call handled by component)
  const removeFile = useCallback((fileId: string) => {
    console.log(`[useSetupState] Removing file ${fileId} from local state`);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Add file to list (called after successful upload)
  const addFile = useCallback((file: FileRecord) => {
    setFiles(prev => [...prev, file]);
  }, []);

  // Calculate setup state - memoized to prevent unnecessary recalculations
  const setupState: SetupState = useMemo(() => {
    // If loading, return a safe default state
    if (isLoading) {
      return {
        hasFiles: false,
        hasMessages: false,
        isSetupMode: false,
        isChatMode: false,
        isFullDashboard: false,
      };
    }

    const hasFiles = files.length > 0;
    
    // For first-time setup (no widgets/messages), enforce the proper flow
    if (!hasMessages) {
      // If chat mode is explicitly set in URL, show chat phase
      if (isChatModeFromURL && hasFiles) {
        console.log('[useSetupState] Returning CHAT mode from URL');
        return {
          hasFiles,
          hasMessages: false,
          isSetupMode: false,
          isChatMode: true,
          isFullDashboard: false,
        };
      }
      
      // Otherwise, show setup mode until user explicitly moves forward
      // This includes: setup URL param, no phase param, or no files yet
      console.log('[useSetupState] Returning SETUP mode - isSetupModeFromURL:', isSetupModeFromURL, 'hasFiles:', hasFiles);
      return {
        hasFiles,
        hasMessages: false,
        isSetupMode: true,
        isChatMode: false,
        isFullDashboard: false,
      };
    }
    
    // Phase 3: Full dashboard - has messages (widgets)
    // But allow going back to setup if URL param is set
    if (isSetupModeFromURL) {
      return {
        hasFiles,
        hasMessages: true,
        isSetupMode: true,
        isChatMode: false,
        isFullDashboard: false,
      };
    }
    
    return {
      hasFiles,
      hasMessages: true,
      isSetupMode: false,
      isChatMode: false,
      isFullDashboard: true,
    };
  }, [files.length, hasMessages, isSetupModeFromURL, isChatModeFromURL, isLoading]);

  // Debug logging
  React.useEffect(() => {
    console.log('[useSetupState] State update:', {
      filesCount: files.length,
      hasMessages,
      isSetupModeFromURL,
      setupCompleted,
      setupState
    });
  }, [files.length, hasMessages, isSetupModeFromURL, setupCompleted, setupState]);

  // Mark that user has sent first message
  const markFirstMessage = useCallback(() => {
    setHasMessages(true);
  }, []);

  // Mark that user has completed setup phase
  const markSetupCompleted = useCallback(async () => {
    console.log('[useSetupState] Marking setup as completed');
    
    try {
      // Update database
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setupCompleted: true }),
      });
      
      if (response.ok) {
        setSetupCompleted(true);
        console.log('[useSetupState] Setup completed successfully updated in database');
      } else {
        console.error('[useSetupState] Failed to update setup completed in database');
        // Still update local state as fallback
        setSetupCompleted(true);
      }
    } catch (error) {
      console.error('[useSetupState] Error updating setup completed:', error);
      // Still update local state as fallback
      setSetupCompleted(true);
    }
  }, [dashboardId]);

  // Refresh files from database
  const refreshFiles = useCallback(async () => {
    console.log('[useSetupState] Manually refreshing files...');
    await loadDashboardData();
  }, [loadDashboardData]);

  return {
    files,
    setupState,
    isLoading,
    error,
    dashboardData,
    loadFiles: loadDashboardData,
    refreshFiles,
    removeFile,
    addFile,
    markFirstMessage,
    markSetupCompleted,
  };
}