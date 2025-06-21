"use client";

import { motion, AnimatePresence } from "motion/react";
import { EnhancedDashboardGrid } from "./components/EnhancedDashboardGrid";
import { FloatingWidgetDock } from "./components/FloatingWidgetDock";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useDashboardState } from "./hooks/useDashboardState";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check, AlertCircle } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

export default function EnhancedDashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  
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
    addWidgetRef,
  } = useDashboardState(dashboardId);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with Publish Button */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-lg"
      >
        <DashboardHeader dashboardTitle={dashboardName} />
      </motion.div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1"
      >
        <EnhancedDashboardGrid
          widgets={widgets}
          onUpdateWidgets={handleUpdateWidgets}
          onAddWidget={(fn) => { addWidgetRef.current = fn; }}
        />
      </motion.div>

      {/* Floating Widget Dock */}
      <FloatingWidgetDock 
        onAddWidget={handleAddWidget} 
        fileName="sample-data.csv" // This can be replaced with actual file name when available
      />

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

      {/* React Hot Toast Container */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: '',
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
          },

          // Default options for specific types
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  );
}