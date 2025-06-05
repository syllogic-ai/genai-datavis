"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import { motion } from "motion/react";
import { v4 as uuidv4 } from "uuid";

// Import required CSS for react-grid-layout
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Widget, GRID_PROPS } from "@/types/enhanced-dashboard-types";
import { WidgetWrapper } from "./WidgetWrapper";
import { TextBlock } from "./widgets/TextBlock";
import { ChartWidget } from "./widgets/ChartWidget";
import { KPICard } from "./widgets/KPICard";
import { TableWidget } from "./widgets/TableWidget";
import { findAvailablePosition, getDimensionsFromSize } from "../utils/gridUtils";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface EnhancedDashboardGridProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
  onAddWidget?: (addWidgetFn: (type: string) => void) => void;
}

const defaultLayouts = {
  text: { w: 12, h: 2 }, // Full width, increased height for better visibility
  chart: { w: 6, h: 4 }, // Larger size by default (was 4x2)
  kpi: { w: 3, h: 2 },   // Wider for better readability (was 2x2)
  table: { w: 6, h: 4 }, // Larger for better data display (was 4x3)
};

const defaultConfigs = {
  text: {
    content: "Click to edit this text block...",
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

export function EnhancedDashboardGrid({ 
  widgets, 
  onUpdateWidgets,
  onAddWidget
}: EnhancedDashboardGridProps) {
  const [hoveredItems, setHoveredItems] = useState<Record<string, boolean>>({});
  
  const calculateGridHeight = useCallback((layouts: Layout[]) => {
    if (layouts.length === 0) return 400; // Minimum height when empty
    
    // Filter out text widgets since they have h-fit and don't contribute to grid height
    const nonTextLayouts = layouts.filter((_, index) => {
      const widget = widgets[index];
      return widget?.type !== 'text';
    });
    
    if (nonTextLayouts.length === 0) return 400; // Only text widgets, use minimum height
    
    const maxY = Math.max(...nonTextLayouts.map(item => item.y + item.h));
    return (maxY * GRID_PROPS.rowHeight) + (maxY * GRID_PROPS.margin[1]) + 64;
  }, [widgets]);

  const currentLayouts = useMemo(() => {
    const layouts: Layouts = {};
    Object.keys(GRID_PROPS.cols).forEach(breakpoint => {
      layouts[breakpoint] = widgets.map(widget => widget.layout);
    });
    return layouts;
  }, [widgets]);

  const findNextAvailablePosition = useCallback((newWidget: { w: number; h: number }, widgetType: string) => {
    const existingLayouts = widgets.map(w => ({ 
      x: w.layout.x, 
      y: w.layout.y, 
      w: w.layout.w, 
      h: w.type === 'text' && w.layout.h === 0 ? 1 : w.layout.h 
    }));
    
    return findAvailablePosition(existingLayouts, newWidget, GRID_PROPS.cols.lg);
  }, [widgets]);

  const handleAddWidget = useCallback((type: string) => {
    // Validate the widget type
    const validTypes = ['text', 'chart', 'kpi', 'table'] as const;
    if (!validTypes.includes(type as any)) {
      console.error(`Invalid widget type: ${type}`);
      return;
    }

    const layoutConfig = defaultLayouts[type as keyof typeof defaultLayouts];
    const config = defaultConfigs[type as keyof typeof defaultConfigs];
    
    if (!layoutConfig || !config) {
      console.error(`Missing configuration for widget type: ${type}`);
      return;
    }
    
    const position = findNextAvailablePosition(layoutConfig, type);
    const widgetId = uuidv4();
    const layoutId = uuidv4();

    const newWidget: Widget = {
      id: widgetId,
      type: type as Widget['type'],
      layout: {
        i: layoutId, // Use separate UUID for layout
        x: type === 'text' ? 0 : position.x, // Always start at x=0 for text widgets
        y: position.y,
        w: type === 'text' ? 12 : layoutConfig.w, // Always full width for text widgets
        h: layoutConfig.h,
        minW: type === 'text' ? 12 : undefined, // Minimum width for text widgets
        maxW: type === 'text' ? 12 : undefined, // Maximum width for text widgets
        minH: type === 'text' ? 1 : undefined, // Minimum height for text widgets
        maxH: type === 'text' ? undefined : undefined, // Remove max height restriction for text widgets
        isResizable: false, // Disable built-in resizing for all widgets (we handle via popup)
      },
      config,
      data: null,
    };

    onUpdateWidgets([...widgets, newWidget]);
  }, [widgets, onUpdateWidgets, findNextAvailablePosition]);

  const handleDeleteWidget = useCallback((id: string) => {
    onUpdateWidgets(widgets.filter(widget => widget.id !== id));
  }, [widgets, onUpdateWidgets]);

  const handleLayoutChange = useCallback((layout: Layout[], layouts: Layouts) => {
    // Create a map of widget types for quick lookup
    const widgetTypeMap = new Map();
    widgets.forEach(widget => {
      widgetTypeMap.set(widget.layout.i, widget.type);
    });
    
    // Validate layout changes to prevent overlapping
    const validatedLayout = layout.map(layoutItem => {
      const widgetType = widgetTypeMap.get(layoutItem.i);
      const originalWidget = widgets.find(w => w.layout.i === layoutItem.i);
      
      if (!originalWidget) return layoutItem;
      
      // Check for collisions with other widgets
      const wouldCollide = layout.some(otherItem => {
        if (otherItem.i === layoutItem.i) return false;
        
        const otherWidgetType = widgetTypeMap.get(otherItem.i);
        
        // Prevent any overlap with text widgets
        if (otherWidgetType === 'text' && widgetType !== 'text') {
          const otherHeight = otherItem.h === 0 ? 1 : otherItem.h;
          const itemHeight = layoutItem.h === 0 ? 1 : layoutItem.h;
          
          return !(
            layoutItem.x >= otherItem.x + otherItem.w ||
            layoutItem.x + layoutItem.w <= otherItem.x ||
            layoutItem.y >= otherItem.y + otherHeight ||
            layoutItem.y + itemHeight <= otherItem.y
          );
        }
        
        // Standard collision detection
        return !(
          layoutItem.x >= otherItem.x + otherItem.w ||
          layoutItem.x + layoutItem.w <= otherItem.x ||
          layoutItem.y >= otherItem.y + otherItem.h ||
          layoutItem.y + layoutItem.h <= otherItem.y
        );
      });
      
      // If collision detected, revert to original position
      if (wouldCollide) {
        return originalWidget.layout;
      }
      
      return layoutItem;
    });
    
    // Update widgets with validated layouts
    const updatedWidgets = widgets.map(widget => {
      const newLayout = validatedLayout.find(l => l.i === widget.layout.i);
      return newLayout ? { ...widget, layout: newLayout } : widget;
    });
    
    onUpdateWidgets(updatedWidgets);
  }, [widgets, onUpdateWidgets]);

  const handleUpdateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
    onUpdateWidgets(widgets.map(widget =>
      widget.id === widgetId ? { ...widget, ...updates } : widget
    ));
  }, [widgets, onUpdateWidgets]);

  const handleResizeWidget = useCallback((widgetId: string, newSize: { w: number; h: number }) => {
    const updatedWidgets = widgets.map(widget => {
      if (widget.id === widgetId) {
        // Check for collisions with the new size
        const testLayout = { ...widget.layout, ...newSize };
        const wouldCollide = widgets.some(otherWidget => {
          if (otherWidget.id === widgetId) return false;
          
          const otherLayout = otherWidget.layout;
          const otherHeight = otherWidget.type === 'text' && otherLayout.h === 0 ? 1 : otherLayout.h;
          
          return !(
            testLayout.x >= otherLayout.x + otherLayout.w ||
            testLayout.x + testLayout.w <= otherLayout.x ||
            testLayout.y >= otherLayout.y + otherHeight ||
            testLayout.y + testLayout.h <= otherLayout.y
          );
        });
        
        // Only apply resize if no collision
        if (!wouldCollide) {
          return { ...widget, layout: { ...widget.layout, ...newSize } };
        }
      }
      return widget;
    });
    
    onUpdateWidgets(updatedWidgets);
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

  const gridHeight = calculateGridHeight(widgets.map(w => w.layout));

  return (
    <div className="w-full p-4 pl-12" style={{ minHeight: gridHeight }}>
      {widgets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center h-96"
        >
          <div className="w-full max-w-2xl mx-auto">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center bg-gray-50/50 dark:bg-gray-800/50">
              <div className="text-4xl mb-4 text-gray-400">📊</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Start Building Your Dashboard
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Use the floating dock below to add widgets to your dashboard.
                Drag, resize, and configure each widget to fit your needs.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {widgets.length > 0 && (
        <ResponsiveGridLayout
          {...GRID_PROPS}
          layouts={currentLayouts}
          onLayoutChange={handleLayoutChange}
          preventCollision={true}
          compactType={null}
          allowOverlap={false}
        >
          {widgets.map((widget, index) => {
            const isHovered = hoveredItems[widget.layout.i] || false;
            const isTextWidget = widget.type === 'text';
            
            return (
              <div 
                key={widget.layout.i} // Use only layout.i as key to prevent duplicates
                className="react-grid-item-content bg-transparent overflow-hidden h-full cursor-move"
                data-widget-type={widget.type}
                onMouseEnter={() => setHoveredItems(prev => ({ ...prev, [widget.layout.i]: true }))}
                onMouseLeave={() => setHoveredItems(prev => ({ ...prev, [widget.layout.i]: false }))}
              >
                <WidgetWrapper 
                  onDelete={handleDeleteWidget} 
                  id={widget.id} 
                  widgetType={widget.type}
                  layout={widget.layout}
                  onResize={handleResizeWidget}
                >
                  {renderWidget(widget)}
                </WidgetWrapper>
                
                {/* Widget-specific styling */}
                <style jsx>{`
                  .react-resizable-handle {
                    display: none !important;
                  }
                  .react-grid-item {
                    cursor: move !important;
                  }
                  .react-grid-item.react-grid-placeholder {
                    background: rgba(59, 130, 246, 0.3) !important;
                    border: 2px dashed rgba(59, 130, 246, 0.5) !important;
                    border-radius: 8px !important;
                  }
                `}</style>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}

    </div>
  );
}