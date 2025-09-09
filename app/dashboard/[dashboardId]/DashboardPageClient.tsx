"use client";

import { motion, AnimatePresence } from "motion/react";
import { SimpleDashboardLayout } from "./components/SimpleDashboardLayout";
import { FloatingWidgetDock } from "./components/FloatingWidgetDock";
import { TextEditorProvider } from "./components/TextEditorContext";
import { useEffect, useState, lazy, Suspense } from "react";
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
import * as React from "react";
import toast, { Toaster } from 'react-hot-toast';
import { useDashboardRealtime } from "@/app/lib/hooks/useDashboardRealtime";
import { useErrorHandling } from "@/app/lib/hooks/useErrorHandling";
import { DashboardThemeProvider, useDashboardTheme } from "@/components/theme/DashboardThemeProvider";
import { useDashboardSettings } from "./hooks/useDashboardSettings";
import { logger } from "@/lib/logger";
import { ChatSidebar } from "@/components/dashboard/chat-sidebar";
import { GoogleFontsLoader } from "@/components/tiptap/GoogleFonts";

interface DashboardPageClientProps {
  initialDashboard: any;
  initialFiles: any[];
  initialWidgets: any[];
  defaultChatId: string | null;
  searchParams: { [key: string]: string | string[] | undefined };
  userId: string;
}

function EnhancedDashboardContent({
  initialDashboard,
  initialFiles,
  initialWidgets,
  defaultChatId: preloadedChatId,
  searchParams: serverSearchParams,
  userId: serverUserId
}: DashboardPageClientProps) {
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

  // Dashboard state management with pre-loaded server data
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
  } = useDashboardState(dashboardId, {
    dashboard: initialDashboard,
    widgets: initialWidgets
  });

  // Setup state management with pre-loaded files
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
  } = useSetupState(dashboardId, widgets.length, {
    files: initialFiles,
    dashboard: initialDashboard
  });

  // Chat management for the dashboard - use preloaded chat ID if available
  const {
    chatId: hookChatId,
    isLoading: isChatLoading,
    error: chatError
  } = useDashboardChat(dashboardId);
  
  // Prefer preloaded chat ID from server, fallback to hook
  const defaultChatId = preloadedChatId || hookChatId;


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
      logger.debug('Widget added via realtime:', widget);
      // Directly update local state instead of refetching all widgets
      handleUpdateWidgets([...widgets, widget]);
    },
    onWidgetUpdated: (widget) => {
      logger.debug('Widget updated via realtime:', widget);
      // Update only the specific widget in local state
      handleUpdateWidgets(widgets.map(w => w.id === widget.id ? widget : w));
    },
    onWidgetDeleted: (widgetId) => {
      logger.debug('Widget deleted via realtime:', widgetId);
      // Remove only the specific widget from local state
      handleUpdateWidgets(widgets.filter(w => w.id !== widgetId));
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

  // Simplified approach - removed partial updates system since realtime handles updates efficiently
  
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
    themeMode: 'light',
    width: dashboardSettings.width || 'full',
    createdAt: new Date('2024-01-01'), // Use fixed date to prevent infinite re-renders
    updatedAt: null,
  }), [dashboardId, dashboardName, isPublished, dashboardSettings.width]);

  // Update the dashboard context whenever widgets change
  useEffect(() => {
    if (dashboardId && widgets.length >= 0) {
      logger.debug(`[DashboardPage] Updating context with ${widgets.length} widgets for dashboard ${dashboardId}`);
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
      // Include chat ID in URL if available to maintain chat context
      const chatParam = defaultChatId ? `&chat=${defaultChatId}` : '';
      router.replace(`/dashboard/${dashboardId}?phase=chat${chatParam}`);
    } else {
      // For returning users, just go back to dashboard, preserve chat ID if available
      const chatParam = defaultChatId ? `?chat=${defaultChatId}` : '';
      router.replace(`/dashboard/${dashboardId}${chatParam}`);
    }
  };

  const handleFirstMessage = () => {
    markFirstMessage();
    // Also mark setup as completed when first message is sent
    markSetupCompleted();
    
    // When transitioning from ChatPhase to full dashboard, maintain the chat ID in URL
    if (defaultChatId && !urlChatId) {
      router.replace(`/dashboard/${dashboardId}?chat=${defaultChatId}`);
    }
  };

  const handleBackToSetup = () => {
    // Navigate back to setup mode, preserve chat ID if available
    const chatParam = chatId ? `&chat=${chatId}` : '';
    router.replace(`/dashboard/${dashboardId}?setup=true${chatParam}`);
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

  // Simplified widget refresh
  const handleEnhancedWidgetRefresh = React.useCallback(async (changedWidgetIds?: string[]) => {
    try {
      // Load latest widgets with silent refresh to avoid loading states
      await loadWidgets({ bustCache: true, silent: true });
    } catch (error) {
      addError({
        message: 'Failed to refresh dashboard widgets',
        type: 'server',
        context: { dashboardId, changedWidgetIds },
        source: 'widget-refresh'
      });
    }
  }, [loadWidgets, addError, dashboardId]);

  // Debug phase rendering
  logger.debug('[Dashboard Page] Rendering decision:', {
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
  logger.debug('[Dashboard Page] Phase decision:', {
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
        onRefreshFiles={isUpdatingMode ? refreshFiles : undefined} // Only refresh if user is managing existing files
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
        onWidgetsRefresh={handleEnhancedWidgetRefresh}
      />
    );
  }

  // Full Dashboard (Phase 3)
  return (
    <TextEditorProvider>
      <GoogleFontsLoader />
      <div className="w-full h-full max-h-[calc(100vh-1rem)] flex flex-col">
      {/* Header with Publish Button */}
      <div className="overflow-hidden rounded-t-lg shrink-0">
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
      </div>

      {/* Text Editor Toolbar */}
      <DashboardToolbar />

      {/* Main Content - Apply theme here */}
      <div 
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
            onWidgetsRefresh={handleEnhancedWidgetRefresh}
            onJobStart={() => {}}
          />
        )}
      </div>

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

    </div>
    </TextEditorProvider>
  );
}

export default function DashboardPageClient({
  initialDashboard,
  initialFiles,
  initialWidgets,
  defaultChatId,
  searchParams,
  userId
}: DashboardPageClientProps) {
  const params = useParams();
  const dashboardId = params.dashboardId as string;

  return (
    <DashboardThemeProvider dashboardId={dashboardId}>
      <EnhancedDashboardContent
        initialDashboard={initialDashboard}
        initialFiles={initialFiles}
        initialWidgets={initialWidgets}
        defaultChatId={defaultChatId}
        searchParams={searchParams}
        userId={userId}
      />
    </DashboardThemeProvider>
  );
}