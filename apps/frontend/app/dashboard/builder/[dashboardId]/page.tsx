"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Widget } from "@/types/enhanced-dashboard-types";
import { EnhancedDashboardGrid } from "./components/EnhancedDashboardGrid";
import { FloatingWidgetDock } from "./components/FloatingWidgetDock";
import { useParams } from "next/navigation";

export default function EnhancedDashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dashboardName, setDashboardName] = useState("My Enhanced Dashboard");

  const handleUpdateWidgets = useCallback((newWidgets: Widget[]) => {
    setWidgets(newWidgets);
  }, []);

  // This will be set by the grid component
  const addWidgetRef = useRef<((type: string) => void) | null>(null);

  const handleAddWidget = useCallback((type: string) => {
    if (addWidgetRef.current) {
      addWidgetRef.current(type);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-white dark:bg-gray-800 px-6 py-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {dashboardName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dashboard ID: {dashboardId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => {
                const newName = prompt("Enter dashboard name:", dashboardName);
                if (newName) setDashboardName(newName);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Rename
            </button>
          </div>
        </div>
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
      <FloatingWidgetDock onAddWidget={handleAddWidget} />

      {/* Subtle gradient overlay for depth */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-950/10 dark:to-purple-950/10" />
    </div>
  );
}