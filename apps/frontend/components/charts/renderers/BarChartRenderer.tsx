"use client";

import { BarChart, Bar, XAxis, CartesianGrid, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/types/chart-types";
import moment from "moment";
import { memo } from "react";

/**
 * Specialized renderer for bar charts - memoized to prevent unnecessary re-renders
 */
export const BarChartRenderer = memo(function BarChartRenderer({ spec }: { spec: ChartSpec }) {
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
      <ResponsiveContainer width="100%" height="100%" debounce={100}>
        <BarChart 
          data={spec.data} 
          margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
          accessibilityLayer={false}
          layout={isHorizontal ? "vertical" : "horizontal"}
          barGap={spec.barConfig?.barGap}
          barSize={spec.barConfig?.barSize}
          barCategoryGap={spec.barConfig?.barCategoryGap}
        >
          <CartesianGrid 
            vertical={isHorizontal} 
            horizontal={!isHorizontal} 
          />
          
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
          
          {dataKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={spec.chartConfig?.[key]?.color || '#cccccc'}
              radius={spec.barConfig?.radius ?? 4}
              stackId={useStacks ? "a" : undefined}
              fillOpacity={spec.barConfig?.fillOpacity}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}); 