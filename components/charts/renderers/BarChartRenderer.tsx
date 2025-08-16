"use client";

import { BarChart, Bar, XAxis, CartesianGrid, YAxis, Cell, LabelList } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/types/chart-types";
import moment from "moment";
import React, { memo } from "react";
import { useThemeGridLines } from "@/hooks/useThemeGridLines";

/**
 * Specialized renderer for bar charts - memoized to prevent unnecessary re-renders
 */
export const BarChartRenderer = memo(function BarChartRenderer({ spec }: { spec: ChartSpec }) {
  // Get theme setting for grid lines - must be called at the top level
  const showGridLines = useThemeGridLines();

  // Check if negative variant is requested (for positive/negative value styling)
  const isNegativeVariant = spec.barConfig?.variant === 'negative';

  // Pre-compute colors for negative variant to avoid repeated DOM access
  // These hooks must be called at the top level, not conditionally
  const positiveColor = React.useMemo(() => {
    if (spec.barConfig?.positiveColor) return spec.barConfig.positiveColor;
    if (typeof window === 'undefined') return 'oklch(0.5682 0.167 135.46)'; // SSR fallback
    const rootStyles = getComputedStyle(document.documentElement);
    const color = rootStyles.getPropertyValue('--chart-positive').trim() || 'oklch(0.5682 0.167 135.46)';
    if (isNegativeVariant) {
      console.log('BarChartRenderer: Positive color resolved to:', color);
    }
    return color;
  }, [spec.barConfig?.positiveColor, isNegativeVariant]);
  
  const negativeColor = React.useMemo(() => {
    if (spec.barConfig?.negativeColor) return spec.barConfig.negativeColor;
    if (typeof window === 'undefined') return 'oklch(0.4149 0.1695 28.96)'; // SSR fallback
    const rootStyles = getComputedStyle(document.documentElement);
    const color = rootStyles.getPropertyValue('--chart-negative').trim() || 'oklch(0.4149 0.1695 28.96)';
    if (isNegativeVariant) {
      console.log('BarChartRenderer: Negative color resolved to:', color);
    }
    return color;
  }, [spec.barConfig?.negativeColor, isNegativeVariant]);

  if (spec.chartType !== 'bar') {
    console.error(`BarChartRenderer: Expected chart type 'bar', got '${spec.chartType}'`);
    return null;
  }

  if (!spec.data || spec.data.length === 0) {
    console.error("BarChartRenderer: Chart data is empty or undefined");
    return null;
  }

  // Get data keys excluding the x-axis key
  const dataKeys = spec.chartConfig ? 
    Object.keys(spec.chartConfig).filter(key => key !== spec.xAxisConfig?.dataKey) : 
    [];

  // Check if we should use stack mode
  const useStacks = spec.stacked === true;
  
  // Check if horizontal layout is requested
  const isHorizontal = spec.barConfig?.isHorizontal === true;
  
  // Debug logging
  if (spec.title?.includes('IRR')) {
    console.log('BarChartRenderer Debug:', {
      title: spec.title,
      variant: spec.barConfig?.variant,
      isNegativeVariant,
      dataKeys,
      sampleData: spec.data?.slice(0, 2)
    });
  }
  
  // Format x-axis ticks if needed (e.g., for dates)
  function formatXAxis(tickItem: string) {
    if (spec.xAxisConfig?.dateFormat) {
      return moment(tickItem).format(spec.xAxisConfig.dateFormat);
    }
    
    // For non-date x-axis, you can truncate long labels
    if (spec.barConfig?.truncateLabels && typeof tickItem === 'string') {
      const maxLength = spec.barConfig.maxLabelLength || 3;
      return tickItem.length > maxLength ? tickItem.slice(0, maxLength) : tickItem;
    }
    
    return tickItem;
  }

  // For horizontal bar charts, we need to:
  // 1. Layout is reversed (bars go horizontally)
  // 2. X and Y axes are swapped in terms of data display
  return (
    <ChartContainer 
      config={spec.chartConfig || {}} 
      className="w-full h-full"
    >
        <BarChart 
          data={spec.data} 
          margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
          accessibilityLayer={false}
          layout={isHorizontal ? "vertical" : "horizontal"}
          barGap={spec.barConfig?.barGap}
          barSize={spec.barConfig?.barSize}
          barCategoryGap={spec.barConfig?.barCategoryGap}
        >
          {showGridLines && (
            <CartesianGrid 
              vertical={isHorizontal} 
              horizontal={!isHorizontal} 
            />
          )}
          
          {/* The X and Y axes are functionally swapped in horizontal mode */}
          <XAxis
            type={isHorizontal ? "number" : "category"}
            dataKey={isHorizontal ? undefined : spec.xAxisConfig?.dataKey || "name"}
            tickLine={spec.xAxisConfig?.tickLine ?? false}
            axisLine={spec.xAxisConfig?.axisLine ?? false}
            tickMargin={spec.xAxisConfig?.tickMargin ?? 10}
            hide={spec.xAxisConfig?.hide ?? false}
            tickFormatter={!isHorizontal ? formatXAxis : undefined}
          />
          
          <YAxis
            type={isHorizontal ? "category" : "number"}
            dataKey={isHorizontal ? spec.xAxisConfig?.dataKey || "name" : undefined}
            tickLine={spec.yAxisConfig?.tickLine ?? false}
            axisLine={spec.yAxisConfig?.axisLine ?? false}
            tickMargin={spec.yAxisConfig?.tickMargin ?? 8}
            tickCount={!isHorizontal ? spec.yAxisConfig?.tickCount ?? 5 : undefined}
            hide={spec.yAxisConfig?.hide ?? false}
            tickFormatter={isHorizontal ? formatXAxis : undefined}
          />
          
          <ChartTooltip 
            cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }} 
            content={<ChartTooltipContent indicator="dashed" />} 
          />
          
          {dataKeys.map((key, index) => {
            // Calculate proper radius for stacked bars
            let barRadius: number | [number, number, number, number] = spec.barConfig?.radius ?? 4;
            
            if (useStacks && dataKeys.length > 1) {
              // For stacked bars, apply radius only to the appropriate corners
              const baseRadius = spec.barConfig?.radius ?? 4;
              if (index === 0) {
                // First (bottom) bar - rounded bottom corners only
                barRadius = isHorizontal ? [0, baseRadius, baseRadius, 0] : [0, 0, baseRadius, baseRadius];
              } else if (index === dataKeys.length - 1) {
                // Last (top) bar - rounded top corners only  
                barRadius = isHorizontal ? [baseRadius, 0, 0, baseRadius] : [baseRadius, baseRadius, 0, 0];
              } else {
                // Middle bars - no rounded corners
                barRadius = [0, 0, 0, 0];
              }
            }
            
            const baseColor = spec.chartConfig?.[key]?.color || '#cccccc';
            
            return (
              <Bar
                key={key}
                dataKey={key}
                fill={!isNegativeVariant ? baseColor : 'transparent'}
                radius={barRadius}
                stackId={useStacks ? "a" : undefined}
                fillOpacity={spec.barConfig?.fillOpacity}
              >
                {/* Handle negative variant with conditional coloring */}
                {isNegativeVariant && spec.data && spec.data.map((item, itemIndex) => {
                  const value = item[key];
                  const isPositive = typeof value === 'number' ? value >= 0 : parseFloat(String(value)) >= 0;
                  const cellColor = isPositive ? positiveColor : negativeColor;
                  
                  console.log(`Cell ${itemIndex}: value=${value}, isPositive=${isPositive}, color=${cellColor}`);
                  
                  return (
                    <Cell
                      key={`cell-${itemIndex}`}
                      fill={cellColor}
                    />
                  );
                })}
                
                {/* Handle labels if requested */}
                {spec.barConfig?.showLabels && (
                  <LabelList
                    position={spec.barConfig?.labelPosition || "top"}
                    dataKey={spec.xAxisConfig?.dataKey || "name"}
                    fillOpacity={1}
                  />
                )}
              </Bar>
            );
          })}
        </BarChart>
    </ChartContainer>
  );
}); 