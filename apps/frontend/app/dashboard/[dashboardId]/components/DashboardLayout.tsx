"use client";

import { motion } from "motion/react";
import { ReactNode, memo } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface DashboardLayoutProps {
  dashboardName: string;
  isChatOpen: boolean;
  children: ReactNode;
  chatPanel?: ReactNode;
}

export const DashboardLayout = memo(function DashboardLayout({ 
  dashboardName, 
  isChatOpen, 
  children, 
  chatPanel 
}: DashboardLayoutProps) {
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

      {/* Main Content with Resizable Layout */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 h-[calc(100vh-4rem)]"
      >
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Main Dashboard Panel */}
          <ResizablePanel defaultSize={isChatOpen ? 75 : 100} minSize={50}>
            <div className="h-full overflow-auto">
              {children}
            </div>
          </ResizablePanel>

          {/* Chat Panel */}
          {isChatOpen && chatPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
                {chatPanel}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </motion.div>
    </div>
  );
});