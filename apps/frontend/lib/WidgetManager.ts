"use client";

import { nanoid } from "nanoid";
import { 
  WidgetWithLayout, 
  CreateWidgetParams, 
  SyncOperation, 
  ResponsiveLayouts,
  WidgetType,
  ChartSubtype,
  SizeClass,
  getDefaultSizeClass,
  generateResponsiveLayout,
  findAvailablePosition,
  RESPONSIVE_BREAKPOINTS
} from "@/types/dashboard-types";
import { Widget, Dashboard } from "@/db/schema";

// Optimistic UI updates with background sync
export class WidgetManager {
  private syncQueue: SyncOperation[] = [];
  private isOnline = true;
  private dashboardId: string;
  private userId: string;
  private updateCallback: (widgets: WidgetWithLayout[]) => void;
  private widgets: WidgetWithLayout[] = [];

  constructor(
    dashboardId: string, 
    userId: string, 
    updateCallback: (widgets: WidgetWithLayout[]) => void
  ) {
    this.dashboardId = dashboardId;
    this.userId = userId;
    this.updateCallback = updateCallback;
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushSyncQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  setWidgets(widgets: WidgetWithLayout[]) {
    this.widgets = widgets;
  }

  async createWidget(params: CreateWidgetParams): Promise<WidgetWithLayout> {
    const {
      type,
      subtype,
      sizeClass: customSizeClass,
      position,
      config = {}
    } = params;

    // 1. Generate optimistic widget ID
    const tempId = `temp_${nanoid()}`;
    const sizeClass = customSizeClass || getDefaultSizeClass(type, subtype);
    
    // 2. Find available position
    const finalPosition = position || findAvailablePosition(this.widgets, sizeClass);
    
    // 3. Create optimistic widget state
    const optimisticWidget: WidgetWithLayout = {
      id: tempId,
      userId: this.userId,
      chatId: null,
      type,
      subtype: subtype || null,
      title: null,
      chartSpecs: null,
      sql: null,
      data: null,
      config: this.getDefaultConfigForType(type, config),
      isConfigured: type === 'text', // Text widgets are configured by default
      cacheKey: null,
      lastDataFetch: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      layout: generateResponsiveLayout(finalPosition, sizeClass),
      sizeClass,
    };
    
    // 4. Immediately update UI
    const updatedWidgets = [...this.widgets, optimisticWidget];
    this.widgets = updatedWidgets;
    this.updateCallback(updatedWidgets);
    
    // 5. Background DB save
    this.queueSyncOperation({
      type: 'create',
      widgetId: tempId,
      data: {
        widget: optimisticWidget,
        dashboardId: this.dashboardId,
      },
      timestamp: Date.now(),
    });
    
    return optimisticWidget;
  }
  
  async duplicateWidget(widgetId: string): Promise<WidgetWithLayout> {
    const originalWidget = this.widgets.find(w => w.id === widgetId);
    if (!originalWidget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    const newWidget: CreateWidgetParams = {
      type: originalWidget.type as WidgetType,
      subtype: (originalWidget.subtype as ChartSubtype) || undefined,
      sizeClass: originalWidget.sizeClass as SizeClass,
      config: originalWidget.config ? { ...originalWidget.config } : {},
    };
    
    return this.createWidget(newWidget);
  }

  async updateWidget(widgetId: string, updates: Partial<WidgetWithLayout>): Promise<void> {
    // Update local state immediately
    const updatedWidgets = this.widgets.map(widget => {
      if (widget.id === widgetId) {
        return { ...widget, ...updates, updatedAt: new Date() };
      }
      return widget;
    });
    
    this.widgets = updatedWidgets;
    this.updateCallback(updatedWidgets);
    
    // Queue background sync
    this.queueSyncOperation({
      type: 'update',
      widgetId,
      data: updates,
      timestamp: Date.now(),
    });
  }

  async deleteWidget(widgetId: string): Promise<void> {
    // Remove from local state immediately
    const updatedWidgets = this.widgets.filter(widget => widget.id !== widgetId);
    this.widgets = updatedWidgets;
    this.updateCallback(updatedWidgets);
    
    // Queue background sync
    this.queueSyncOperation({
      type: 'delete',
      widgetId,
      timestamp: Date.now(),
    });
  }

  async updateWidgetLayout(widgetId: string, layout: ResponsiveLayouts, sizeClass?: SizeClass): Promise<void> {
    const updates: Partial<WidgetWithLayout> = { layout };
    if (sizeClass) {
      updates.sizeClass = sizeClass;
    }
    
    await this.updateWidget(widgetId, updates);
  }

  async repositionWidgets(layoutChanges: Array<{ widgetId: string; layout: ResponsiveLayouts }>): Promise<void> {
    // Batch update all widgets
    const updatedWidgets = this.widgets.map(widget => {
      const change = layoutChanges.find(c => c.widgetId === widget.id);
      if (change) {
        return { ...widget, layout: change.layout, updatedAt: new Date() };
      }
      return widget;
    });
    
    this.widgets = updatedWidgets;
    this.updateCallback(updatedWidgets);
    
    // Queue background sync for each change
    layoutChanges.forEach(change => {
      this.queueSyncOperation({
        type: 'reposition',
        widgetId: change.widgetId,
        layout: change.layout,
        timestamp: Date.now(),
      });
    });
  }

  private getDefaultConfigForType(type: WidgetType, customConfig: Record<string, any> = {}): Record<string, any> {
    const defaults = {
      text: {
        content: "",
        fontSize: "medium",
        alignment: "left",
      },
      chart: {
        chartType: "bar",
        title: "New Chart",
        description: "Click to configure your chart",
      },
      kpi: {
        title: "KPI Metric",
        value: 0,
        change: 0,
        changeDirection: "flat",
      },
      table: {
        title: "Data Table",
        showHeader: true,
        sortable: true,
        filterable: true,
      },
    };

    return { ...defaults[type], ...customConfig };
  }

  private queueSyncOperation(operation: SyncOperation): void {
    if (this.isOnline) {
      this.executeSyncOperation(operation);
    } else {
      this.syncQueue.push(operation);
    }
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    try {
      switch (operation.type) {
        case 'create':
          await this.apiCreateWidget(operation);
          break;
        case 'update':
          await this.apiUpdateWidget(operation);
          break;
        case 'delete':
          await this.apiDeleteWidget(operation);
          break;
        case 'reposition':
          await this.apiUpdateWidgetLayout(operation);
          break;
      }
    } catch (error) {
      console.error('Sync operation failed:', error);
      // If network error, queue for retry
      if (error instanceof Error && error.name === 'NetworkError') {
        this.syncQueue.push(operation);
        this.isOnline = false;
      } else {
        // For other errors, handle appropriately
        throw error;
      }
    }
  }

  private async apiCreateWidget(operation: SyncOperation): Promise<void> {
    const { widget, dashboardId } = operation.data;
    
    // Call your API to create the widget and dashboard-widget relationship
    const response = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widget: {
          ...widget,
          id: undefined, // Let backend generate real ID
        },
        dashboardId,
        layout: widget.layout,
        sizeClass: widget.sizeClass,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create widget: ${response.statusText}`);
    }

    const { widget: realWidget } = await response.json();
    
    // Replace temp widget with real widget
    this.replaceTempWidget(operation.widgetId, realWidget);
  }

  private async apiUpdateWidget(operation: SyncOperation): Promise<void> {
    const response = await fetch(`/api/widgets/${operation.widgetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update widget: ${response.statusText}`);
    }
  }

  private async apiDeleteWidget(operation: SyncOperation): Promise<void> {
    const response = await fetch(`/api/widgets/${operation.widgetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete widget: ${response.statusText}`);
    }
  }

  private async apiUpdateWidgetLayout(operation: SyncOperation): Promise<void> {
    const response = await fetch(`/api/widgets/${operation.widgetId}/layout`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        layout: operation.layout,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update widget layout: ${response.statusText}`);
    }
  }

  private replaceTempWidget(tempId: string, realWidget: WidgetWithLayout): void {
    const updatedWidgets = this.widgets.map(widget => {
      if (widget.id === tempId) {
        return { ...realWidget, layout: widget.layout, sizeClass: widget.sizeClass };
      }
      return widget;
    });
    
    this.widgets = updatedWidgets;
    this.updateCallback(updatedWidgets);
  }

  private async flushSyncQueue(): Promise<void> {
    const operations = [...this.syncQueue];
    this.syncQueue = [];
    
    for (const operation of operations) {
      try {
        await this.executeSyncOperation(operation);
      } catch (error) {
        console.error('Failed to sync operation during flush:', error);
        // Re-queue failed operations
        this.syncQueue.push(operation);
      }
    }
  }

  // Error recovery methods
  async refreshFromServer(): Promise<WidgetWithLayout[]> {
    try {
      const response = await fetch(`/api/dashboards/${this.dashboardId}/widgets`);
      if (!response.ok) {
        throw new Error(`Failed to fetch widgets: ${response.statusText}`);
      }
      
      const widgets = await response.json();
      this.widgets = widgets;
      this.updateCallback(widgets);
      return widgets;
    } catch (error) {
      console.error('Failed to refresh widgets from server:', error);
      throw error;
    }
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  isOffline(): boolean {
    return !this.isOnline;
  }
}