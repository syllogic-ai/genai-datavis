"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Widget } from "@/types/enhanced-dashboard-types";
import { WidgetWithLayout } from "@/types/dashboard-types";
import type { ChartSpec } from "@/types/chart-types";

export function useDashboardState(dashboardId: string) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dashboardName, setDashboardName] = useState("My Dashboard");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference to the grid component's add widget function
  const addWidgetRef = useRef<((type: string) => void) | null>(null);

  const handleUpdateWidgets = useCallback((newWidgets: Widget[]) => {
    setWidgets(newWidgets);
  }, []);

  const handleAddWidget = useCallback((type: string) => {
    if (addWidgetRef.current) {
      addWidgetRef.current(type);
    }
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const handleChartCreated = useCallback((widgetId: string, chartConfig: ChartSpec) => {
    const updatedWidgets = widgets.map(widget => {
      if (widget.id === widgetId) {
        return {
          ...widget,
          config: { ...widget.config, ...chartConfig },
          isConfigured: true,
          data: chartConfig.data || null,
        };
      }
      return widget;
    });
    handleUpdateWidgets(updatedWidgets);
  }, [widgets, handleUpdateWidgets]);

  // Convert Widget[] to WidgetWithLayout[] for compatibility (memoized)
  const widgetsWithLayout: WidgetWithLayout[] = useMemo(() => 
    widgets.map(widget => ({
      id: widget.id,
      userId: '', // This will be populated when needed
      chatId: widget.chatId || null,
      type: widget.type,
      subtype: null,
      title: widget.config?.title || null,
      chartSpecs: widget.config?.chartSpecs || null,
      sql: null,
      data: widget.data || null,
      config: widget.config,
      isConfigured: widget.isConfigured || false,
      cacheKey: null,
      lastDataFetch: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      layout: {
        lg: { x: widget.layout.x, y: widget.layout.y, w: widget.layout.w, h: widget.layout.h },
        md: { x: widget.layout.x, y: widget.layout.y, w: widget.layout.w, h: widget.layout.h },
        sm: { x: widget.layout.x, y: widget.layout.y, w: widget.layout.w, h: widget.layout.h },
        xs: { x: widget.layout.x, y: widget.layout.y, w: widget.layout.w, h: widget.layout.h },
      },
      sizeClass: 'chart-s', // Default size class
    })), [widgets]);

  return {
    // State
    widgets,
    widgetsWithLayout,
    dashboardName,
    isChatOpen,
    isLoading,
    error,
    dashboardId,
    
    // Handlers
    handleUpdateWidgets,
    handleAddWidget,
    handleToggleChat,
    handleChartCreated,
    setDashboardName,
    setIsLoading,
    setError,
    
    // Refs
    addWidgetRef,
  };
}