// Base grid size mappings for different widget types
export const sizeToGridMap = {
  // Charts and Tables - adaptive sizing
  "chart-s": { w: 3, h: 2 },  // Small chart/table
  "chart-m": { w: 4, h: 3 },  // Medium chart/table
  "chart-l": { w: 6, h: 4 },  // Large chart/table
  "chart-xl": { w: 8, h: 4 }, // Extra large chart/table
  
  // KPI Cards - Compact size
  "kpi": { w: 3, h: 2 },
  
  // Text blocks - always full width
  "text-xs": { w: 12, h: 1 },   // 12×1 (default)
  "text-s": { w: 12, h: 2 },    // 12×2
};

// Enhanced responsive size mappings with intelligent adaptive sizing
export const responsiveSizeMap = {
  xl: { // ≥1536px - 12 columns
    "chart-s": { w: 3, h: 2 },   // Smaller default size
    "chart-m": { w: 4, h: 3 },   // Medium size
    "chart-l": { w: 6, h: 4 },   // Large size
    "chart-xl": { w: 8, h: 4 },  // Extra large size
    "kpi": { w: 3, h: 2 },       // Compact KPI
    "text-xs": { w: 12, h: 1 },  // Full width text
    "text-s": { w: 12, h: 2 }    // Full width text
  },
  lg: { // ≥1200px - 12 columns
    "chart-s": { w: 3, h: 2 },   // Smaller default size
    "chart-m": { w: 4, h: 3 },   // Medium size
    "chart-l": { w: 6, h: 4 },   // Large size
    "chart-xl": { w: 8, h: 4 },  // Extra large size
    "kpi": { w: 3, h: 2 },       // Compact KPI
    "text-xs": { w: 12, h: 1 },  // Full width text
    "text-s": { w: 12, h: 2 }    // Full width text
  },
  md: { // ≥1024px - 8 columns (or less if sidebar constraints)
    "chart-s": { w: 3, h: 2 },   // Smaller default size
    "chart-m": { w: 4, h: 3 },   // Medium size
    "chart-l": { w: 5, h: 4 },   // Large size (reduced)
    "chart-xl": { w: 6, h: 4 },  // Extra large size (reduced)
    "kpi": { w: 3, h: 2 },       // Compact KPI
    "text-xs": { w: 8, h: 1 },   // Full width for breakpoint
    "text-s": { w: 8, h: 2 }     // Full width for breakpoint
  },
  sm: { // ≥768px - 4 columns
    "chart-s": { w: 2, h: 2 },   // Half width
    "chart-m": { w: 2, h: 3 },   // Half width, taller
    "chart-l": { w: 4, h: 3 },   // Full width
    "chart-xl": { w: 4, h: 4 },  // Full width, tall
    "kpi": { w: 2, h: 2 },       // Half width KPI
    "text-xs": { w: 4, h: 1 },   // Full width text
    "text-s": { w: 4, h: 2 }     // Full width text
  },
  xs: { // ≥480px - 2 columns
    "chart-s": { w: 2, h: 2 },   // Full width
    "chart-m": { w: 2, h: 3 },   // Full width, taller
    "chart-l": { w: 2, h: 4 },   // Full width, tall
    "chart-xl": { w: 2, h: 4 },  // Full width, tall
    "kpi": { w: 2, h: 2 },       // Full width KPI
    "text-xs": { w: 2, h: 1 },   // Full width text
    "text-s": { w: 2, h: 2 }     // Full width text
  },
  xxs: { // <480px - 1 column
    "chart-s": { w: 1, h: 2 },   // Full width
    "chart-m": { w: 1, h: 3 },   // Full width, taller
    "chart-l": { w: 1, h: 4 },   // Full width, tall
    "chart-xl": { w: 1, h: 4 },  // Full width, tall
    "kpi": { w: 1, h: 2 },       // Full width KPI
    "text-xs": { w: 1, h: 1 },   // Full width text
    "text-s": { w: 1, h: 2 }     // Full width text
  }
};

export const gridToSizeMap = {
  // Charts and Tables - updated mappings
  "3x2": "chart-s",
  "4x2": "chart-s",
  "4x3": "chart-m",
  "4x4": "chart-m", 
  "6x4": "chart-l",
  "8x4": "chart-xl",
  
  // Text widgets
  "12x1": "text-xs",
  "12x2": "text-s",
};

