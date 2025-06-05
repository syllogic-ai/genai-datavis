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

const ResponsiveGridLayout = WidthProvider(Responsive);

interface EnhancedDashboardGridProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
  onAddWidget?: (addWidgetFn: (type: string) => void) => void;
}

const defaultLayouts = {
  text: { w: 12, h: 0 }, // Full width, no predetermined height
  chart: { w: 3, h: 3 },
  kpi: { w: 2, h: 2 },
  table: { w: 4, h: 3 },
};

const defaultConfigs = {
  text: {
    content: "",
    fontSize: "medium",
    alignment: "left",
  },
  chart: {
    chartType: "bar",
    title: "New Chart",
    description: "",
  },
  kpi: {
    title: "KPI",
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

  const findNextAvailablePosition = useCallback((newWidget: { w: number; h: number }) => {
    const existingLayouts = widgets.map(w => w.layout);
    const cols = GRID_PROPS.cols.lg;
    
    // Try to find an empty spot
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x <= cols - newWidget.w; x++) {
        const wouldCollide = existingLayouts.some(layout => {
          // For text widgets (h: 0), treat them as having height of 1 for collision detection
          const layoutHeight = layout.h === 0 ? 1 : layout.h;
          const newWidgetHeight = newWidget.h === 0 ? 1 : newWidget.h;
          
          return !(
            x >= layout.x + layout.w ||
            x + newWidget.w <= layout.x ||
            y >= layout.y + layoutHeight ||
            y + newWidgetHeight <= layout.y
          );
        });
        
        if (!wouldCollide) {
          return { x, y };
        }
      }
    }
    
    // If no empty spot found, place at bottom
    const maxY = existingLayouts.length > 0 
      ? Math.max(...existingLayouts.map(l => l.y + (l.h === 0 ? 1 : l.h)))
      : 0;
    return { x: 0, y: maxY };
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
    
    const position = findNextAvailablePosition(layoutConfig);

    const newWidget: Widget = {
      id: uuidv4(),
      type: type as Widget['type'],
      layout: {
        i: uuidv4(),
        x: type === 'text' ? 0 : position.x, // Always start at x=0 for text widgets
        y: position.y,
        w: type === 'text' ? 12 : layoutConfig.w, // Always full width for text widgets
        h: layoutConfig.h,
        minW: type === 'text' ? 12 : undefined, // Minimum width for text widgets
        maxW: type === 'text' ? 12 : undefined, // Maximum width for text widgets
        minH: type === 'text' ? 0 : undefined, // No minimum height for text widgets
        maxH: type === 'text' ? 0 : undefined, // No max height for text widgets
        isResizable: type !== 'text', // Disable resizing for text widgets
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
    const updatedWidgets = widgets.map(widget => {
      const newLayout = layout.find(l => l.i === widget.layout.i);
      return newLayout ? { ...widget, layout: newLayout } : widget;
    });
    onUpdateWidgets(updatedWidgets);
  }, [widgets, onUpdateWidgets]);

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

  const gridHeight = calculateGridHeight(widgets.map(w => w.layout));

  return (
    <div className="w-full p-4 pl-12" style={{ minHeight: gridHeight }}>
      {widgets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center h-96"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Start Building Your Dashboard
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Use the floating dock below to add widgets to your dashboard.
              You can drag, resize, and configure each widget to fit your needs.
            </p>
          </div>
        </motion.div>
      )}

      {widgets.length > 0 && (
        <ResponsiveGridLayout
          {...GRID_PROPS}
          layouts={currentLayouts}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
        >
          {widgets.map((widget) => {
            const isHovered = hoveredItems[widget.layout.i] || false;
            const isTextWidget = widget.type === 'text';
            
            return (
              <div 
                key={widget.layout.i} 
                className={`react-grid-item-content group ${
                  isTextWidget
                    ? `bg-transparent border transition-colors duration-200 overflow-visible h-fit px-1 py-0 rounded-md ${
                        isHovered 
                          ? 'border-gray-300 dark:border-gray-600' 
                          : 'border-transparent'
                      }`
                    : `bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg overflow-hidden h-full p-4 transition-all duration-200 ${
                        isHovered 
                          ? 'shadow-lg border-gray-400 dark:border-gray-500' 
                          : ''
                      }`
                }`}
                data-widget-type={widget.type}
                onMouseEnter={() => setHoveredItems(prev => ({ ...prev, [widget.layout.i]: true }))}
                onMouseLeave={() => setHoveredItems(prev => ({ ...prev, [widget.layout.i]: false }))}
                style={isTextWidget ? { height: 'fit-content', cursor: 'default' } : {}}
              >
                <WidgetWrapper onDelete={handleDeleteWidget} id={widget.id} widgetType={widget.type}>
                  {renderWidget(widget)}
                </WidgetWrapper>
                
                {/* Hide resize handle for text widgets */}
                {isTextWidget && (
                  <style jsx>{`
                    [data-widget-type="text"] .react-resizable-handle {
                      display: none !important;
                    }
                  `}</style>
                )}
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}

    </div>
  );
}