"use client";

import { Widget } from '@/types/enhanced-dashboard-types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface WidgetPersistenceOptions {
  dashboardId: string;
  userId: string;
  onStatusChange?: (status: SaveStatus) => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
}

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  });
  
  (debounced as any).cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced as T & { cancel: () => void };
}

export class WidgetPersistence {
  private dashboardId: string;
  private userId: string;
  private onStatusChange?: (status: SaveStatus) => void;
  private onError?: (error: Error) => void;
  private debouncedSave: ReturnType<typeof debounce>;
  private pendingOperations: {
    creates: Map<string, Widget>;
    updates: Map<string, Widget>;
    deletes: Set<string>;
  };
  private lastSaveTimestamp: number = 0;

  constructor({
    dashboardId,
    userId,
    onStatusChange,
    onError,
    debounceMs = 1000,
  }: WidgetPersistenceOptions) {
    this.dashboardId = dashboardId;
    this.userId = userId;
    this.onStatusChange = onStatusChange;
    this.onError = onError;

    this.pendingOperations = {
      creates: new Map(),
      updates: new Map(),
      deletes: new Set(),
    };

    // Create debounced save function
    this.debouncedSave = debounce(this.flushOperations.bind(this), debounceMs);
    
    console.log(`[WidgetPersistence] Initialized for dashboard ${dashboardId} (simplified mode - no real-time updates)`);
  }

  async loadWidgets(bustCache: boolean = false): Promise<Widget[]> {
    try {
      console.log(`[WidgetPersistence] Loading widgets for dashboard ${this.dashboardId}${bustCache ? ' (cache busting)' : ''}`);
      
      // Build URL with cache busting parameter if requested
      let url = `/api/dashboards/${this.dashboardId}/widgets`;
      if (bustCache) {
        url += `?bustCache=true&t=${Date.now()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': bustCache ? 'no-cache, no-store, must-revalidate' : 'max-age=0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load widgets: ${response.statusText}`);
      }

      const { widgets } = await response.json();
      console.log(`[WidgetPersistence] Loaded ${widgets.length} widgets:`, widgets.map((w: Widget) => ({ id: w.id, type: w.type, title: w.config?.title })));
      return widgets;
    } catch (error) {
      console.error('[WidgetPersistence] Error loading widgets:', error);
      this.onError?.(error as Error);
      return [];
    }
  }

  createWidget(widget: Widget): void {
    console.log(`[WidgetPersistence] Queuing widget creation:`, { id: widget.id, type: widget.type });
    
    // Remove from updates/deletes if it exists there
    this.pendingOperations.updates.delete(widget.id);
    this.pendingOperations.deletes.delete(widget.id);
    
    // Add to creates
    this.pendingOperations.creates.set(widget.id, widget);
    
    this.onStatusChange?.('saving');
    this.debouncedSave();
  }

  updateWidget(widget: Widget): void {
    console.log(`[WidgetPersistence] Queuing widget update:`, { id: widget.id, type: widget.type });
    
    // If it's in creates, update the create entry instead
    if (this.pendingOperations.creates.has(widget.id)) {
      this.pendingOperations.creates.set(widget.id, widget);
    } else {
      // Remove from deletes if it exists there
      this.pendingOperations.deletes.delete(widget.id);
      
      // Add to updates
      this.pendingOperations.updates.set(widget.id, widget);
    }
    
    this.onStatusChange?.('saving');
    this.debouncedSave();
  }

  deleteWidget(widgetId: string): void {
    console.log(`[WidgetPersistence] Queuing widget deletion:`, { id: widgetId });
    
    // Remove from creates/updates
    this.pendingOperations.creates.delete(widgetId);
    this.pendingOperations.updates.delete(widgetId);
    
    // Add to deletes
    this.pendingOperations.deletes.add(widgetId);
    
    this.onStatusChange?.('saving');
    this.debouncedSave();
  }

  private async flushOperations(): Promise<void> {
    const ops = this.pendingOperations;
    const creates = Array.from(ops.creates.values());
    const updates = Array.from(ops.updates.values());
    const deletes = Array.from(ops.deletes);

    if (creates.length === 0 && updates.length === 0 && deletes.length === 0) {
      console.log(`[WidgetPersistence] No pending operations to flush`);
      return;
    }

    console.log(`[WidgetPersistence] Flushing operations:`, {
      creates: creates.length,
      updates: updates.length,
      deletes: deletes.length
    });

    // Clear pending operations optimistically
    this.pendingOperations = {
      creates: new Map(),
      updates: new Map(),
      deletes: new Set(),
    };

    try {
      const response = await fetch(`/api/dashboards/${this.dashboardId}/widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creates,
          updates,
          deletes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.statusText}`);
      }

      this.lastSaveTimestamp = Date.now();
      this.onStatusChange?.('saved');
      console.log(`[WidgetPersistence] Successfully saved operations`);
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        this.onStatusChange?.('idle');
      }, 2000);
    } catch (error) {
      console.error('[WidgetPersistence] Error saving widgets:', error);
      this.onError?.(error as Error);
      this.onStatusChange?.('error');

      // Put the operations back in the queue for retry
      creates.forEach(widget => this.pendingOperations.creates.set(widget.id, widget));
      updates.forEach(widget => this.pendingOperations.updates.set(widget.id, widget));
      deletes.forEach(id => this.pendingOperations.deletes.add(id));
    }
  }

  cleanup(): void {
    console.log(`[WidgetPersistence] Cleaning up`);
    this.debouncedSave.cancel();
  }
} 