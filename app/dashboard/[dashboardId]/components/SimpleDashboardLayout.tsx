"use client";

import React, { useState, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

// Import @hello-pangea/dnd components
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

import { Widget } from "@/types/enhanced-dashboard-types";
import { DashboardWidth } from "@/components/dashboard/DashboardSettings";
import { TextBlock } from "./widgets/TextBlock";
import { ChartWidget } from "./widgets/ChartWidget";
import { KPICard } from "./widgets/KPICard";
import { TableWidget } from "./widgets/TableWidget";
import { IconTrash, IconGripVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface SimpleDashboardLayoutProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
  onAddWidget?: (addWidgetFn: (type: string, insertIndex?: number) => void) => void;
  isLoading?: boolean;
  width?: DashboardWidth;
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

// Memoized widget list for performance optimization
const WidgetList = React.memo(function WidgetList({ 
  widgets, 
  hoveredWidget, 
  setHoveredWidget, 
  handleDeleteWidget, 
  renderWidget 
}: { 
  widgets: Widget[]; 
  hoveredWidget: string | null; 
  setHoveredWidget: (id: string | null) => void; 
  handleDeleteWidget: (id: string) => void; 
  renderWidget: (widget: Widget) => React.ReactNode; 
}) {
  return (
    <>
      {widgets.map((widget, index) => (
        <Draggable
          key={widget.id}
          draggableId={widget.id}
          index={index}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`relative mb-4 group cursor-move ${
                snapshot.isDragging ? 'z-50' : ''
              }`}
              style={provided.draggableProps.style}
            >
              {/* Extended hover area that includes controls */}
              <div 
                className="absolute -left-14 top-0 w-14 h-full z-30"
                onMouseEnter={() => setHoveredWidget(widget.id)}
                onMouseLeave={() => setHoveredWidget(null)}
              />
              
              {/* Widget Content */}
              <div 
                className={`rounded-lg overflow-hidden transition-all duration-200 ${
                  widget.type === 'text' 
                    ? '' // No border or shadow for text blocks
                    : `border shadow-sm ${
                        snapshot.isDragging 
                          ? 'rotate-1 shadow-xl ring-2 ring-blue-500/50' 
                          : snapshot.isDropAnimating 
                            ? 'shadow-lg' 
                            : 'hover:shadow-md'
                      }`
                }`}
                onMouseEnter={() => setHoveredWidget(widget.id)}
                onMouseLeave={() => setHoveredWidget(null)}
              >
                {renderWidget(widget)}
              </div>

              {/* Left side controls - only show on hover */}
              {(hoveredWidget === widget.id && !snapshot.isDragging) && (
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-40 flex flex-col gap-2 pointer-events-auto"
                  onMouseEnter={() => setHoveredWidget(widget.id)}
                  onMouseLeave={() => setHoveredWidget(null)}
                >
                  {/* Visual drag handle indicator */}
                  <div
                    className="w-10 h-10 bg-background border border-primary/20 hover:bg-secondary text-primary rounded-lg flex items-center justify-center shadow-lg transition-colors cursor-move touch-manipulation"
                    title="Drag to reorder"
                  >
                    <IconGripVertical className="w-5 h-5 text-primary/70" />
                  </div>
                  
                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWidget(widget.id);
                    }}
                    className="w-10 h-10 p-0 shadow-lg"
                    title="Delete widget"
                  >
                    <IconTrash className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </Draggable>
      ))}
    </>
  );
});

export function SimpleDashboardLayout({ 
  widgets, 
  onUpdateWidgets,
  onAddWidget,
  isLoading = false,
  width = 'full',
}: SimpleDashboardLayoutProps) {
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingWidgets, setEditingWidgets] = useState<Set<string>>(new Set());

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

  const handleDragStart = useCallback((start: any) => {
    console.log('=== DRAG START ===');
    console.log('Drag started with:', start);
    console.log('Dragging widget:', start.draggableId);
    console.log('From index:', start.source.index);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    console.log('=== DRAG END ===');
    console.log('Full result:', result);
    console.log('Source:', result.source);
    console.log('Destination:', result.destination);
    console.log('DraggableId:', result.draggableId);
    console.log('Current widgets:', sortedWidgets.map(w => ({ id: w.id, order: w.order })));
    
    setIsDragging(false);
    
    const { destination, source, draggableId } = result;

    // If dropped outside the list or in the same place, do nothing  
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      console.log('No valid destination or same position');
      return;
    }

    console.log('Moving from index', source.index, 'to', destination.index);

    // Reorder widgets based on drag result
    const reorderedWidgets = [...sortedWidgets];
    const [movedWidget] = reorderedWidgets.splice(source.index, 1);
    reorderedWidgets.splice(destination.index, 0, movedWidget);

    console.log('Reordered widgets:', reorderedWidgets.map(w => ({ id: w.id, order: w.order })));

    // Update the order property for all widgets to match new positions
    const updatedWidgets = reorderedWidgets.map((widget, index) => ({
      ...widget,
      order: index,
      // Update layout.y for backward compatibility
      layout: widget.layout ? { ...widget.layout, y: index } : undefined
    }));

    console.log('Updated widgets:', updatedWidgets.map(w => ({ id: w.id, order: w.order })));
    console.log('Calling onUpdateWidgets with:', updatedWidgets);
    onUpdateWidgets(updatedWidgets);
  }, [sortedWidgets, onUpdateWidgets]);

  const handleUpdateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
    // Prevent state updates during drag operations
    if (isDragging) {
      console.log('Ignoring widget update during drag operation');
      return;
    }
    
    onUpdateWidgets(widgets.map(widget =>
      widget.id === widgetId ? { ...widget, ...updates } : widget
    ));
  }, [widgets, onUpdateWidgets, isDragging]);

  const handleEditToggle = useCallback((widgetId: string) => {
    setEditingWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  }, []);

  const renderWidget = useCallback((widget: Widget) => {
    const isEditing = editingWidgets.has(widget.id);
    const props = {
      widget,
      onUpdate: handleUpdateWidget,
      isEditing: widget.type === 'text' ? true : false, // TextBlock always editable, others not in editing mode by default
      onEditToggle: () => handleEditToggle(widget.id),
    };

    if (widget.type === "text") {
      return <TextBlock {...props} />;
    } else {
      // Treat all non-text widgets as charts
      return <ChartWidget {...props} />;
    }
  }, [handleUpdateWidget, editingWidgets, handleEditToggle]);

  // Expose handleAddWidget to parent component
  React.useEffect(() => {
    if (onAddWidget) {
      onAddWidget(handleAddWidget);
    }
  }, [onAddWidget, handleAddWidget]);

  // Get container styles based on width setting
  const containerStyles = width === 'constrained' 
    ? "w-full max-w-4xl mx-auto px-8 pt-8 pb-4 transition-all duration-300 ease-out min-h-screen"
    : "w-full px-12 pt-8 pb-4 transition-all duration-300 ease-out min-h-screen";

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={containerStyles}>
        {widgets.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-96">
            <div className="w-full max-w-2xl mx-auto">
              <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center bg-muted/10">
                <div className="text-4xl mb-4 text-muted-foreground">📊</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No widgets inside
                </h3>
                <p className="text-muted-foreground text-sm mb-8">
                  Use the floating dock below to add widgets to your dashboard.
                  Widgets will automatically stack vertically and expand as needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {widgets.length > 0 && (
          <Droppable droppableId="dashboard-widgets">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col min-h-24"
              >
                <WidgetList
                  widgets={sortedWidgets}
                  hoveredWidget={hoveredWidget}
                  setHoveredWidget={setHoveredWidget}
                  handleDeleteWidget={handleDeleteWidget}
                  renderWidget={renderWidget}
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}