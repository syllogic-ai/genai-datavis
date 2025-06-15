"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Widget } from "@/types/enhanced-dashboard-types";
import type { ChartSpec } from "@/types/chart-types";
import toast from 'react-hot-toast';

export function useDashboardState(dashboardId: string) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dashboardName, setDashboardName] = useState("My Dashboard");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  // Reference to the grid component's add widget function
  const addWidgetRef = useRef<((type: string) => void) | null>(null);

  // Load widgets from database
  const loadWidgets = useCallback(async () => {
    if (!dashboardId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/widgets`);
      
      if (!response.ok) {
        throw new Error('Failed to load widgets');
      }
      
      const data = await response.json();
      setWidgets(data.widgets || []);
      setIsPublished(data.widgets?.length > 0);
      
      // Show success toast only if widgets were loaded
      if (data.widgets?.length > 0) {
        toast.success(`Loaded ${data.widgets.length} widget${data.widgets.length === 1 ? '' : 's'}`, {
          duration: 2000,
          position: 'top-right',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load widgets';
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-right',
      });
      console.error('Error loading widgets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  // Save widgets to database
  const saveWidgets = useCallback(async () => {
    if (!dashboardId) return;
    
    setIsSaving(true);
    setError(null);
    
    // Show loading toast
    const loadingToast = toast.loading('Publishing dashboard...', {
      position: 'top-right',
    });
    
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ widgets }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save widgets');
      }
      
      setIsPublished(true);
      toast.dismiss(loadingToast); // Dismiss loading toast
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save widgets';
      setError(errorMessage);
      toast.dismiss(loadingToast); // Dismiss loading toast
      console.error('Error saving widgets:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [dashboardId, widgets]);

  // Load widgets on mount
  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const handleUpdateWidgets = useCallback((newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    setIsPublished(false); // Mark as unpublished when changes are made
  }, []);

  const handleAddWidget = useCallback((type: string) => {
    if (addWidgetRef.current) {
      addWidgetRef.current(type);
      setIsPublished(false); // Mark as unpublished when widget is added
      
      // Show a quick toast for widget creation
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added!`, {
        duration: 2000,
        position: 'top-right',
        icon: '✨',
      });
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

  return {
    // State
    widgets,
    dashboardName,
    isChatOpen,
    isLoading,
    isSaving,
    error,
    dashboardId,
    isPublished,
    
    // Handlers
    handleUpdateWidgets,
    handleAddWidget,
    handleToggleChat,
    handleChartCreated,
    setDashboardName,
    setIsLoading,
    setError,
    
    // Persistence
    saveWidgets,
    loadWidgets,
    
    // Refs
    addWidgetRef,
  };
}