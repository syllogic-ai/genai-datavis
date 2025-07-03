"use client";

import React from "react";
import { motion } from "motion/react";
import { ReactNode, memo } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useLayout } from "@/components/dashboard/LayoutContext";
import { cn } from "@/lib/utils";
import "../layout-transitions.css";

interface DashboardLayoutProps {
  dashboardName: string;
  isChatOpen: boolean;
  children: ReactNode;
  chatPanel?: ReactNode;
  onChatToggle?: () => void;
}

export const DashboardLayout = memo(function DashboardLayout({ 
  dashboardName, 
  isChatOpen, 
  children, 
  chatPanel,
  onChatToggle 
}: DashboardLayoutProps) {
  const { 
    availableWidth, 
    isTransitioning, 
    setChatSidebarOpen,
    effectiveBreakpoint 
  } = useLayout();

  // Sync chat sidebar state with layout context
  React.useEffect(() => {
    setChatSidebarOpen(isChatOpen);
  }, [isChatOpen, setChatSidebarOpen]);

  // Calculate panel sizes based on available width
  const mainPanelSize = isChatOpen ? Math.max(50, (availableWidth - 400) / availableWidth * 100) : 100;
  const chatPanelSize = isChatOpen ? Math.min(50, 400 / availableWidth * 100) : 0;
  
  // Use overlay mode for mobile
  const isMobile = availableWidth < 768;
  const useOverlay = isMobile && isChatOpen;

  return (
    <div className={cn(
      "min-h-screen dashboard-layout-container",
      isTransitioning && "layout-transitioning",
      // Add sidebar state classes for CSS targeting
      !isChatOpen && "sidebar-state-closed",
      isChatOpen && "sidebar-state-chat-open"
    )}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden"
      >
        <DashboardHeader dashboardTitle={dashboardName} />
      </motion.div>

      {/* Main Content with Responsive Layout */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "flex-1 h-[calc(100vh-4rem)] relative",
          "transition-all duration-300 ease-out",
          isTransitioning && "transition-transform"
        )}
        style={{
          width: `${availableWidth}px`,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}
      >
        {useOverlay ? (
          /* Mobile Overlay Mode */
          <>
            {/* Main Dashboard */}
            <div className="h-full overflow-auto">
              {children}
            </div>
            
            {/* Chat Overlay */}
            {isChatOpen && chatPanel && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
                className="mobile-chat-overlay absolute inset-0 z-50 bg-background border-l"
              >
                {chatPanel}
              </motion.div>
            )}
          </>
        ) : (
          /* Desktop Resizable Mode */
          <ResizablePanelGroup 
            direction="horizontal" 
            className={cn(
              "h-full resize-panel-group",
              "transition-all duration-300 ease-out",
              isTransitioning && "transition-transform"
            )}
          >
            {/* Main Dashboard Panel */}
            <ResizablePanel 
              defaultSize={mainPanelSize} 
              minSize={isChatOpen ? 30 : 100}
              maxSize={isChatOpen ? 80 : 100}
              className="resize-panel transition-all duration-300 ease-out"
            >
              <motion.div 
                className="h-full overflow-auto"
                animate={{ 
                  opacity: isTransitioning ? 0.8 : 1,
                  scale: isTransitioning ? 0.99 : 1
                }}
                transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
              >
                {children}
              </motion.div>
            </ResizablePanel>

            {/* Chat Panel */}
            {isChatOpen && chatPanel && (
              <>
                <ResizableHandle 
                  withHandle 
                  className="resize-handle transition-colors duration-300 hover:bg-border/60"
                />
                <ResizablePanel 
                  defaultSize={chatPanelSize} 
                  minSize={20} 
                  maxSize={50}
                  className="resize-panel chat-sidebar transition-all duration-300 ease-out"
                >
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
                    className="h-full"
                  >
                    {chatPanel}
                  </motion.div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </motion.div>

      {/* Global CSS for smooth transitions */}
      <style jsx global>{`
        .react-grid-item {
          transition: transform 300ms ease-out, width 300ms ease-out, height 300ms ease-out !important;
        }
        
        .react-grid-item.react-grid-placeholder {
          transition: all 300ms ease-out !important;
        }
        
        .react-grid-item > .react-resizable-handle {
          transition: all 300ms ease-out;
        }
        
        .layout-transitioning .react-grid-item {
          transition: all 300ms ease-out !important;
        }
        
        /* Ensure proper overflow handling during transitions */
        .react-grid-layout {
          transition: width 300ms ease-out;
        }
      `}</style>
    </div>
  );
});