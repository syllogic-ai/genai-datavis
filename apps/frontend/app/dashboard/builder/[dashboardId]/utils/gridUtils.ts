// Grid size mappings
export const sizeToGridMap = {
  // Charts and Tables - 4×2, 4×4, 6×4, 8×4
  "chart-s": { w: 4, h: 2 },  // Small chart/table
  "chart-m": { w: 4, h: 4 },  // Medium chart/table
  "chart-l": { w: 6, h: 4 },  // Large chart/table
  "chart-xl": { w: 8, h: 4 }, // Extra large chart/table
  
  // KPI Cards - Only 4×2
  "kpi": { w: 4, h: 2 },
  
  // Text blocks - 12×0.5, 12×1, 12×1.5 (using fractional heights)
  "text-xs": { w: 12, h: 1 },   // 12×0.5 → using 1 as minimum
  "text-s": { w: 12, h: 1 },    // 12×1
  "text-m": { w: 12, h: 2 },    // 12×1.5 → using 2 for better visibility
};

export const gridToSizeMap = {
  // Charts and Tables
  "4x2": "chart-s",
  "4x4": "chart-m", 
  "6x4": "chart-l",
  "8x4": "chart-xl",
  
  // Text widgets
  "12x1": "text-s",
  "12x2": "text-m",
};

export function getGridSizeFromDimensions(w: number, h: number, widgetType?: string): string {
  const key = `${w}x${h}`;
  
  // Handle widget type specific mappings
  if (widgetType === 'kpi' && key === "4x2") {
    return "kpi";
  }
  
  if (widgetType === 'text') {
    if (key === "12x1") return "text-s";
    if (key === "12x2") return "text-m";
    return "text-s"; // Default for text
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