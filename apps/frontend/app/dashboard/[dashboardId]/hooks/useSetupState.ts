"use client";

import { useState, useEffect, useCallback } from 'react';
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

  // Check if we're in setup mode from URL params
  const isSetupModeFromURL = searchParams.get('setup') === 'true';

  // Load dashboard files (gracefully handle non-existent dashboards)
  const loadFiles = useCallback(async () => {
    if (!userId) {
      console.log('[useSetupState] No userId available, skipping file load');
      return;
    }
    if (!dashboardId) {
      console.log('[useSetupState] No dashboardId available, skipping file load');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`[useSetupState] Loading files for dashboard ${dashboardId} and user ${userId}`);
      
      const response = await fetch(`/api/dashboards/${dashboardId}/files`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[useSetupState] API error: ${response.status} - ${errorText}`);
        
        // If dashboard doesn't exist or no files, treat as empty state
        if (response.status === 404 || response.status === 401) {
          console.log(`[useSetupState] Dashboard not found or no access, treating as new dashboard`);
          setFiles([]);
          return;
        }
        
        throw new Error(`Failed to load files: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[useSetupState] Loaded ${data.files?.length || 0} files:`, data.files);
      setFiles(data.files || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      console.warn(`[useSetupState] ${errorMessage}, treating as new dashboard`);
      // Don't set error for new dashboards - this is expected behavior
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dashboardId]);

  // Determine if user has chatted based on widget count
  useEffect(() => {
    if (currentWidgetCount !== undefined) {
      setHasMessages(currentWidgetCount > 0);
    }
  }, [currentWidgetCount]);

  // Initialize data
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Also reload files when user authentication changes
  useEffect(() => {
    if (userId) {
      loadFiles();
    }
  }, [userId, loadFiles]);

  // Remove file from local state (API call handled by component)
  const removeFile = useCallback((fileId: string) => {
    console.log(`[useSetupState] Removing file ${fileId} from local state`);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Add file to list (called after successful upload)
  const addFile = useCallback((file: FileRecord) => {
    setFiles(prev => [...prev, file]);
  }, []);

  // Calculate setup state
  const setupState: SetupState = {
    hasFiles: files.length > 0,
    hasMessages,
    // Stay in setup mode if URL parameter is set (regardless of files) OR if no files and no messages
    isSetupMode: (isSetupModeFromURL || files.length === 0) && !hasMessages,
    // Only go to chat mode when NOT in setup mode URL and have files but no messages
    isChatMode: files.length > 0 && !hasMessages && !isSetupModeFromURL,
    isFullDashboard: hasMessages && !isSetupModeFromURL, // If has widgets/messages, show full dashboard regardless of files
  };

  // Debug logging
  React.useEffect(() => {
    console.log('[useSetupState] State update:', {
      filesCount: files.length,
      hasMessages,
      isSetupModeFromURL,
      setupState
    });
  }, [files.length, hasMessages, isSetupModeFromURL, setupState]);

  // Mark that user has sent first message
  const markFirstMessage = useCallback(() => {
    setHasMessages(true);
  }, []);

  // Refresh files from database
  const refreshFiles = useCallback(async () => {
    console.log('[useSetupState] Manually refreshing files...');
    await loadFiles();
  }, [loadFiles]);

  return {
    files,
    setupState,
    isLoading,
    error,
    loadFiles,
    refreshFiles,
    removeFile,
    addFile,
    markFirstMessage,
  };
}