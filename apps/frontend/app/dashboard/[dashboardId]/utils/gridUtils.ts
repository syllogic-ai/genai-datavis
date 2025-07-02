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

// Responsive size mappings for different breakpoints
export const responsiveSizeMap = {
  lg: { // ≥1200px - 12 columns
    "chart-s": { w: 4, h: 2 },
    "chart-m": { w: 4, h: 4 },
    "chart-l": { w: 6, h: 4 },
    "chart-xl": { w: 8, h: 4 },
    "kpi": { w: 4, h: 2 },
    "text-xs": { w: 12, h: 1 },
    "text-s": { w: 12, h: 2 }
  },
  md: { // ≥996px - 8 columns
    "chart-s": { w: 4, h: 2 },
    "chart-m": { w: 4, h: 4 },
    "chart-l": { w: 4, h: 4 }, // Reduced from 6 to 4
    "chart-xl": { w: 8, h: 4 },
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

// Get responsive dimensions for a size at a specific breakpoint
export function getResponsiveDimensions(size: string, breakpoint: string): { w: number; h: number } {
  const breakpointMap = responsiveSizeMap[breakpoint as keyof typeof responsiveSizeMap];
  if (!breakpointMap) {
    return getDimensionsFromSize(size);
  }
  
  return breakpointMap[size as keyof typeof breakpointMap] || breakpointMap["chart-s"];
}

// Convert widget size to work with current breakpoint
export function adaptSizeToBreakpoint(size: string, breakpoint: string, widgetType: string): string {
  // Text widgets always span full width at their breakpoint
  if (widgetType === 'text') {
    return size; // Text widgets handle their own responsive behavior
  }
  
  // For other widgets, return the size as-is (dimensions will be calculated responsively)
  return size;
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

// Find next available position for a widget
export function findAvailablePosition(
  existingWidgets: Array<{ x: number; y: number; w: number; h: number }>,
  newWidget: { w: number; h: number },
  gridCols: number = 12
): { x: number; y: number } {
  // Try to find an empty spot
  for (let y = 0; y < 20; y++) {
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
    : 0;
  return { x: 0, y: maxY };
}