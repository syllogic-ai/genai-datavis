import { useTheme } from "@/components/theme/ThemeContext";
import { useMemo } from "react";
import { hslToCss } from "@/lib/color-utils";

/**
 * Hook to get chart colors based on user's theme preferences
 * Returns chart colors in both HSL and CSS formats
 */
export function useChartColors() {
  const { chartColors, defaultPalette, isLoading } = useTheme();
  
  // Convert chart colors to an array
  const colorArray = useMemo(() => {
    return Object.entries(chartColors)
      .sort((a, b) => {
        // Sort by chart number
        const numA = parseInt(a[0].replace('chart-', ''));
        const numB = parseInt(b[0].replace('chart-', ''));
        return numA - numB;
      })
      .map(([_, color]) => color);
  }, [chartColors]);
  
  // Get a color by index with wraparound
  const getColor = (index: number): string => {
    return colorArray[index % colorArray.length];
  };
  
  // Get a color in CSS format
  const getColorCss = (index: number): string => {
    return hslToCss(getColor(index));
  };
  
  // Get a set of colors
  const getColors = (count: number): string[] => {
    return Array.from({ length: count }, (_, i) => getColor(i));
  };
  
  // Get a set of colors in CSS format
  const getColorsCss = (count: number): string[] => {
    return Array.from({ length: count }, (_, i) => getColorCss(i));
  };
  
  return {
    colors: colorArray,
    chartColors,
    paletteName: defaultPalette?.name || "Default",
    brandColors: defaultPalette?.brandColors,
    getColor,
    getColorCss,
    getColors,
    getColorsCss,
    isLoading
  };
}