export function getGridSizeFromDimensions(w: number, h: number, widgetType?: string): string {
  const key = `${w}x${h}`;
  
  // Handle widget type specific mappings
  if (widgetType === 'kpi' && key === "4x2") {
    return "kpi";
  }
  
  if (widgetType === 'text') {
    if (key === "12x1" || w >= 8) return "text-xs";
    if (key === "12x2" || (w >= 8 && h >= 2)) return "text-s";
    return "text-xs"; // Default for text
  }
  
  // For charts and tables, use chart prefixes with adaptive sizing
  if (widgetType === 'chart' || widgetType === 'table') {
    if (w >= 8 && h >= 4) return "chart-xl";
    if (w >= 6 && h >= 4) return "chart-l";
    if (w >= 4 && h >= 4) return "chart-m";
    if (w >= 4 && h >= 2) return "chart-s";
    return "chart-s"; // Default for charts/tables
  }
  
  return gridToSizeMap[key as keyof typeof gridToSizeMap] || "chart-s";
}

export function getDimensionsFromSize(size: string): { w: number; h: number } {
  return sizeToGridMap[size as keyof typeof sizeToGridMap] || sizeToGridMap["chart-s"];
}

// Enhanced responsive dimensions with intelligent column constraints
export function getResponsiveDimensions(size: string, breakpoint: string, maxCols?: number): { w: number; h: number } {
  const breakpointMap = responsiveSizeMap[breakpoint as keyof typeof responsiveSizeMap];
  if (!breakpointMap) {
    return getDimensionsFromSize(size);
  }
  
  const dimensions = breakpointMap[size as keyof typeof breakpointMap] || breakpointMap["chart-s"];
  
  // Apply intelligent column constraints
  if (maxCols && dimensions.w > maxCols) {
    // Scale down proportionally while maintaining aspect ratio
    const scaleFactor = maxCols / dimensions.w;
    return {
      w: maxCols,
      h: Math.max(1, Math.round(dimensions.h * scaleFactor))
    };
  }
  
  return dimensions;
}

// Get optimal widget size for available space with intelligent sizing
export function getOptimalWidgetSize(
  widgetType: string, 
  availableColumns: number, 
  breakpoint: string,
  currentSize?: string
): string {
  const sizes = ['chart-xl', 'chart-l', 'chart-m', 'chart-s'];
  
  if (widgetType === 'text') {
    return availableColumns >= 8 ? 'text-s' : 'text-xs';
  }
  
  if (widgetType === 'kpi') {
    return 'kpi';
  }
  
  // For charts and tables, find the largest size that fits
  for (const size of sizes) {
    const dimensions = getResponsiveDimensions(size, breakpoint, availableColumns);
    if (dimensions.w <= availableColumns) {
      return size;
    }
  }
  
  return 'chart-s'; // Fallback
}

// Calculate sidebar-aware breakpoint with intelligent thresholds
export function getSidebarAwareBreakpoint(
  windowWidth: number,
  mainSidebarOpen: boolean,
  chatSidebarOpen: boolean
): string {
  let availableWidth = windowWidth;
  if (mainSidebarOpen) availableWidth -= 280;
  if (chatSidebarOpen) availableWidth -= 400;
  
  // Ensure minimum width
  availableWidth = Math.max(320, availableWidth);
  
  if (availableWidth >= 1536) return 'xl';
  if (availableWidth >= 1200) return 'lg';
  if (availableWidth >= 1024) return 'md';
  if (availableWidth >= 768) return 'sm';
  if (availableWidth >= 480) return 'xs';
  return 'xxs';
}

// Adaptive grid column calculation with intelligent sizing
export function getAdaptiveGridColumns(
  availableWidth: number,
  baseColumns: number = 12,
  minWidgetWidth: number = 280
): number {
  const margin = 32; // Grid margins and padding
  const effectiveWidth = availableWidth - margin;
  
  // Calculate how many columns can fit based on minimum widget width
  const maxFittingColumns = Math.floor(effectiveWidth / minWidgetWidth);
  
  // Ensure we have at least 1 column but don't exceed base columns
  const adaptiveColumns = Math.min(baseColumns, Math.max(1, maxFittingColumns));
  
  // Apply breakpoint-specific constraints
  if (availableWidth < 480) return 1;  // xxs
  if (availableWidth < 768) return Math.min(2, adaptiveColumns);  // xs
  if (availableWidth < 1024) return Math.min(4, adaptiveColumns); // sm
  if (availableWidth < 1200) return Math.min(8, adaptiveColumns); // md
  
  return adaptiveColumns; // lg/xl
}

// Check if two widgets would collide
export function wouldCollide(
  widget1: { x: number; y: number; w: number; h: number },
  widget2: { x: number; y: number; w: number; h: number }
): boolean {
  return !(
    widget1.x >= widget2.x + widget2.w ||
    widget1.x + widget1.w <= widget2.x ||
    widget1.y >= widget2.y + widget2.h ||
    widget1.y + widget1.h <= widget2.y
  );
}

