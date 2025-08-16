"use client";

import { useState, useEffect } from 'react';

// Define types locally since they're not in dashboard-types
type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg';

const RESPONSIVE_BREAKPOINTS = {
  xs: { breakpoint: 480, cols: 2 },
  sm: { breakpoint: 768, cols: 4 },
  md: { breakpoint: 1024, cols: 8 },
  lg: { breakpoint: 1200, cols: 12 },
};

interface MobileLayoutConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  currentBreakpoint: BreakpointKey;
  chatLayout: 'overlay' | 'resizable';
  gridCols: number;
  shouldShowSidebar: boolean;
  orientation: 'portrait' | 'landscape';
}

// Mobile-specific layout adjustments
export function useMobileLayout(): MobileLayoutConfig {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointKey>('lg');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  useEffect(() => {
    const checkLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine device type and breakpoint
      if (width < RESPONSIVE_BREAKPOINTS.sm.breakpoint) {
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
        setCurrentBreakpoint(width < RESPONSIVE_BREAKPOINTS.xs.breakpoint ? 'xs' : 'sm');
      } else if (width < RESPONSIVE_BREAKPOINTS.lg.breakpoint) {
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
        setCurrentBreakpoint('md');
      } else {
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
        setCurrentBreakpoint('lg');
      }
      
      // Determine orientation
      setOrientation(height > width ? 'portrait' : 'landscape');
    };
    
    // Check initially
    checkLayout();
    
    // Listen for resize events
    window.addEventListener('resize', checkLayout);
    
    // Listen for orientation change events
    window.addEventListener('orientationchange', () => {
      // Delay to allow the orientation change to complete
      setTimeout(checkLayout, 100);
    });
    
    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint,
    // On mobile, chat should be full-screen overlay
    chatLayout: isMobile ? 'overlay' : 'resizable',
    // Simplified grid for mobile
    gridCols: RESPONSIVE_BREAKPOINTS[currentBreakpoint].cols,
    // Show sidebar only on desktop
    shouldShowSidebar: isDesktop,
    orientation,
  };
}

// Hook for responsive grid settings
export function useResponsiveGrid() {
  const layout = useMobileLayout();
  
  return {
    ...layout,
    // Grid configuration based on current breakpoint
    gridProps: {
      cols: { 
        lg: 12, 
        md: RESPONSIVE_BREAKPOINTS.md.cols, 
        sm: RESPONSIVE_BREAKPOINTS.sm.cols, 
        xs: RESPONSIVE_BREAKPOINTS.xs.cols 
      },
      breakpoints: {
        lg: RESPONSIVE_BREAKPOINTS.lg.breakpoint,
        md: RESPONSIVE_BREAKPOINTS.md.breakpoint,
        sm: RESPONSIVE_BREAKPOINTS.sm.breakpoint,
        xs: RESPONSIVE_BREAKPOINTS.xs.breakpoint,
      },
      rowHeight: layout.isMobile ? 80 : 100,
      margin: layout.isMobile ? [8, 8] : [16, 16],
      containerPadding: layout.isMobile ? [8, 8] : [16, 16],
    },
    // Touch-friendly settings for mobile
    touchSettings: {
      allowTouchScrolling: layout.isMobile,
      touchThreshold: 10,
      preventDefaultTouchEvents: false,
    },
  };
}

// Hook for mobile-specific chat behavior
export function useMobileChatBehavior() {
  const { isMobile, isTablet } = useMobileLayout();
  
  useEffect(() => {
    if (isMobile || isTablet) {
      // Prevent body scroll when chat is open on mobile
      const preventScroll = (e: TouchEvent) => {
        e.preventDefault();
      };
      
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isMobile, isTablet]);
  
  return {
    shouldPreventScroll: isMobile || isTablet,
    shouldUseFullscreen: isMobile,
    shouldUsePanGestures: isMobile || isTablet,
  };
}

// Hook for adaptive widget sizing
export function useAdaptiveWidgetSizing() {
  const { currentBreakpoint, isMobile } = useMobileLayout();
  
  const getAdaptiveSize = (baseSize: string) => {
    if (isMobile) {
      // On mobile, force widgets to be more compact
      const mobileMapping: Record<string, string> = {
        'chart-xl': 'chart-l',
        'chart-l': 'chart-m',
        'chart-m': 'chart-s',
        'table-l': 'table-m',
        'table-m': 'table-s',
        'text-s': 'text-xs',
      };
      return mobileMapping[baseSize] || baseSize;
    }
    return baseSize;
  };
  
  const getMinWidgetHeight = () => {
    return isMobile ? 60 : 80;
  };
  
  const getOptimalColumns = () => {
    return RESPONSIVE_BREAKPOINTS[currentBreakpoint].cols;
  };
  
  return {
    getAdaptiveSize,
    getMinWidgetHeight,
    getOptimalColumns,
    currentBreakpoint,
    isMobile,
  };
}

// Network-aware loading hook
export function useNetworkAwareLoading(widgetId: string) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loadingState, setLoadingState] = useState<'loading' | 'cached' | 'fresh' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Retry loading when coming back online
      if (retryCount > 0) {
        setLoadingState('loading');
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setLoadingState('cached');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryCount]);

  const retry = () => {
    setRetryCount(prev => prev + 1);
    setLoadingState('loading');
  };

  return { 
    isOnline, 
    loadingState, 
    setLoadingState,
    retry,
    retryCount 
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    widgetCount: 0,
    memoryUsage: 0,
  });

  useEffect(() => {
    // Measure performance
    const measurePerformance = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const renderTime = navigation.loadEventEnd - navigation.loadEventStart;
        
        // Get memory usage if available
        const memory = (performance as any).memory;
        const memoryUsage = memory ? memory.usedJSHeapSize : 0;
        
        setMetrics(prev => ({
          ...prev,
          renderTime,
          memoryUsage,
        }));
      }
    };

    // Measure after component mount
    setTimeout(measurePerformance, 100);
    
    // Set up periodic monitoring
    const interval = setInterval(measurePerformance, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const trackWidgetRender = (widgetId: string, startTime: number) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Log slow renders
    if (renderTime > 100) {
      console.warn(`Slow widget render: ${widgetId} took ${renderTime.toFixed(2)}ms`);
    }
    
    return renderTime;
  };

  return {
    metrics,
    trackWidgetRender,
  };
}