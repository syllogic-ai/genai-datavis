"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface LayoutState {
  mainSidebarOpen: boolean;
  chatSidebarOpen: boolean;
  availableWidth: number;
  effectiveBreakpoint: string;
  isTransitioning: boolean;
}

interface LayoutContextType extends LayoutState {
  setMainSidebarOpen: (open: boolean) => void;
  setChatSidebarOpen: (open: boolean) => void;
  getGridCols: () => number;
  getContainerWidth: () => number;
  triggerLayoutUpdate: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const SIDEBAR_WIDTHS = {
  main: 280,
  chat: 400,
} as const;

const BASE_BREAKPOINTS = {
  xs: { breakpoint: 480, cols: 2 },
  sm: { breakpoint: 768, cols: 4 },
  md: { breakpoint: 1024, cols: 8 },
  lg: { breakpoint: 1200, cols: 12 },
  xl: { breakpoint: 1536, cols: 12 },
} as const;

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [mainSidebarOpen, setMainSidebarOpen] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calculate available width considering sidebar states
  const availableWidth = useMemo(() => {
    let width = windowWidth;
    if (mainSidebarOpen) width -= SIDEBAR_WIDTHS.main;
    if (chatSidebarOpen) width -= SIDEBAR_WIDTHS.chat;
    return Math.max(320, width); // Minimum width for mobile
  }, [windowWidth, mainSidebarOpen, chatSidebarOpen]);

  // Determine effective breakpoint based on available width
  const effectiveBreakpoint = useMemo(() => {
    for (const [key, config] of Object.entries(BASE_BREAKPOINTS).reverse()) {
      if (availableWidth >= config.breakpoint) {
        return key;
      }
    }
    return 'xs';
  }, [availableWidth]);

  // Get grid columns based on effective breakpoint
  const getGridCols = useCallback(() => {
    const breakpoint = effectiveBreakpoint as keyof typeof BASE_BREAKPOINTS;
    return BASE_BREAKPOINTS[breakpoint].cols;
  }, [effectiveBreakpoint]);

  // Get container width for grid calculations
  const getContainerWidth = useCallback(() => {
    return availableWidth - 32; // Account for padding
  }, [availableWidth]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manage transition state with enhanced grid recovery
  const triggerLayoutUpdate = useCallback(() => {
    setIsTransitioning(true);
    
    // Add transitioning class to document body for global CSS coordination
    document.body.classList.add('layout-transitioning');
    
    // Trigger grid recalculation after DOM updates
    requestAnimationFrame(() => {
      // First update to start transition
      window.dispatchEvent(new Event('resize'));
      
      // Second update after transition completes
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        setIsTransitioning(false);
        document.body.classList.remove('layout-transitioning');
        
        // Final update to ensure proper layout recovery
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }, 350); // Slightly longer than CSS transition
    });
  }, []);

  // Handle sidebar state changes with transitions
  const handleSetMainSidebarOpen = useCallback((open: boolean) => {
    setMainSidebarOpen(open);
    triggerLayoutUpdate();
  }, [triggerLayoutUpdate]);

  const handleSetChatSidebarOpen = useCallback((open: boolean) => {
    setChatSidebarOpen(open);
    triggerLayoutUpdate();
  }, [triggerLayoutUpdate]);

  const contextValue: LayoutContextType = {
    mainSidebarOpen,
    chatSidebarOpen,
    availableWidth,
    effectiveBreakpoint,
    isTransitioning,
    setMainSidebarOpen: handleSetMainSidebarOpen,
    setChatSidebarOpen: handleSetChatSidebarOpen,
    getGridCols,
    getContainerWidth,
    triggerLayoutUpdate,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

// Hook for responsive grid settings with sidebar awareness
export function useResponsiveGrid() {
  const layout = useLayout();
  
  const gridProps = useMemo(() => {
    // Calculate adaptive columns based on available width
    const minWidgetWidth = 300; // Minimum widget width in pixels
    const maxColumns = 12;
    
    // Dynamic column calculation based on available width
    const calculateColumns = (width: number) => {
      const effectiveWidth = width - 32; // Account for padding
      const possibleColumns = Math.floor(effectiveWidth / minWidgetWidth);
      return Math.min(maxColumns, Math.max(1, possibleColumns));
    };
    
    // Get dynamic columns for current available width
    const dynamicCols = calculateColumns(layout.availableWidth);
    
    return {
      cols: { 
        xl: layout.availableWidth >= 1536 ? 12 : dynamicCols,
        lg: layout.availableWidth >= 1200 ? Math.min(12, dynamicCols) : dynamicCols,
        md: layout.availableWidth >= 1024 ? Math.min(8, dynamicCols) : dynamicCols,
        sm: layout.availableWidth >= 768 ? Math.min(4, dynamicCols) : dynamicCols,
        xs: layout.availableWidth >= 480 ? Math.min(2, dynamicCols) : dynamicCols,
        xxs: 1
      },
      breakpoints: {
        xl: 1536,
        lg: 1200,
        md: 1024,
        sm: 768,
        xs: 480,
        xxs: 0
      },
      rowHeight: layout.availableWidth < 768 ? 80 : 100,
      margin: layout.availableWidth < 768 ? [8, 8] : [16, 16] as [number, number],
      containerPadding: layout.availableWidth < 768 ? [8, 8] : [16, 16] as [number, number],
      width: layout.getContainerWidth(),
      isDraggable: !layout.isTransitioning,
      isResizable: !layout.isTransitioning,
      compactType: 'vertical' as const,
      preventCollision: false,
    };
  }, [layout]);

  return {
    ...layout,
    gridProps,
    isMobile: layout.availableWidth < 768,
    isTablet: layout.availableWidth >= 768 && layout.availableWidth < 1024,
    isDesktop: layout.availableWidth >= 1024,
  };
}