// Enhanced position finding with layout recovery
export function findAvailablePosition(
  existingWidgets: Array<{ x: number; y: number; w: number; h: number }>,
  newWidget: { w: number; h: number },
  gridCols: number = 12,
  startY: number = 0
): { x: number; y: number } {
  // Try to find an empty spot starting from the specified Y position
  for (let y = startY; y < startY + 20; y++) {
    for (let x = 0; x <= gridCols - newWidget.w; x++) {
      const testPosition = { x, y, ...newWidget };
      
      const hasCollision = existingWidgets.some(existing => 
        wouldCollide(testPosition, existing)
      );
      
      if (!hasCollision) {
        return { x, y };
      }
    }
  }
  
  // If no empty spot found, place at bottom
  const maxY = existingWidgets.length > 0 
    ? Math.max(...existingWidgets.map(w => w.y + w.h))
    : startY;
  return { x: 0, y: maxY };
}

// Enhanced layout recovery function with adaptive sizing
export function recoverLayoutPositions(
  widgets: Array<{ x: number; y: number; w: number; h: number; id: string; type?: string }>,
  newGridCols: number,
  oldGridCols: number,
  breakpoint: string = 'lg'
): Array<{ x: number; y: number; w: number; h: number; id: string }> {
  if (newGridCols === oldGridCols) return widgets;
  
  const recoveredWidgets = [...widgets];
  
  // Calculate scale factor with minimum constraints
  const scale = newGridCols / oldGridCols;
  const isExpanding = newGridCols > oldGridCols;
  
  // Sort by Y position, then X position to maintain order
  recoveredWidgets.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
  
  const adjustedWidgets: typeof recoveredWidgets = [];
  
  for (const widget of recoveredWidgets) {
    let newX: number;
    let newW: number;
    let newH: number = widget.h;
    
    // Use adaptive sizing based on widget type and available space
    if (widget.type) {
      const currentSize = getGridSizeFromDimensions(widget.w, widget.h, widget.type);
      const optimalSize = getOptimalWidgetSize(widget.type, newGridCols, breakpoint, currentSize);
      const adaptiveDimensions = getResponsiveDimensions(optimalSize, breakpoint, newGridCols);
      
      newW = adaptiveDimensions.w;
      newH = adaptiveDimensions.h;
      
      // For text widgets, always use full width
      if (widget.type === 'text') {
        newX = 0;
        newW = newGridCols;
      } else {
        // Scale position proportionally
        if (isExpanding) {
          newX = Math.round(widget.x * scale);
        } else {
          newX = Math.floor(widget.x * scale);
        }
        
        // Ensure widget fits within new grid bounds
        if (newX + newW > newGridCols) {
          newX = Math.max(0, newGridCols - newW);
        }
      }
    } else {
      // Fallback to original scaling logic if no type
      if (isExpanding) {
        newX = Math.round(widget.x * scale);
        newW = Math.min(Math.max(1, Math.round(widget.w * scale)), newGridCols);
      } else {
        newX = Math.floor(widget.x * scale);
        newW = Math.min(Math.max(1, Math.ceil(widget.w * scale)), newGridCols);
      }
      
      if (newX + newW > newGridCols) {
        newX = Math.max(0, newGridCols - newW);
      }
    }
    
    // For very narrow grids, stack widgets vertically
    if (newGridCols <= 2) {
      newX = 0;
      newW = newGridCols;
    }
    
    // Find available position to avoid collisions
    const position = findAvailablePosition(
      adjustedWidgets,
      { w: newW, h: newH },
      newGridCols,
      widget.y
    );
    
    adjustedWidgets.push({
      ...widget,
      x: position.x,
      y: position.y,
      w: newW,
      h: newH
    });
  }
  
  return adjustedWidgets;
}

// Smooth transition helper for layout changes
export function createLayoutTransition(
  fromLayout: Array<{ x: number; y: number; w: number; h: number; id: string }>,
  toLayout: Array<{ x: number; y: number; w: number; h: number; id: string }>,
  duration: number = 300
): { from: any; to: any; duration: number; transitions: any[] } {
  const fromMap = new Map(fromLayout.map(item => [item.id, item]));
  const toMap = new Map(toLayout.map(item => [item.id, item]));
  
  const transitions = [];
  
  for (const [id, toItem] of toMap) {
    const fromItem = fromMap.get(id);
    if (fromItem) {
      transitions.push({
        id,
        from: fromItem,
        to: toItem,
        deltaX: toItem.x - fromItem.x,
        deltaY: toItem.y - fromItem.y,
        deltaW: toItem.w - fromItem.w,
        deltaH: toItem.h - fromItem.h,
      });
    }
  }
  
  return {
    from: fromLayout,
    to: toLayout,
    duration,
    transitions,
  };
}