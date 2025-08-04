"use client";

import { motion, AnimatePresence } from "motion/react";
import { SimpleDashboardLayout } from "./components/SimpleDashboardLayout";
import { FloatingWidgetDock } from "./components/FloatingWidgetDock";
import { ChatSidebar } from "@/components/dashboard/chat-sidebar";
import { TextEditorProvider } from "./components/TextEditorContext";
import { DashboardToolbar } from "./components/DashboardToolbar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useDashboardState } from "./hooks/useDashboardState";
import { useSetupState } from "./hooks/useSetupState";
import { useDashboardChat } from "./hooks/useDashboardChat";
import { SetupPhase } from "./components/SetupPhase";
import { ChatPhase } from "./components/ChatPhase";
import { useDashboardContext } from "@/components/dashboard/DashboardUserContext";
import { useModalCleanup } from "@/hooks/useModalCleanup";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import * as React from "react";
import toast, { Toaster } from 'react-hot-toast';
import { useDashboardJobCompletion } from "@/app/lib/hooks/useDashboardJobCompletion";
import { useDashboardRealtime } from "@/app/lib/hooks/useDashboardRealtime";
import { usePartialDashboardUpdates } from "@/app/lib/hooks/usePartialDashboardUpdates";
import { useErrorHandling } from "@/app/lib/hooks/useErrorHandling";
import { DashboardThemeProvider, useDashboardTheme } from "@/components/theme/DashboardThemeProvider";
import { useDashboardSettings } from "./hooks/useDashboardSettings";

function EnhancedDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardId = params.dashboardId as string;
  const { updateCurrentDashboard } = useDashboardContext();
  const { setOpen: setNavigationSidebarOpen } = useSidebar();
  const { themeClassName, getThemeStyles } = useDashboardTheme();
  
  // Get theme styles for background
  const themeStyles = getThemeStyles();
  const themeBackground = themeStyles?.background || '';
  
  // Chat sidebar state
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  
  // Initialize modal cleanup to prevent overlay issues
  const { manualCleanup } = useModalCleanup();

  // Dashboard settings management
  const {
    settings: dashboardSettings,
    isLoading: isSettingsLoading,
    setWidth: setDashboardWidth
  } = useDashboardSettings(dashboardId);

  // Dashboard state management (load widgets first)
  const {
    widgets,
    dashboardName,
    isLoading,
    isSaving,
    saveStatus,
    error,
    isPublished,
    isPublishLoading,
    handleUpdateWidgets,
    handleAddWidget,
    saveWidgets,
    loadWidgets,
    publishDashboard,
    unpublishDashboard,
    addWidgetRef,
  } = useDashboardState(dashboardId);

  // Setup state management (depends on widget count)
  const {
    files,
    setupState,
    isLoading: isSetupLoading,
    error: setupError,
    removeFile,
    addFile,
    markFirstMessage,
    markSetupCompleted,
    refreshFiles,
  } = useSetupState(dashboardId, widgets.length);

  // Chat management for the dashboard
  const {
    chatId: defaultChatId,
    isLoading: isChatLoading,
    error: chatError
  } = useDashboardChat(dashboardId);

  // Enhanced job completion and realtime handling
  const {
    trackJob,
    stopTracking,
    currentJob,
    isProcessing,
    completedJobs,
    failedJobs
  } = useDashboardJobCompletion({
    dashboardId,
    onWidgetRefresh: () => loadWidgets({ bustCache: true, silent: true }),
    onCacheInvalidation: (result) => {
      console.log('Cache invalidation result:', result);
    },
    showToasts: true,
    autoRefresh: true
  });

  // Realtime dashboard updates with optimistic UI
  const {
    isConnected: isRealtimeConnected,
    lastUpdate,
    optimisticUpdates,
    addOptimisticUpdate,
    rollbackOptimisticUpdate,
    clearOptimisticUpdates
  } = useDashboardRealtime({
    dashboardId,
    onWidgetAdded: (widget) => {
      console.log('Widget added via realtime:', widget);
      // Trigger a silent refresh to include the new widget
      loadWidgets({ bustCache: true, silent: true });
    },
    onWidgetUpdated: (widget) => {
      console.log('Widget updated via realtime:', widget);
      // Trigger a silent refresh to update the widget
      loadWidgets({ bustCache: true, silent: true });
    },
    onWidgetDeleted: (widgetId) => {
      console.log('Widget deleted via realtime:', widgetId);
      // Trigger a silent refresh to remove the widget
      loadWidgets({ bustCache: true, silent: true });
    },
    enableOptimisticUpdates: true,
    enableCrossTabSync: true,
    showNotifications: true
  });

  // Error handling system
  const {
    errors,
    hasErrors,
    isRetrying,
    addError,
    clearErrors,
    handleAsyncError
  } = useErrorHandling({
    maxRetries: 3,
    retryDelay: 1000,
    showToasts: true,
    logErrors: true,
    autoRetry: false
  });

  // Partial updates for large dashboards
  const {
    updateWidgets: performPartialUpdate,
    isUpdating: isPartiallyUpdating,
    updateProgress: partialUpdateProgress,
    queuedUpdates,
    completedUpdates,
    failedUpdates
  } = usePartialDashboardUpdates(
    (widget) => {
      console.log('Partial update applied to widget:', widget.id);
      // Force re-render of specific widget
      handleUpdateWidgets(widgets.map(w => w.id === widget.id ? widget : w));
    },
    {
      maxConcurrentUpdates: 3,
      batchSize: 5,
      updateDelay: 100,
      prioritizeVisible: true
    }
  );
  
  // Get chat ID from URL parameter or fall back to default
  const urlChatId = searchParams.get('chat');
  const chatId = urlChatId || defaultChatId;

  // Memoize dashboard object to prevent recreation on every render
  const dashboardObj = React.useMemo(() => ({
    id: dashboardId,
    name: dashboardName,
    userId: '', // Will be filled by context
    description: null,
    icon: 'document-text',
    setupCompleted: true,
    isPublic: isPublished,
    activeThemeId: null,
    width: dashboardSettings.width || 'full',
    createdAt: new Date('2024-01-01'), // Use fixed date to prevent infinite re-renders
    updatedAt: null,
  }), [dashboardId, dashboardName, isPublished, dashboardSettings.width]);

  // Update the dashboard context whenever widgets change
  useEffect(() => {
    if (dashboardId && widgets.length >= 0) {
      console.log(`[DashboardPage] Updating context with ${widgets.length} widgets for dashboard ${dashboardId}`);
      updateCurrentDashboard(dashboardObj, widgets);
    }
  }, [dashboardId, widgets, dashboardObj, updateCurrentDashboard]);

  // Cleanup any stuck overlays when dashboard loads
  useEffect(() => {
    const timer = setTimeout(() => {
      manualCleanup();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [manualCleanup]);

  // Sidebar coordination handlers
  const handleChatSidebarToggle = () => {
    const newState = !isChatSidebarOpen;
    setIsChatSidebarOpen(newState);
    
    // Close navigation sidebar when chat opens
    if (newState) {
      setNavigationSidebarOpen(false);
    }
  };

  // Phase transition handlers
  const handleSetupComplete = () => {
    // For first-time setup, navigate to chat phase
    // Use phase=chat to explicitly show chat mode
    if (!setupState.hasMessages && files.length > 0) {
      router.replace(`/dashboard/${dashboardId}?phase=chat`);
    } else {
      // For returning users, just go back to dashboard
      router.replace(`/dashboard/${dashboardId}`);
    }
  };

  const handleFirstMessage = () => {
    markFirstMessage();
    // Also mark setup as completed when first message is sent
    markSetupCompleted();
  };

  const handleBackToSetup = () => {
    // Navigate back to setup mode
    router.replace(`/dashboard/${dashboardId}?setup=true`);
  };


  const handlePublish = async () => {
    const result = await handleAsyncError(
      () => saveWidgets(),
      { source: 'dashboard-publish', dashboardId }
    );
    
    if (result) {
      toast.success("Dashboard published successfully! 🎉", {
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  // Enhanced widget refresh with error handling and partial updates
  const handleEnhancedWidgetRefresh = React.useCallback(async (changedWidgetIds?: string[]) => {
    try {
      // Load latest widgets
      await loadWidgets({ bustCache: true, silent: true });
      
      // If specific widgets changed, use partial update
      if (changedWidgetIds && changedWidgetIds.length > 0 && widgets.length > 10) {
        console.log('Using partial update for large dashboard');
        await performPartialUpdate(widgets, changedWidgetIds);
      }
    } catch (error) {
      addError({
        message: 'Failed to refresh dashboard widgets',
        type: 'server',
        context: { dashboardId, changedWidgetIds },
        source: 'widget-refresh'
      });
    }
  }, [loadWidgets, widgets, performPartialUpdate, addError, dashboardId]);

  // Debug phase rendering
  console.log('[Dashboard Page] Rendering decision:', {
    isLoading,
    isSetupLoading,
    setupState,
    widgetsCount: widgets.length,
    isSetupModeFromURL: searchParams.get('setup') === 'true'
  });

  // Show loading state while initial data is being loaded
  if (isLoading || isSetupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || setupError || chatError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error || setupError || chatError}</p>
        </div>
      </div>
    );
  }

  // Progressive flow: Setup → Chat → Full Dashboard
  console.log('[Dashboard Page] Phase decision:', {
    isFullDashboard: setupState.isFullDashboard,
    isSetupMode: setupState.isSetupMode,
    isChatMode: setupState.isChatMode,
    showingPhase: setupState.isFullDashboard ? 'FULL_DASHBOARD' : 
                  setupState.isSetupMode ? 'SETUP' : 
                  setupState.isChatMode ? 'CHAT' : 'UNKNOWN'
  });
  
  // If we're in setup mode (either by URL or natural flow), show setup
  if (setupState.isSetupMode) {
    // Check if this is an update mode (user has widgets but came back to setup)
    const isUpdatingMode = widgets.length > 0 || setupState.hasMessages;
    
    return (
      <SetupPhase
        dashboardId={dashboardId}
        files={files}
        onFileAdded={addFile}
        onFileRemoved={removeFile}
        onContinue={handleSetupComplete}
        onRefreshFiles={refreshFiles}
        isLoading={isSetupLoading}
        isUpdatingMode={isUpdatingMode}
      />
    );
  }

  // If we're in chat mode, show chat
  if (setupState.isChatMode) {
    return (
      <ChatPhase
        dashboardId={dashboardId}
        files={files}
        onFirstMessage={handleFirstMessage}
        onBack={handleBackToSetup}
        onWidgetsRefresh={() => loadWidgets({ bustCache: true, silent: true })}
      />
    );
  }

  // Full Dashboard (Phase 3)
  return (
    <TextEditorProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-full max-h-[calc(100vh-1rem)] flex flex-col"
      >
      {/* Header with Publish Button */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-t-lg shrink-0"
      >
        <DashboardHeader 
          dashboardTitle={dashboardName} 
          dashboardId={dashboardId}
          dashboardWidth={dashboardSettings.width}
          onWidthChange={setDashboardWidth}
          isPublic={isPublished}
          onPublish={publishDashboard}
          onUnpublish={unpublishDashboard}
          isPublishLoading={isPublishLoading}
        />
      </motion.div>

      {/* Text Editor Toolbar */}
      <DashboardToolbar />

      {/* Main Content - Apply theme here */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex overflow-hidden"
        style={{ backgroundColor: themeBackground }}
      >
        {/* Themed content area - Only dashboard widgets get themed */}
        <div 
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${themeClassName}`}
          style={{ 
            width: isChatSidebarOpen ? 'calc(100% - 400px)' : '100%',
            minWidth: '320px' // Ensure minimum usable width
          }}
        >
          <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'none' }}>
            <SimpleDashboardLayout
              widgets={widgets}
              onUpdateWidgets={handleUpdateWidgets}
              onAddWidget={(fn) => { addWidgetRef.current = fn; }}
              isLoading={isLoading}
              width={dashboardSettings.width}
            />
          </div>

          {/* Floating Widget Dock - positioned relative to this content area */}
          <FloatingWidgetDock 
            onAddWidget={handleAddWidget} 
            onOpenChatSidebar={handleChatSidebarToggle}
            fileName="sample-data.csv" // This can be replaced with actual file name when available
            chatSidebarOpen={isChatSidebarOpen}
          />
        </div>

        {/* Chat Sidebar - Outside theme scope */}
        {chatId && (
          <ChatSidebar
            dashboardId={dashboardId}
            chatId={chatId}
            isOpen={isChatSidebarOpen}
            onToggle={handleChatSidebarToggle}
            dashboardWidgets={widgets}
            onWidgetsRefresh={() => loadWidgets({ bustCache: true, silent: true })}
            onJobStart={trackJob}
          />
        )}
      </motion.div>

      {/* Status Indicators */}
      <AnimatePresence mode="wait">
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {saveStatus === 'saving' && (
            <motion.div
              key="saving"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </motion.div>
          )}
          
          {saveStatus === 'saved' && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm">Saved</span>
            </motion.div>
          )}
          
          {saveStatus === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Failed to save</span>
            </motion.div>
          )}
          
          {/* Processing Status */}
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </motion.div>
          )}
          
          
          {/* Optimistic Updates Indicator */}
          {optimisticUpdates.length > 0 && (
            <motion.div
              key="optimistic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{optimisticUpdates.length} pending...</span>
            </motion.div>
          )}
          
          {/* Partial Update Progress */}
          {isPartiallyUpdating && (
            <motion.div
              key="partial-update"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg min-w-[200px]"
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Updating widgets...</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 bg-indigo-800 rounded-full h-1">
                  <div 
                    className="bg-white rounded-full h-1 transition-all duration-300"
                    style={{ width: `${partialUpdateProgress}%` }}
                  />
                </div>
                <span>{completedUpdates}/{queuedUpdates}</span>
              </div>
            </motion.div>
          )}
          
          {/* Error Indicator */}
          {hasErrors && (
            <motion.div
              key="errors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer"
              onClick={clearErrors}
              title="Click to dismiss all errors"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{errors.length} error(s)</span>
            </motion.div>
          )}
          
          {/* Retry Indicator */}
          {isRetrying && (
            <motion.div
              key="retrying"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Retrying...</span>
            </motion.div>
          )}
        </div>
      </AnimatePresence>

    </motion.div>
    </TextEditorProvider>
  );
}

export default function EnhancedDashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;

  return (
    <DashboardThemeProvider dashboardId={dashboardId}>
      <EnhancedDashboardContent />
    </DashboardThemeProvider>
  );
}