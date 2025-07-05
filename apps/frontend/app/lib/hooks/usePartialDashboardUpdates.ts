import { useState, useCallback, useRef } from 'react';
import { Widget } from '@/types/enhanced-dashboard-types';

export interface PartialUpdateOptions {
  maxConcurrentUpdates?: number;
  batchSize?: number;
  updateDelay?: number;
  prioritizeVisible?: boolean;
}

export interface PartialUpdateReturn {
  updateWidgets: (widgets: Widget[], changedWidgetIds: string[]) => Promise<void>;
  isUpdating: boolean;
  updateProgress: number;
  queuedUpdates: number;
  completedUpdates: number;
  failedUpdates: string[];
}

export function usePartialDashboardUpdates(
  onWidgetUpdate: (widget: Widget) => void,
  options: PartialUpdateOptions = {}
): PartialUpdateReturn {
  const {
    maxConcurrentUpdates = 3,
    batchSize = 5,
    updateDelay = 100,
    prioritizeVisible = true
  } = options;

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [queuedUpdates, setQueuedUpdates] = useState(0);
  const [completedUpdates, setCompletedUpdates] = useState(0);
  const [failedUpdates, setFailedUpdates] = useState<string[]>([]);

  const updateQueueRef = useRef<Widget[]>([]);
  const activeUpdatesRef = useRef(new Set<string>());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if widget is visible in viewport
  const isWidgetVisible = useCallback((widgetId: string): boolean => {
    if (!prioritizeVisible) return true;
    
    const element = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }, [prioritizeVisible]);

  // Prioritize widgets by visibility and type
  const prioritizeWidgets = useCallback((widgets: Widget[]): Widget[] => {
    return widgets.sort((a, b) => {
      const aVisible = isWidgetVisible(a.id);
      const bVisible = isWidgetVisible(b.id);
      
      // Visible widgets first
      if (aVisible && !bVisible) return -1;
      if (!aVisible && bVisible) return 1;
      
      // Then by importance: KPI > Chart > Text > Table
      const typeOrder = { kpi: 0, chart: 1, text: 2, table: 3 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] ?? 4;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] ?? 4;
      
      return aOrder - bOrder;
    });
  }, [isWidgetVisible]);

  // Process single widget update
  const processWidgetUpdate = useCallback(async (widget: Widget): Promise<boolean> => {
    try {
      // Simulate processing delay for demonstration
      await new Promise(resolve => setTimeout(resolve, updateDelay));
      
      // Check if update was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return false;
      }
      
      // Perform the actual update
      onWidgetUpdate(widget);
      
      return true;
    } catch (error) {
      console.error(`Failed to update widget ${widget.id}:`, error);
      return false;
    }
  }, [onWidgetUpdate, updateDelay]);

  // Process updates in batches
  const processBatch = useCallback(async (widgets: Widget[]): Promise<void> => {
    const batch = widgets.splice(0, Math.min(batchSize, maxConcurrentUpdates));
    if (batch.length === 0) return;

    // Track active updates
    batch.forEach(widget => activeUpdatesRef.current.add(widget.id));

    // Process batch concurrently
    const updatePromises = batch.map(async (widget) => {
      const success = await processWidgetUpdate(widget);
      
      // Update counters
      if (success) {
        setCompletedUpdates(prev => prev + 1);
      } else {
        setFailedUpdates(prev => [...prev, widget.id]);
      }
      
      // Remove from active updates
      activeUpdatesRef.current.delete(widget.id);
      
      return success;
    });

    await Promise.allSettled(updatePromises);

    // Update progress
    const totalWidgets = queuedUpdates;
    const processedWidgets = completedUpdates + failedUpdates.length;
    setUpdateProgress(totalWidgets > 0 ? (processedWidgets / totalWidgets) * 100 : 0);

    // Continue with remaining widgets
    if (widgets.length > 0 && !abortControllerRef.current?.signal.aborted) {
      // Add small delay between batches to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 50));
      await processBatch(widgets);
    }
  }, [
    batchSize,
    maxConcurrentUpdates,
    processWidgetUpdate,
    queuedUpdates,
    completedUpdates,
    failedUpdates.length
  ]);

  // Main update function
  const updateWidgets = useCallback(async (
    allWidgets: Widget[],
    changedWidgetIds: string[]
  ): Promise<void> => {
    // Abort any ongoing updates
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Filter widgets that need updating
    const widgetsToUpdate = allWidgets.filter(widget => 
      changedWidgetIds.includes(widget.id)
    );
    
    if (widgetsToUpdate.length === 0) {
      return;
    }

    console.log(`Starting partial update for ${widgetsToUpdate.length} widgets`);
    
    // Reset state
    setIsUpdating(true);
    setUpdateProgress(0);
    setQueuedUpdates(widgetsToUpdate.length);
    setCompletedUpdates(0);
    setFailedUpdates([]);
    
    try {
      // Prioritize widgets
      const prioritizedWidgets = prioritizeWidgets([...widgetsToUpdate]);
      updateQueueRef.current = prioritizedWidgets;
      
      // Process in batches
      await processBatch([...prioritizedWidgets]);
      
      console.log(`Partial update completed: ${completedUpdates} successful, ${failedUpdates.length} failed`);
      
    } catch (error) {
      console.error('Error during partial update:', error);
    } finally {
      setIsUpdating(false);
      setUpdateProgress(100);
      
      // Clean up
      activeUpdatesRef.current.clear();
      updateQueueRef.current = [];
    }
  }, [prioritizeWidgets, processBatch, completedUpdates, failedUpdates.length]);

  return {
    updateWidgets,
    isUpdating,
    updateProgress,
    queuedUpdates,
    completedUpdates,
    failedUpdates
  };
}