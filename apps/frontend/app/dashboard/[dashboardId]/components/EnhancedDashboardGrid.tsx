"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import { motion } from "motion/react";
import { v4 as uuidv4 } from "uuid";
import { useResponsiveGrid } from "@/components/dashboard/LayoutContext";
import { cn } from "@/lib/utils";

// Import required CSS for react-grid-layout
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Widget, GRID_PROPS } from "@/types/enhanced-dashboard-types";
import { WidgetWrapper } from "./WidgetWrapper";
import { TextBlock } from "./widgets/TextBlock";
import { ChartWidget } from "./widgets/ChartWidget";
import { KPICard } from "./widgets/KPICard";
import { TableWidget } from "./widgets/TableWidget";
import { findAvailablePosition, getDimensionsFromSize, getResponsiveDimensions } from "../utils/gridUtils";
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
  
  // Use responsive grid hook instead of manual chat sidebar tracking
  const { gridProps, isTransitioning, effectiveBreakpoint, availableWidth } = useResponsiveGrid();
  
  // Store previous grid columns for layout recovery
  const prevColsRef = useRef<number>(gridProps.cols.lg || 12);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Update grid when layout changes with recovery logic
  useEffect(() => {
    if (isTransitioning) {
      // Add transitioning class for smooth animations
      const gridElement = document.querySelector('.react-grid-layout');
      if (gridElement) {
        gridElement.classList.add('layout-transitioning');
        
        // Check if columns changed for recovery
        const currentCols = gridProps.cols.lg || 12;
        if (currentCols !== prevColsRef.current) {
          setIsRecovering(true);
          gridElement.classList.add('layout-recovery');
        }
        
        // Remove classes after transition
        setTimeout(() => {
          gridElement.classList.remove('layout-transitioning');
          gridElement.classList.remove('layout-recovery');
          setIsRecovering(false);
          prevColsRef.current = currentCols;
        }, 400);
      }
    }
  }, [isTransitioning, gridProps.cols.lg]);
  
  // Force grid recalculation when layout context changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [availableWidth, effectiveBreakpoint]);

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
    
    Object.keys(gridProps.cols).forEach(breakpoint => {
      const colsForBreakpoint = gridProps.cols[breakpoint as keyof typeof gridProps.cols];
      
      // Sort widgets to maintain consistent order during recovery
      const sortedWidgets = [...widgets].sort((a, b) => {
        // First by y position, then by x position
        if (a.layout.y !== b.layout.y) return a.layout.y - b.layout.y;
        return a.layout.x - b.layout.x;
      });
      
      // Track occupied positions for collision avoidance
      const occupiedPositions: Array<{ x: number; y: number; w: number; h: number }> = [];
      
      layouts[breakpoint] = sortedWidgets.map(widget => {
        const layout = { ...widget.layout };
        
        // Get the widget's size from layout dimensions
        let widgetSize = "chart-s"; // default
        
        // Determine the widget size based on dimensions and type
        if (widget.type === 'text') {
          widgetSize = layout.h === 1 ? "text-xs" : "text-s";
        } else if (widget.type === 'kpi') {
          widgetSize = "kpi";
        } else {
          // For charts and tables, determine size from dimensions
          if (layout.w === 4 && layout.h === 2) widgetSize = "chart-s";
          else if (layout.w === 4 && layout.h === 4) widgetSize = "chart-m";
          else if (layout.w === 6 && layout.h === 4) widgetSize = "chart-l";
          else if (layout.w === 8 && layout.h === 4) widgetSize = "chart-xl";
        }
        
        // Get responsive dimensions for this breakpoint
        const responsiveDimensions = getResponsiveDimensions(widgetSize, breakpoint, colsForBreakpoint);
        
        // Apply responsive sizing with bounds checking
        layout.w = Math.min(responsiveDimensions.w, colsForBreakpoint);
        layout.h = responsiveDimensions.h;
        
        // For text widgets, always use full width for the breakpoint
        if (widget.type === 'text') {
          layout.x = 0;
          layout.w = colsForBreakpoint;
        } else {
          // Scale x position proportionally to new column count
          const scaleFactor = colsForBreakpoint / 12;
          layout.x = Math.round(layout.x * scaleFactor);
          
          // Ensure the widget doesn't exceed column boundaries
          if (layout.x + layout.w > colsForBreakpoint) {
            layout.x = Math.max(0, colsForBreakpoint - layout.w);
          }
        }
        
        // Find available position if there's a collision
        const position = findAvailablePosition(occupiedPositions, layout, colsForBreakpoint, layout.y);
        layout.x = position.x;
        layout.y = position.y;
        
        // Track this position as occupied
        occupiedPositions.push({ x: layout.x, y: layout.y, w: layout.w, h: layout.h });
        
        return layout;
      });
    });
    
    return layouts;
  }, [widgets, gridProps.cols]);

  const findNextAvailablePosition = useCallback((newWidget: { w: number; h: number }, widgetType: string) => {
    const existingLayouts = widgets.map(w => ({ 
      x: w.layout.x, 
      y: w.layout.y, 
      w: w.layout.w, 
      h: w.type === 'text' && w.layout.h === 0 ? 1 : w.layout.h 
    }));
    
    // Use current effective grid columns
    const currentCols = gridProps.cols.lg || 12;
    return findAvailablePosition(existingLayouts, newWidget, currentCols);
  }, [widgets, gridProps.cols.lg]);

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
      <div 
        className="w-full p-4 pl-12 transition-all duration-300 ease-out" 
        style={{ 
          minHeight: gridHeight,
          width: gridProps.width,
          maxWidth: '100%'
        }}
      >
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
            key={`grid-${effectiveBreakpoint}-${availableWidth}`}
            className={cn(
              "layout transition-all duration-300 ease-out",
              isTransitioning && "layout-transitioning"
            )}
            layouts={currentLayouts}
            breakpoints={gridProps.breakpoints}
            cols={gridProps.cols}
            rowHeight={gridProps.rowHeight}
            margin={gridProps.margin}
            containerPadding={gridProps.containerPadding}
            width={gridProps.width}
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
            isResizable={false}
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