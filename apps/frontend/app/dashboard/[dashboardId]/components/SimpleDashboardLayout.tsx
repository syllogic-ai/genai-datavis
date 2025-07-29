"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { v4 as uuidv4 } from "uuid";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { Widget } from "@/types/enhanced-dashboard-types";
import { SortableWidgetWrapper } from "./SortableWidgetWrapper";
import { TextBlock } from "./widgets/TextBlock";
import { ChartWidget } from "./widgets/ChartWidget";
import { KPICard } from "./widgets/KPICard";
import { TableWidget } from "./widgets/TableWidget";

interface SimpleDashboardLayoutProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
  onAddWidget?: (addWidgetFn: (type: string, insertIndex?: number) => void) => void;
  isLoading?: boolean;
}

const defaultConfigs = {
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

export function SimpleDashboardLayout({ 
  widgets, 
  onUpdateWidgets,
  onAddWidget,
  isLoading = false,
}: SimpleDashboardLayoutProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeWidget, setActiveWidget] = useState<Widget | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort widgets by order for consistent rendering (with backward compatibility)
  const sortedWidgets = useMemo(() => {
    return [...widgets].sort((a, b) => {
      // Priority: order field > layout.y > fallback to 0
      const getOrder = (widget: Widget) => {
        if (typeof widget.order === 'number') return widget.order;
        if (widget.layout?.y !== undefined) return widget.layout.y;
        return 0;
      };
      
      const aOrder = getOrder(a);
      const bOrder = getOrder(b);
      return aOrder - bOrder;
    });
  }, [widgets]);

  // Helper function to get widget order consistently
  const getWidgetOrder = useCallback((widget: Widget) => {
    if (typeof widget.order === 'number') return widget.order;
    if (widget.layout?.y !== undefined) return widget.layout.y;
    return 0;
  }, []);

  const handleAddWidget = useCallback((type: string, insertIndex?: number) => {
    console.log(`[SimpleDashboardLayout] handleAddWidget called:`, {
      type,
      insertIndex,
      currentWidgetCount: widgets.length,
      timestamp: new Date().toISOString()
    });
    
    // Validate the widget type
    const validTypes = ['text', 'chart', 'kpi', 'table'] as const;
    if (!validTypes.includes(type as any)) {
      console.error(`[SimpleDashboardLayout] Invalid widget type: ${type}`);
      return;
    }

    const config = defaultConfigs[type as keyof typeof defaultConfigs];
    
    if (!config) {
      console.error(`[SimpleDashboardLayout] Missing configuration for widget type: ${type}`);
      return;
    }
    
    const widgetId = uuidv4();
    
    // Determine the order for the new widget
    let newOrder: number;
    if (insertIndex !== undefined && insertIndex >= 0) {
      // Insert at specific position - shift subsequent widgets
      newOrder = insertIndex;
      // Update orders of existing widgets that come after the insertion point
      const updatedWidgets = widgets.map(widget => {
        const currentOrder = getWidgetOrder(widget);
        return currentOrder >= insertIndex 
          ? { ...widget, order: currentOrder + 1 }
          : widget;
      });
      onUpdateWidgets(updatedWidgets);
    } else {
      // Add at the end - get max order from all widgets
      const maxOrder = widgets.length > 0 
        ? Math.max(...widgets.map(w => getWidgetOrder(w))) 
        : -1;
      newOrder = maxOrder + 1;
    }

    console.log(`[SimpleDashboardLayout] Creating widget:`, {
      type,
      widgetId,
      newOrder,
      config
    });

    const newWidget: Widget = {
      id: widgetId,
      type: type as Widget['type'],
      order: newOrder,
      // Keep layout for backward compatibility (using order as y position)
      layout: {
        i: widgetId,
        x: 0,
        y: newOrder,
        w: 12,
        h: 1,
        isResizable: false,
      },
      config,
      data: null,
    };

    console.log(`[SimpleDashboardLayout] New widget created:`, newWidget);
    
    // Add the new widget
    setTimeout(() => {
      onUpdateWidgets([...widgets, newWidget]);
    }, 0);
  }, [widgets, onUpdateWidgets, getWidgetOrder]);

  const handleDeleteWidget = useCallback((id: string) => {
    const deletedWidget = widgets.find(w => w.id === id);
    if (!deletedWidget) return;
    
    const deletedOrder = getWidgetOrder(deletedWidget);
    
    // Remove the widget and reorder remaining widgets
    const remainingWidgets = widgets
      .filter(widget => widget.id !== id)
      .map(widget => {
        const currentOrder = getWidgetOrder(widget);
        return currentOrder > deletedOrder 
          ? { ...widget, order: currentOrder - 1 }
          : widget;
      });
    
    onUpdateWidgets(remainingWidgets);
  }, [widgets, onUpdateWidgets, getWidgetOrder]);

  const handleDragStart = useCallback((event: any) => {
    const activeWidget = sortedWidgets.find(widget => widget.id === event.active.id);
    setActiveWidget(activeWidget || null);
    setIsDragging(true);
  }, [sortedWidgets]);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveWidget(null);

    if (active.id !== over?.id) {
      const oldIndex = sortedWidgets.findIndex((widget) => widget.id === active.id);
      const newIndex = sortedWidgets.findIndex((widget) => widget.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedWidgets = arrayMove(sortedWidgets, oldIndex, newIndex);
        
        // Update the order property for all widgets
        const updatedWidgets = reorderedWidgets.map((widget, index) => ({
          ...widget,
          order: index,
        }));

        onUpdateWidgets(updatedWidgets);
      }
    }
  }, [sortedWidgets, onUpdateWidgets]);

  const handleUpdateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
    onUpdateWidgets(widgets.map(widget =>
      widget.id === widgetId ? { ...widget, ...updates } : widget
    ));
  }, [widgets, onUpdateWidgets]);

  const renderWidget = useCallback((widget: Widget) => {
    const props = {
      widget,
      onUpdate: handleUpdateWidget,
      isEditing: false,
      onEditToggle: () => {},
    };

    switch (widget.type) {
      case "text":
        return <TextBlock {...props} />;
      case "chart":
        return <ChartWidget {...props} />;
      case "kpi":
        return <KPICard {...props} />;
      case "table":
        return <TableWidget {...props} />;
      default:
        return <div>Unknown widget type</div>;
    }
  }, [handleUpdateWidget]);

  // Expose handleAddWidget to parent component
  React.useEffect(() => {
    if (onAddWidget) {
      onAddWidget(handleAddWidget);
    }
  }, [onAddWidget, handleAddWidget]);

  return (
    <div className="w-full p-4 pl-12 transition-all duration-300 ease-out min-h-screen">
      {widgets.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center h-96"
        >
          <div className="w-full max-w-2xl mx-auto">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center bg-gray-50/50 dark:bg-gray-800/50">
              <div className="text-4xl mb-4 text-gray-400">📊</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No widgets inside
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                Use the floating dock below to add widgets to your dashboard.
                Widgets will automatically stack vertically and expand as needed.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {widgets.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext 
            items={sortedWidgets.map(w => w.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {sortedWidgets.map((widget) => (
                  <SortableWidgetWrapper
                    key={widget.id}
                    id={widget.id}
                    widgetType={widget.type}
                    onDelete={handleDeleteWidget}
                    isDragging={isDragging}
                  >
                    {renderWidget(widget)}
                  </SortableWidgetWrapper>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
          <DragOverlay adjustScale={false}>
            {activeWidget ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl opacity-90 border border-gray-200 dark:border-gray-700">
                {renderWidget(activeWidget)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}