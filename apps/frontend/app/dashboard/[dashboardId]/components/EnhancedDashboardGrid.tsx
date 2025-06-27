"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import { ResizePopup } from "./ResizePopup";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface EnhancedDashboardGridProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
  onAddWidget?: (addWidgetFn: (type: string) => void) => void;
}

const defaultLayouts = {
  text: { w: 12, h: 1 },  // Default to text-xs size (12×1)
  chart: { w: 4, h: 2 },  // Default to chart-s size (4×2)
  kpi: { w: 4, h: 2 },    // Only size available for KPI (4×2)
  table: { w: 4, h: 2 },  // Default to chart-s size (4×2)
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
  onAddWidget,
}: EnhancedDashboardGridProps) {
  const [hoveredItems, setHoveredItems] = useState<Record<string, boolean>>({});
  const [activePopup, setActivePopup] = useState<{
    widgetId: string | null;
    position: { x: number; y: number };
    currentSize: string;
    widgetType: string;
  }>({
    widgetId: null,
    position: { x: 0, y: 0 },
    currentSize: 'm',
    widgetType: '',
  });
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const calculateGridHeight = useCallback((layouts: Layout[]) => {
    if (layouts.length === 0) return 400; // Minimum height when empty
    
    // Filter out text widgets since they have h-fit and don't contribute to grid height
    const nonTextLayouts = layouts.filter((_, index) => {
      const widget = widgets[index];
      return widget?.type !== 'text';
    });
    
    if (nonTextLayouts.length === 0) return 400; // Only text widgets, use minimum height
    
    const maxY = Math.max(...nonTextLayouts.map(item => item.y + item.h));
    return (maxY * GRID_PROPS.rowHeight) + (maxY * GRID_PROPS.margin[1]) + 128;
  }, [widgets]);

  const currentLayouts = useMemo(() => {
    const layouts: Layouts = {};
    Object.keys(GRID_PROPS.cols).forEach(breakpoint => {
      layouts[breakpoint] = widgets.map(widget => {
        // For responsive behavior, we might need to adjust layouts based on breakpoint
        const layout = { ...widget.layout };
        
        // For smaller screens, ensure text widgets stay full width
        if (widget.type === 'text') {
          const colsForBreakpoint = GRID_PROPS.cols[breakpoint as keyof typeof GRID_PROPS.cols];
          layout.w = colsForBreakpoint; // Full width for text on any screen size
          layout.x = 0; // Always start at left
        }
        
        return layout;
      });
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
    console.log(`[EnhancedDashboardGrid] handleAddWidget called:`, {
      type,
      currentWidgetCount: widgets.length,
      timestamp: new Date().toISOString()
    });
    
    // Validate the widget type
    const validTypes = ['text', 'chart', 'kpi', 'table'] as const;
    if (!validTypes.includes(type as any)) {
      console.error(`[EnhancedDashboardGrid] Invalid widget type: ${type}`);
      return;
    }

    const layoutConfig = defaultLayouts[type as keyof typeof defaultLayouts];
    const config = defaultConfigs[type as keyof typeof defaultConfigs];
    
    if (!layoutConfig || !config) {
      console.error(`[EnhancedDashboardGrid] Missing configuration for widget type: ${type}`);
      return;
    }
    
    const position = findNextAvailablePosition(layoutConfig, type);
    const widgetId = uuidv4();
    const layoutId = uuidv4();

    console.log(`[EnhancedDashboardGrid] Creating widget:`, {
      type,
      widgetId,
      layoutId,
      position,
      layoutConfig,
      config
    });

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

    console.log(`[EnhancedDashboardGrid] New widget created:`, newWidget);
    console.log(`[EnhancedDashboardGrid] Updated widget array will have ${widgets.length + 1} widgets`);

    onUpdateWidgets([...widgets, newWidget]);
  }, [widgets, onUpdateWidgets, findNextAvailablePosition]);

  const handleDeleteWidget = useCallback((id: string) => {
    onUpdateWidgets(widgets.filter(widget => widget.id !== id));
  }, [widgets, onUpdateWidgets]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    // Hide popup immediately when dragging starts
    setActivePopup({
      widgetId: null,
      position: { x: 0, y: 0 },
      currentSize: 'm',
      widgetType: '',
    });
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleLayoutChange = useCallback((currentLayout: Layout[], allLayouts: Layouts) => {
    // For responsive grids, we get the current layout and all layouts
    // Use the current layout to update widget positions
    const validatedLayout = currentLayout.map(layoutItem => {
      const originalWidget = widgets.find(w => w.layout.i === layoutItem.i);
      
      if (!originalWidget) return layoutItem;
      
      // For text widgets, ensure they stay at full width
      if (originalWidget.type === 'text') {
        return {
          ...layoutItem,
          x: 0, // Always start at x=0 for text widgets
          w: layoutItem.w, // Keep responsive width
        };
      }
      
      return layoutItem;
    });
    
    // Update widgets with new layouts
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
        return { ...widget, layout: { ...widget.layout, ...newSize } };
      }
      return widget;
    });
    
    onUpdateWidgets(updatedWidgets);
  }, [widgets, onUpdateWidgets]);

  const handleShowPopup = useCallback((widgetId: string, position: { x: number; y: number }, currentSize: string, widgetType: string) => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    setActivePopup({
      widgetId,
      position,
      currentSize,
      widgetType,
    });
  }, []);

  const handleHidePopup = useCallback(() => {
    // Only hide if popup is not being hovered
    if (!isPopupHovered) {
      hideTimeoutRef.current = setTimeout(() => {
        setActivePopup({
          widgetId: null,
          position: { x: 0, y: 0 },
          currentSize: 'm',
          widgetType: '',
        });
      }, 300); // 300ms delay
    }
  }, [isPopupHovered]);

  const handlePopupMouseEnter = useCallback(() => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsPopupHovered(true);
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    setIsPopupHovered(false);
    
    // Hide popup after a delay
    hideTimeoutRef.current = setTimeout(() => {
      setActivePopup({
        widgetId: null,
        position: { x: 0, y: 0 },
        currentSize: 'm',
        widgetType: '',
      });
    }, 300); // 300ms delay
  }, []);

  // Clear timeout on cleanup
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

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
    <>
      <div className="w-full p-4 pl-12" style={{ minHeight: gridHeight }}>
        {widgets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center h-96 "
          >
            <div className="w-full max-w-2xl mx-auto ">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center bg-gray-50/50 dark:bg-gray-800/50">
                <div className="text-4xl mb-4 text-gray-400">📊</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No widgets inside
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
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
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={GRID_PROPS.cols}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onDragStop={handleDragStop}
            preventCollision={false}
            compactType="vertical"
            allowOverlap={false}
            useCSSTransforms={true}
            transformScale={1}
            autoSize={true}
            measureBeforeMount={false}
   
          >
            {widgets.map((widget, index) => {
              // Create a wrapper function to match the expected signature
              const handleWidgetResize = (id: string, size: string) => {
                // Convert string size to dimensions object if needed
                // For now, since onResize isn't used in WidgetWrapper, we'll pass a placeholder
                handleResizeWidget(id, { w: 1, h: 1 });
              };
              
              return (
                <div 
                  key={widget.layout.i} // Use only layout.i as key to prevent duplicates
                  className="react-grid-item-content bg-transparent h-full cursor-move overflow-visible "
                  data-widget-type={widget.type}
                  onMouseEnter={() => setHoveredItems(prev => ({ ...prev, [widget.layout.i]: true }))}
                  onMouseLeave={() => setHoveredItems(prev => ({ ...prev, [widget.layout.i]: false }))}
                >
                  <WidgetWrapper 
                    onDelete={handleDeleteWidget} 
                    id={widget.id} 
                    widgetType={widget.type}
                    layout={widget.layout}
                    onResize={handleWidgetResize}
                    onShowPopup={handleShowPopup}
                    onHidePopup={handleHidePopup}
                    isPopupActive={activePopup.widgetId === widget.id}
                    isDragging={isDragging}
                  >
                    {renderWidget(widget)}
                  </WidgetWrapper>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Global resize popup */}
      {activePopup.widgetId && (
        <ResizePopup
          isVisible={true}
          position={activePopup.position}
          currentSize={activePopup.currentSize}
          onSizeSelect={(size) => {
            if (activePopup.widgetId) {
              const newDimensions = getDimensionsFromSize(size);
              handleResizeWidget(activePopup.widgetId, newDimensions);
            }
            setActivePopup({
              widgetId: null,
              position: { x: 0, y: 0 },
              currentSize: 'm',
              widgetType: '',
            });
          }}
          widgetType={activePopup.widgetType}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}


    </>
  );
}