// Grid size mappings
export const sizeToGridMap = {
  xs: { w: 2, h: 1 }, // Rectangular vertical
  s: { w: 2, h: 2 },  // Square small
  m: { w: 4, h: 2 },  // Rectangular horizontal
  l: { w: 4, h: 4 },  // Square large
  xl: { w: 6, h: 4 }, // Extra large
  // Text widget sizes (always full width)
  "text-xs": { w: 12, h: 1 },
  "text-s": { w: 12, h: 2 },
  "text-m": { w: 12, h: 3 },
  "text-l": { w: 12, h: 4 },
  "text-xl": { w: 12, h: 5 },
};

export const gridToSizeMap = {
  "2x1": "xs",
  "2x2": "s", 
  "4x2": "m",
  "4x4": "l",
  "6x4": "xl",
  // Text widget mappings
  "12x1": "text-xs",
  "12x2": "text-s",
  "12x3": "text-m",
  "12x4": "text-l",
  "12x5": "text-xl",
};

export function getGridSizeFromDimensions(w: number, h: number): string {
  const key = `${w}x${h}`;
  return gridToSizeMap[key as keyof typeof gridToSizeMap] || "m";
}

export function getDimensionsFromSize(size: string): { w: number; h: number } {
  return sizeToGridMap[size as keyof typeof sizeToGridMap] || sizeToGridMap.m;
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