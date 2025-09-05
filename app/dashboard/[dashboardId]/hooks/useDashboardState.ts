"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Widget } from "@/types/enhanced-dashboard-types";
import type { ChartSpec } from "@/types/chart-types";
import toast from 'react-hot-toast';
import { useSession } from "@/lib/auth-client";
import { WidgetPersistence, SaveStatus } from "@/lib/WidgetPersistence";

export function useDashboardState(dashboardId: string) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dashboardName, setDashboardName] = useState("My Dashboard");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSilentRefresh, setIsSilentRefresh] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);

  // Reference to the grid component's add widget function
  const addWidgetRef = useRef<((type: string) => void) | null>(null);
  
  // Widget persistence manager
  const widgetPersistenceRef = useRef<WidgetPersistence | null>(null);

  // Initialize widget persistence and dashboard data
  useEffect(() => {
    if (!userId) return;
    
    console.log(`[useDashboardState] Initializing widget persistence for dashboard ${dashboardId}`);
    
    const persistenceManager = new WidgetPersistence({
      dashboardId: dashboardId,
      userId: userId,
      onStatusChange: setSaveStatus,
      onError: (error) => {
        console.error('[useDashboardState] Widget persistence error:', error);
        toast.error('Failed to save widget changes');
      },
    });

    widgetPersistenceRef.current = persistenceManager;
    
    // Load dashboard data and widgets concurrently
    Promise.all([
      // Load dashboard information (including is_public status)
      fetch(`/api/dashboards/${dashboardId}`)
        .then(res => res.ok ? res.json() : null)
        .then(dashboard => {
          if (dashboard) {
            console.log(`[useDashboardState] Loaded dashboard info:`, { 
              id: dashboard.id, 
              name: dashboard.name, 
              isPublic: dashboard.isPublic 
            });
            setDashboardName(dashboard.name || "My Dashboard");
            setIsPublished(dashboard.isPublic || false);
          }
        })
        .catch(err => console.warn('[useDashboardState] Failed to load dashboard info:', err)),
      
      // Load widgets
      persistenceManager.loadWidgets().then((loadedWidgets) => {
        console.log(`[useDashboardState] Loaded ${loadedWidgets.length} widgets on initialization`);
        setWidgets(loadedWidgets);
        return loadedWidgets;
      })
    ]).finally(() => {
      setIsLoading(false);
    });

    return () => {
      console.log(`[useDashboardState] Cleaning up widget persistence`);
      persistenceManager.cleanup();
      widgetPersistenceRef.current = null;
    };
  }, [dashboardId, userId]);

  // Load widgets from database with cache busting
  const loadWidgets = useCallback(async (options: { bustCache?: boolean; retryCount?: number; silent?: boolean } = {}) => {
    if (!widgetPersistenceRef.current) return;
    
    const { bustCache = false, retryCount = 0, silent = false } = options;
    
    // Only show loading state if this isn't a silent refresh
    if (!silent) {
      setIsLoading(true);
      setIsSilentRefresh(false);
    } else {
      setIsSilentRefresh(true);
    }
    setError(null);
    
    try {
      // If cache busting is requested, add cache-busting parameter
      let loadedWidgets;
      if (bustCache) {
        console.log(`[useDashboardState] Loading widgets with cache bust (attempt ${retryCount + 1})`);
        loadedWidgets = await widgetPersistenceRef.current.loadWidgets(true);
      } else {
        loadedWidgets = await widgetPersistenceRef.current.loadWidgets();
      }
      
      console.log(`[useDashboardState] Loaded ${loadedWidgets.length} widgets`);
      setWidgets(loadedWidgets);
      
      // Show success toast based on context
      if (loadedWidgets.length > 0) {
        if (bustCache && silent) {
          // Silent refresh with cache bust - show dashboard updated message
          toast.success('Dashboard updated! 🎉', {
            duration: 2000,
            position: 'top-right',
          });
        } else if (!bustCache) {
          // Regular load - show loaded message
          toast.success(`Loaded ${loadedWidgets.length} widget${loadedWidgets.length === 1 ? '' : 's'}`, {
            duration: 2000,
            position: 'top-right',
          });
        }
      }
      
      // Reduced retry count from 2 to 0 to minimize Redis requests
      // If we got empty results and this is a cache-busted call, retry once with longer delay
      if (bustCache && loadedWidgets.length === 0 && retryCount < 1) {
        console.log(`[useDashboardState] Got empty results, retrying in ${(retryCount + 1) * 2000}ms...`);
        setTimeout(() => {
          loadWidgets({ bustCache: true, retryCount: retryCount + 1, silent });
        }, (retryCount + 1) * 2000); // Increased delay to reduce request frequency
        return;
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load widgets';
      setError(errorMessage);
      if (!bustCache) { // Only show error toast for user-initiated loads
        toast.error(errorMessage, {
          duration: 4000,
          position: 'top-right',
        });
      }
      console.error('Error loading widgets:', err);
    } finally {
      // Only clear loading state if this wasn't a silent refresh
      if (!silent) {
        setIsLoading(false);
      } else {
        setIsSilentRefresh(false);
      }
    }
  }, []);

  // Save widgets to database (for manual save/publish)
  const saveWidgets = useCallback(async () => {
    // With auto-save, manual save is no longer needed
    // Just mark as published
    setIsPublished(true);
    return true;
  }, []);

  const handleUpdateWidgets = useCallback((newWidgets: Widget[]) => {
    const oldWidgets = widgets;
    
    // Early return if widgets are identical (prevents unnecessary persistence calls)
    if (oldWidgets.length === newWidgets.length && 
        oldWidgets.every(oldWidget => {
          const newWidget = newWidgets.find(w => w.id === oldWidget.id);
          return newWidget && JSON.stringify(oldWidget) === JSON.stringify(newWidget);
        })) {
      // No actual changes detected, skip processing
      return;
    }
    
    console.log(`[useDashboardState] handleUpdateWidgets called:`, {
      oldCount: oldWidgets.length,
      newCount: newWidgets.length,
      oldIds: oldWidgets.map(w => ({ id: w.id, type: w.type })),
      newIds: newWidgets.map(w => ({ id: w.id, type: w.type })),
      timestamp: new Date().toISOString()
    });
    
    setWidgets(newWidgets);
    // Note: Keep existing published status - changes don't unpublish automatically

    if (!widgetPersistenceRef.current) {
      console.log(`[useDashboardState] No widget persistence manager available`);
      return;
    }

    // Determine what changed
    const deletedWidgets = oldWidgets.filter(
      oldWidget => !newWidgets.find(newWidget => newWidget.id === oldWidget.id)
    );
    const addedWidgets = newWidgets.filter(
      newWidget => !oldWidgets.find(oldWidget => oldWidget.id === newWidget.id)
    );
    const updatedWidgets = newWidgets.filter(
      newWidget => {
        const oldWidget = oldWidgets.find(w => w.id === newWidget.id);
        return oldWidget && JSON.stringify(oldWidget) !== JSON.stringify(newWidget);
      }
    );

    // Skip persistence if no actual changes
    if (deletedWidgets.length === 0 && addedWidgets.length === 0 && updatedWidgets.length === 0) {
      return;
    }

    console.log(`[useDashboardState] Widget changes breakdown:`, {
      deleted: deletedWidgets.map(w => ({ id: w.id, type: w.type })),
      added: addedWidgets.map(w => ({ id: w.id, type: w.type })),
      updated: updatedWidgets.map(w => ({ id: w.id, type: w.type }))
    });

    // Persist changes
    deletedWidgets.forEach(widget => {
      console.log(`[useDashboardState] Deleting widget via persistence:`, { id: widget.id, type: widget.type });
      widgetPersistenceRef.current?.deleteWidget(widget.id);
    });
    
    addedWidgets.forEach(widget => {
      console.log(`[useDashboardState] Creating widget via persistence:`, { id: widget.id, type: widget.type });
      widgetPersistenceRef.current?.createWidget(widget);
    });
    
    updatedWidgets.forEach(widget => {
      console.log(`[useDashboardState] Updating widget via persistence:`, { id: widget.id, type: widget.type });
      widgetPersistenceRef.current?.updateWidget(widget);
    });
  }, [widgets]);

  const handleAddWidget = useCallback((type: string) => {
    if (addWidgetRef.current) {
      addWidgetRef.current(type);
      // Note: Keep existing published status - new widgets don't unpublish automatically
      
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

  const publishDashboard = useCallback(async () => {
    setIsPublishLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to publish dashboard');
      }

      const result = await response.json();
      setIsPublished(result.isPublic);
      
      return result;
    } catch (error) {
      console.error('Error publishing dashboard:', error);
      throw error;
    } finally {
      setIsPublishLoading(false);
    }
  }, [dashboardId]);

  const unpublishDashboard = useCallback(async () => {
    setIsPublishLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}/publish`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unpublish dashboard');
      }

      const result = await response.json();
      setIsPublished(result.isPublic);
      
      return result;
    } catch (error) {
      console.error('Error unpublishing dashboard:', error);
      throw error;
    } finally {
      setIsPublishLoading(false);
    }
  }, [dashboardId]);

  return {
    // State
    widgets,
    dashboardName,
    isChatOpen,
    isLoading: isLoading && !isSilentRefresh,
    isSaving: saveStatus === 'saving',
    saveStatus,
    error,
    dashboardId,
    isPublished,
    isPublishLoading,
    
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
    
    // Publishing
    publishDashboard,
    unpublishDashboard,
    
    // Refs
    addWidgetRef,
  };
}