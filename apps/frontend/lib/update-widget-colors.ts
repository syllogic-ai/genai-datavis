/**
 * Utility to update existing widgets to use theme color references
 * instead of hardcoded hex colors
 */

export function convertHexToThemeReference(hexColor: string): string {
  // Common color mappings from default palette
  const colorMappings: Record<string, string> = {
    '#3b82f6': 'var(--chart-1)', // Blue
    '#ef4444': 'var(--chart-2)', // Red
    '#10b981': 'var(--chart-3)', // Green
    '#f59e0b': 'var(--chart-4)', // Yellow/Orange
    '#8b5cf6': 'var(--chart-5)', // Purple
    '#ec4899': 'var(--chart-1)', // Pink -> cycle back to chart-1
    '#06b6d4': 'var(--chart-2)', // Cyan -> chart-2
    '#14b8a6': 'var(--chart-3)', // Teal -> chart-3
    '#f97316': 'var(--chart-4)', // Orange -> chart-4
    '#6366f1': 'var(--chart-5)', // Indigo -> chart-5
  };

  // Check if it's already a theme reference
  if (hexColor.startsWith('var(--chart-')) {
    return hexColor;
  }

  // Try to map the hex color to a theme reference
  const lowercaseHex = hexColor.toLowerCase();
  if (colorMappings[lowercaseHex]) {
    return colorMappings[lowercaseHex];
  }

  // If no mapping found, assign based on some logic
  // For now, just cycle through chart colors
  const hashCode = hexColor.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const chartIndex = (Math.abs(hashCode) % 5) + 1;
  return `var(--chart-${chartIndex})`;
}

export function updateWidgetChartConfig(chartConfig: any): any {
  if (!chartConfig) return chartConfig;

  const updatedConfig: any = {};
  
  Object.entries(chartConfig).forEach(([key, config]: [string, any]) => {
    updatedConfig[key] = {
      ...config,
      color: config.color ? convertHexToThemeReference(config.color) : 'var(--chart-1)'
    };
  });

  return updatedConfig;
}