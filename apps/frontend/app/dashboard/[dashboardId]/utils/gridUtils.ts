// Grid size mappings for different breakpoints
export const sizeToGridMap = {
  // Charts and Tables - responsive sizing
  "chart-s": { w: 4, h: 2 },  // Small chart/table
  "chart-m": { w: 4, h: 4 },  // Medium chart/table
  "chart-l": { w: 6, h: 4 },  // Large chart/table
  "chart-xl": { w: 8, h: 4 }, // Extra large chart/table
  
  // KPI Cards - Only 4×2
  "kpi": { w: 4, h: 2 },
  
  // Text blocks - always full width
  "text-xs": { w: 12, h: 1 },   // 12×1 (default)
  "text-s": { w: 12, h: 2 },    // 12×2
};

// Enhanced responsive size mappings with sidebar awareness
export const responsiveSizeMap = {
  xl: { // ≥1536px - 12 columns
    "chart-s": { w: 4, h: 2 },
    "chart-m": { w: 4, h: 4 },
    "chart-l": { w: 6, h: 4 },
    "chart-xl": { w: 8, h: 4 },
    "kpi": { w: 4, h: 2 },
    "text-xs": { w: 12, h: 1 },
    "text-s": { w: 12, h: 2 }
  },
  lg: { // ≥1200px - 12 columns
    "chart-s": { w: 4, h: 2 },
    "chart-m": { w: 4, h: 4 },
    "chart-l": { w: 6, h: 4 },
    "chart-xl": { w: 8, h: 4 },
    "kpi": { w: 4, h: 2 },
    "text-xs": { w: 12, h: 1 },
    "text-s": { w: 12, h: 2 }
  },
  md: { // ≥996px - 8 columns (or less if sidebar constraints)
    "chart-s": { w: 4, h: 2 },
    "chart-m": { w: 4, h: 4 },
    "chart-l": { w: 4, h: 4 }, // Reduced from 6 to 4
    "chart-xl": { w: 6, h: 4 }, // Reduced from 8 to 6
    "kpi": { w: 4, h: 2 },
    "text-xs": { w: 8, h: 1 },
    "text-s": { w: 8, h: 2 }
  },
  sm: { // ≥768px - 4 columns
    "chart-s": { w: 2, h: 2 },
    "chart-m": { w: 2, h: 4 },
    "chart-l": { w: 4, h: 4 },
    "chart-xl": { w: 4, h: 4 },
    "kpi": { w: 2, h: 2 },
    "text-xs": { w: 4, h: 1 },
    "text-s": { w: 4, h: 2 }
  },
  xs: { // ≥480px - 2 columns
    "chart-s": { w: 2, h: 2 },
    "chart-m": { w: 2, h: 4 },
    "chart-l": { w: 2, h: 4 },
    "chart-xl": { w: 2, h: 4 },
    "kpi": { w: 2, h: 2 },
    "text-xs": { w: 2, h: 1 },
    "text-s": { w: 2, h: 2 }
  },
  xxs: { // <480px - 1 column
    "chart-s": { w: 1, h: 2 },
    "chart-m": { w: 1, h: 4 },
    "chart-l": { w: 1, h: 4 },
    "chart-xl": { w: 1, h: 4 },
    "kpi": { w: 1, h: 2 },
    "text-xs": { w: 1, h: 1 },
    "text-s": { w: 1, h: 2 }
  }
};

export const gridToSizeMap = {
  // Charts and Tables
  "4x2": "chart-s",
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
    if (key === "12x1") return "text-xs";
    if (key === "12x2") return "text-s";
    return "text-xs"; // Default for text (12x1)
  }
  
  // For charts and tables, use chart prefixes
  if (widgetType === 'chart' || widgetType === 'table') {
    if (key === "4x2") return "chart-s";
    if (key === "4x4") return "chart-m";
    if (key === "6x4") return "chart-l";
    if (key === "8x4") return "chart-xl";
    return "chart-s"; // Default for charts/tables
  }
  
  return gridToSizeMap[key as keyof typeof gridToSizeMap] || "chart-s";
}

