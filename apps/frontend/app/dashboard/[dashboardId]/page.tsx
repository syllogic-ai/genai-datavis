"use client";

import { motion, AnimatePresence } from "motion/react";
import { EnhancedDashboardGrid } from "./components/EnhancedDashboardGrid";
import { FloatingWidgetDock } from "./components/FloatingWidgetDock";
import { ChatSidebar } from "@/components/dashboard/chat-sidebar";
import { useParams, useRouter } from "next/navigation";
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

export default function EnhancedDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params.dashboardId as string;
  const { updateCurrentDashboard } = useDashboardContext();
  const { setOpen: setNavigationSidebarOpen } = useSidebar();
  
  // Chat sidebar state
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  
  // Initialize modal cleanup to prevent overlay issues
  const { manualCleanup } = useModalCleanup();

  // Dashboard state management (load widgets first)
  const {
    widgets,
    dashboardName,
    isLoading,
    isSaving,
    saveStatus,
    error,
    isPublished,
    handleUpdateWidgets,
    handleAddWidget,
    saveWidgets,
    loadWidgets,
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
    refreshFiles,
  } = useSetupState(dashboardId, widgets.length);

  // Chat management for the dashboard
  const {
    chatId,
    isLoading: isChatLoading,
    error: chatError
  } = useDashboardChat(dashboardId);

  // Memoize dashboard object to prevent recreation on every render
  const dashboardObj = React.useMemo(() => ({
    id: dashboardId,
    name: dashboardName,
    userId: '', // Will be filled by context
    description: null,
    icon: 'document-text',
    fileId: null,
    createdAt: new Date('2024-01-01'), // Use fixed date to prevent infinite re-renders
    updatedAt: null,
  }), [dashboardId, dashboardName]);

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
    // Navigate to dashboard without setup parameter
    router.replace(`/dashboard/${dashboardId}`);
  };

  const handleFirstMessage = () => {
    markFirstMessage();
  };

  const handleBackToSetup = () => {
    // Navigate back to setup mode
    router.replace(`/dashboard/${dashboardId}?setup=true`);
  };


  const handlePublish = async () => {
    const success = await saveWidgets();
    if (success) {
      toast.success("Dashboard published successfully! 🎉", {
        duration: 3000,
        position: 'top-right',
      });
    } else {
      toast.error("Failed to publish dashboard. Please try again.", {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  if (isLoading || isSetupLoading || isChatLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading dashboard...</span>
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
  if (setupState.isSetupMode) {
    return (
      <SetupPhase
        dashboardId={dashboardId}
        files={files}
        onFileAdded={addFile}
        onFileRemoved={removeFile}
        onContinue={handleSetupComplete}
        onRefreshFiles={refreshFiles}
        isLoading={false}
      />
    );
  }

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
        />
      </motion.div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex overflow-hidden"
      >
        <div 
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
          style={{ 
            width: isChatSidebarOpen ? 'calc(100% - 400px)' : '100%',
            minWidth: '320px' // Ensure minimum usable width
          }}
        >
          <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'none' }}>
            <EnhancedDashboardGrid
              widgets={widgets}
              onUpdateWidgets={handleUpdateWidgets}
              onAddWidget={(fn) => { addWidgetRef.current = fn; }}
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

        {/* Chat Sidebar - Integrated inline */}
        {chatId && (
          <ChatSidebar
            dashboardId={dashboardId}
            chatId={chatId}
            isOpen={isChatSidebarOpen}
            onToggle={handleChatSidebarToggle}
            dashboardWidgets={widgets}
            onWidgetsRefresh={() => loadWidgets({ bustCache: true, silent: true })}
          />
        )}
      </motion.div>

      {/* Save Status Indicator */}
      <AnimatePresence mode="wait">
        <div className="fixed bottom-4 right-4 z-50">
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
        </div>
      </AnimatePresence>

    </motion.div>
  );
}