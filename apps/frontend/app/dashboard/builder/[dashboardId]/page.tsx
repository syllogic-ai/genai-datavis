"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Widget } from "@/types/enhanced-dashboard-types";
import { EnhancedDashboardGrid } from "./components/EnhancedDashboardGrid";
import { FloatingWidgetDock } from "./components/FloatingWidgetDock";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function EnhancedDashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dashboardName, setDashboardName] = useState("My Dashboard");

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
    <div className="min-h-screen">
      {/* Header */}
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
      <FloatingWidgetDock onAddWidget={handleAddWidget} />
    </div>
  );
}