export function getDimensionsFromSize(size: string): { w: number; h: number } {
  return sizeToGridMap[size as keyof typeof sizeToGridMap] || sizeToGridMap["chart-s"];
}

// Enhanced responsive dimensions with constrained column support
export function getResponsiveDimensions(size: string, breakpoint: string, maxCols?: number): { w: number; h: number } {
  const breakpointMap = responsiveSizeMap[breakpoint as keyof typeof responsiveSizeMap];
  if (!breakpointMap) {
    return getDimensionsFromSize(size);
  }
  
  const dimensions = breakpointMap[size as keyof typeof breakpointMap] || breakpointMap["chart-s"];
  
  // Apply column constraints if provided
  if (maxCols && dimensions.w > maxCols) {
    return {
      w: maxCols,
      h: dimensions.h
    };
  }
  
  return dimensions;
}

// Get optimal widget size for available space
export function getOptimalWidgetSize(
  widgetType: string, 
  availableColumns: number, 
  breakpoint: string
): string {
  const sizes = ['chart-s', 'chart-m', 'chart-l', 'chart-xl'];
  
  if (widgetType === 'text') {
    return availableColumns >= 8 ? 'text-s' : 'text-xs';
  }
  
  if (widgetType === 'kpi') {
    return 'kpi';
  }
  
  // Find the largest size that fits
  for (const size of sizes.reverse()) {
    const dimensions = getResponsiveDimensions(size, breakpoint, availableColumns);
    if (dimensions.w <= availableColumns) {
      return size;
    }
  }
  
  return 'chart-s'; // Fallback
}

// Calculate sidebar-aware breakpoint
export function getSidebarAwareBreakpoint(
  windowWidth: number,
  mainSidebarOpen: boolean,
  chatSidebarOpen: boolean
): string {
  let availableWidth = windowWidth;
  if (mainSidebarOpen) availableWidth -= 280;
  if (chatSidebarOpen) availableWidth -= 400;
  
  if (availableWidth >= 1536) return 'xl';
  if (availableWidth >= 1200) return 'lg';
  if (availableWidth >= 1024) return 'md';
  if (availableWidth >= 768) return 'sm';
  if (availableWidth >= 480) return 'xs';
  return 'xxs';
}

// Adaptive grid column calculation
export function getAdaptiveGridColumns(
  availableWidth: number,
  baseColumns: number = 12
): number {
  const minWidgetWidth = 300; // Minimum widget width in pixels
  const margin = 32; // Grid margins and padding
  const effectiveWidth = availableWidth - margin;
  
  const maxFittingColumns = Math.floor(effectiveWidth / minWidgetWidth);
  return Math.min(baseColumns, Math.max(1, maxFittingColumns));
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

// Layout recovery function for sidebar state changes
export function recoverLayoutPositions(
  widgets: Array<{ x: number; y: number; w: number; h: number; id: string }>,
  newGridCols: number,
  oldGridCols: number
): Array<{ x: number; y: number; w: number; h: number; id: string }> {
  if (newGridCols === oldGridCols) return widgets;
  
  const recoveredWidgets = [...widgets];
  const scale = newGridCols / oldGridCols;
  
  // Sort by Y position to maintain vertical order
  recoveredWidgets.sort((a, b) => a.y - b.y);
  
  const adjustedWidgets: typeof recoveredWidgets = [];
  
  for (const widget of recoveredWidgets) {
    // Scale position and size
    let newX = Math.round(widget.x * scale);
    let newW = Math.min(Math.max(1, Math.round(widget.w * scale)), newGridCols);
    
    // Ensure widget fits within new grid
    if (newX + newW > newGridCols) {
      newX = Math.max(0, newGridCols - newW);
    }
    
    // Find available position to avoid collisions
    const position = findAvailablePosition(
      adjustedWidgets,
      { w: newW, h: widget.h },
      newGridCols,
      widget.y
    );
    
    adjustedWidgets.push({
      ...widget,
      x: position.x,
      y: position.y,
      w: newW
    });
  }
  
  return adjustedWidgets;
}