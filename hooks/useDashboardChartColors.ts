"use client";

import { useDashboardTheme } from "@/components/theme/DashboardThemeProvider";

export function useDashboardChartColors() {
  const { getThemeStyles } = useDashboardTheme();
  const styles = getThemeStyles();

  // Extract chart colors from theme
  const getChartColors = (): string[] => {
    if (!styles) return [];
    
    const chartColors: string[] = [];
    let index = 1;
    
    // Extract all chart-N colors
    while (styles[`chart-${index}` as keyof typeof styles]) {
      chartColors.push(styles[`chart-${index}` as keyof typeof styles] as string);
      index++;
    }
    
    // Fallback to at least 5 default colors if none found
    if (chartColors.length === 0) {
      return [
        "oklch(0.81 0.10 252)",
        "oklch(0.62 0.19 260)",
        "oklch(0.55 0.22 263)",
        "oklch(0.49 0.22 264)",
        "oklch(0.42 0.18 266)"
      ];
    }
    
    return chartColors;
  };

  // Convert OKLCH to CSS format
  const oklchToCss = (oklch: string): string => {
    // Ensure OKLCH values are properly formatted
    // If it already starts with oklch(, return as is
    if (oklch.startsWith('oklch(')) {
      return oklch;
    }
    // Otherwise, wrap in oklch() function
    return `oklch(${oklch})`;
  };

  // Get color by index with wraparound
  const getColor = (index: number): string => {
    const colors = getChartColors();
    if (colors.length === 0) return "oklch(0.5 0.1 250)"; // Fallback
    return colors[index % colors.length];
  };

  // Get color as CSS string
  const getColorCss = (index: number): string => {
    return oklchToCss(getColor(index));
  };

  // Get array of colors
  const getColors = (count: number): string[] => {
    const colors = getChartColors();
    const result: string[] = [];
    
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    
    return result;
  };

  // Get array of CSS-formatted colors
  const getColorsCss = (count: number): string[] => {
    return getColors(count).map(oklchToCss);
  };

  // Resolve color from widget config
  // This handles both theme references (var(--chart-1)) and direct colors
  const resolveWidgetColor = (color: string | undefined, index: number): string => {
    if (!color) {
      return getColorCss(index);
    }

    // Check if it's a CSS variable reference
    if (color.startsWith("var(--chart-")) {
      const match = color.match(/var\(--chart-(\d+)\)/);
      if (match) {
        const chartIndex = parseInt(match[1]) - 1;
        return getColorCss(chartIndex);
      }
    }

    // Return as-is if it's a direct color value
    return color;
  };

  return {
    getColor,
    getColorCss,
    getColors,
    getColorsCss,
    resolveWidgetColor,
    chartColors: getChartColors(),
  };
}