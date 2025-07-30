"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Responsive, WidthProvider, Layout as GridLayout, Layouts } from "react-grid-layout";
import { motion } from "motion/react";
import { v4 as uuidv4 } from "uuid";
import { useResponsiveGrid } from "@/components/dashboard/LayoutContext";
import { cn } from "@/lib/utils";

// Import required CSS for react-grid-layout (no resizable CSS - resize disabled)
import "react-grid-layout/css/styles.css";

import { Widget, GRID_PROPS, Layout } from "@/types/enhanced-dashboard-types";
import { WidgetWrapper } from "./WidgetWrapper";
import { TextBlock } from "./widgets/TextBlock";
import { ChartWidget } from "./widgets/ChartWidget";
import { KPICard } from "./widgets/KPICard";
import { TableWidget } from "./widgets/TableWidget";
import { findAvailablePosition, getDimensionsFromSize, getResponsiveDimensions, getOptimalWidgetSize, recoverLayoutPositions } from "../utils/gridUtils";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface EnhancedDashboardGridProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
  onAddWidget?: (addWidgetFn: (type: string) => void) => void;
  isLoading?: boolean;
}

const defaultLayouts = {
  text: { w: 12, h: 1 },  // Default to text-xs size (12×1)
  chart: { w: 3, h: 2 },  // Default to chart-s size (3×2)
  kpi: { w: 3, h: 2 },    // Default KPI size (3×2)
  table: { w: 3, h: 2 },  // Default to chart-s size (3×2)
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
  isLoading = false,
}: EnhancedDashboardGridProps) {
  const [hoveredItems, setHoveredItems] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  
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

  const calculateGridHeight = useCallback((layouts: GridLayout[]) => {
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
        if (!a.layout || !b.layout) return 0;
        if (a.layout.y !== b.layout.y) return a.layout.y - b.layout.y;
        return a.layout.x - b.layout.x;
      });
      
      // Track occupied positions for collision avoidance
      const occupiedPositions: Array<{ x: number; y: number; w: number; h: number }> = [];
      
      layouts[breakpoint] = sortedWidgets.map(widget => {
        const layout = { 
          i: widget.id,
          x: widget.layout?.x ?? 0,
          y: widget.layout?.y ?? 0,
          w: widget.layout?.w ?? 4,
          h: widget.layout?.h ?? 4,
          ...widget.layout 
        };
        
        // Use intelligent adaptive sizing based on widget type and available space
        const optimalSize = getOptimalWidgetSize(widget.type, colsForBreakpoint, breakpoint);
        const responsiveDimensions = getResponsiveDimensions(optimalSize, breakpoint, colsForBreakpoint);
        
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
  }, [widgets, gridProps]);

  const findNextAvailablePosition = useCallback((newWidget: { w: number; h: number }, widgetType: string) => {
    const existingLayouts = widgets.map(w => ({ 
      x: w.layout?.x ?? 0, 
      y: w.layout?.y ?? 0, 
      w: w.layout?.w ?? 4, 
      h: w.type === 'text' && (w.layout?.h ?? 4) === 0 ? 1 : (w.layout?.h ?? 4)
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
    
    // Use adaptive sizing for new widgets
    const currentCols = gridProps.cols.lg || 12;
    const optimalSize = getOptimalWidgetSize(type, currentCols, effectiveBreakpoint);
    const adaptiveDimensions = getResponsiveDimensions(optimalSize, effectiveBreakpoint, currentCols);
    
    const position = findNextAvailablePosition(adaptiveDimensions, type);
    const widgetId = uuidv4();
    const layoutId = uuidv4();

    console.log(`[EnhancedDashboardGrid] Creating widget:`, {
      type,
      widgetId,
      layoutId,
      position,
      adaptiveDimensions,
      config
    });

    const newWidget: Widget = {
      id: widgetId,
      type: type as Widget['type'],
      layout: {
        i: layoutId, // Use separate UUID for layout
        x: type === 'text' ? 0 : position.x, // Always start at x=0 for text widgets
        y: position.y,
        w: type === 'text' ? currentCols : adaptiveDimensions.w, // Use adaptive width
        h: adaptiveDimensions.h, // Use adaptive height
        minW: type === 'text' ? currentCols : undefined, // Minimum width for text widgets
        maxW: type === 'text' ? currentCols : undefined, // Maximum width for text widgets
        minH: type === 'text' ? 1 : undefined, // Minimum height for text widgets
        maxH: type === 'text' ? undefined : undefined, // Remove max height restriction for text widgets
        isResizable: false, // Disable manual resizing - use predetermined sizes only
      },
      config,
      data: null,
    };

    console.log(`[EnhancedDashboardGrid] New widget created:`, newWidget);
    console.log(`[EnhancedDashboardGrid] Updated widget array will have ${widgets.length + 1} widgets`);

    onUpdateWidgets([...widgets, newWidget]);
  }, [widgets, onUpdateWidgets, findNextAvailablePosition, effectiveBreakpoint, gridProps.cols.lg]);

  const handleDeleteWidget = useCallback((id: string) => {
    onUpdateWidgets(widgets.filter(widget => widget.id !== id));
  }, [widgets, onUpdateWidgets]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Handle layout changes with recovery logic and vertical-only constraint
  const handleLayoutChange = useCallback((currentLayout: Layout[], allLayouts: Layouts) => {
    // Skip updates during transitions to prevent layout jumps
    if (isTransitioning || isRecovering) return;
    
    // Update widget layouts only if they've actually changed
    const updatedWidgets = widgets.map((widget, index) => {
      const layoutItem = currentLayout.find((item) => item.i === widget.id);
      if (!layoutItem || !widget.layout) return widget;
      
      // Constrain to vertical-only movement by preserving original x position
      // Only allow y position changes for reordering
      const constrainedLayout = {
        ...layoutItem,
        x: widget.layout.x, // Keep original x position - no horizontal movement
        w: widget.layout.w, // Keep original width - no horizontal resizing
      };
      
      // Check if layout actually changed (only y position matters now)
      const hasChanged = 
        constrainedLayout.y !== widget.layout.y ||
        constrainedLayout.h !== widget.layout.h;
      
      if (!hasChanged) return widget;
      
      return {
        ...widget,
        layout: {
          ...constrainedLayout,
          i: widget.layout.i, // Preserve the ID
        },
      };
    });
    
    // Only update if there were actual changes
    const hasChanges = updatedWidgets.some((w, i) => w !== widgets[i]);
    if (hasChanges) {
      onUpdateWidgets(updatedWidgets);
    }
  }, [widgets, onUpdateWidgets, isTransitioning, isRecovering]);

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

  const gridHeight = calculateGridHeight(widgets.map(w => w.layout).filter((layout): layout is GridLayout => layout !== undefined));

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
                  Widgets will automatically adapt to your available space and screen size.
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
            preventCollision={gridProps.preventCollision}
            compactType={gridProps.compactType}
            allowOverlap={false}
            useCSSTransforms={true}
            transformScale={1}
            autoSize={true}
            measureBeforeMount={false}
            isDraggable={gridProps.isDraggable}
            isResizable={false}
          >
            {widgets.map((widget, index) => {
              return (
                <div 
                  key={widget.id} // Use widget.id as key
                  className="react-grid-item-content bg-transparent h-full cursor-move overflow-visible "
                  data-widget-type={widget.type}
                  onMouseEnter={() => setHoveredItems(prev => ({ ...prev, [widget.id]: true }))}
                  onMouseLeave={() => setHoveredItems(prev => ({ ...prev, [widget.id]: false }))}
                >
                  <WidgetWrapper 
                    onDelete={handleDeleteWidget} 
                    id={widget.id} 
                    widgetType={widget.type}
                    layout={widget.layout}
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



    </>
  );
}