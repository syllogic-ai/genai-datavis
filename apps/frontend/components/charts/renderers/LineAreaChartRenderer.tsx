"use client";

import { AreaChart, Area, LineChart, Line, XAxis, CartesianGrid, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
  ChartConfig,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/types/chart-types";
import moment from "moment";
import { memo } from "react";

/**
 * Unified renderer for area and line charts - memoized to prevent unnecessary re-renders
 */
export const UnifiedChartRenderer = memo(function UnifiedChartRenderer({ spec }: { spec: ChartSpec }) {
  console.log(`UnifiedChartRenderer received spec for ${spec.chartType} chart:`, JSON.stringify(spec, null, 2));

  if (spec.chartType !== 'area' && spec.chartType !== 'line') {
    console.error(`UnifiedChartRenderer: Expected chart type 'area' or 'line', got '${spec.chartType}'`);
    return null;
  }

  if (!spec.data || spec.data.length === 0) {
    console.error("UnifiedChartRenderer: Chart data is empty or undefined");
    return null;
  }

  const interval = spec.data.length > 10 ? Math.floor(spec.data.length / 3) : 0;

  // Use the x-axis data key
  const xAxisKey = spec.xAxisConfig?.dataKey || "name";
  console.log("Using xAxisKey:", xAxisKey);
  
  // Check if x-axis values are dates and sort accordingly
  const isDateAxis = spec.data.length > 0 && spec.data.some(item => {
    const value = item[xAxisKey];
    if (!value) return false;
    
    // Check if it's a valid date
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toString() !== 'Invalid Date';
  });

  console.log("Is x-axis date:", isDateAxis);
  
  // Sort data based on whether it's a date or string
  const sortedData = [...spec.data].sort((a, b) => {
    const valueA = a[xAxisKey];
    const valueB = b[xAxisKey];
    
    if (!valueA || !valueB) return 0;
    
    if (isDateAxis) {
      // Sort as dates
      const dateA = new Date(valueA);
      const dateB = new Date(valueB);
      return dateA.getTime() - dateB.getTime();
    } else {
      // Sort as strings
      return String(valueA).localeCompare(String(valueB));
    }
  });

  function formatXAxis(tickItem: string) {
    // Only format as date if explicitly configured or if we detected it's a date
    if (spec.xAxisConfig?.dateFormat) {
      return moment(tickItem).format(spec.xAxisConfig.dateFormat);
    }
    
    // If we detected it's a date but no format specified, use default
    if (isDateAxis) {
      return moment(tickItem).format("DD-MM-YYYY");
    }
    
    // For non-date values, return as is
    return tickItem;
  }

  // Get data keys excluding the x-axis key
  const dataKeys = Object.keys(sortedData[0] || {}).filter(key => key !== xAxisKey);
  
  // For line charts with single series, use the first non-x-axis key
  const singleDataKey = dataKeys.length > 0 ? dataKeys[0] : "";
  
  // Check if we should use stack mode (only applicable for area charts)
  const useStacks = spec.chartType === 'area' && spec.stacked === true;
  
  // Get area-specific configuration
  const useGradient = spec.areaConfig?.useGradient !== false; // Default to true if not specified
  const defaultFillOpacity = spec.areaConfig?.fillOpacity ?? 0.4;
  const topOpacity = spec.areaConfig?.gradientStops?.topOpacity ?? 0.8;
  const bottomOpacity = spec.areaConfig?.gradientStops?.bottomOpacity ?? 0.1;
  const topOffset = spec.areaConfig?.gradientStops?.topOffset ?? "5%";
  const bottomOffset = spec.areaConfig?.gradientStops?.bottomOffset ?? "95%";
  
  // Explicitly disable accessibility layer to prevent errors
  const accessibilityLayer = false;

  // Create config object compatible with ChartContainer
  const chartConfig: ChartConfig = spec.chartConfig || {};
  
  // Add the x-axis key to the config if not already present
  if (!chartConfig[xAxisKey]) {
    chartConfig[xAxisKey] = {
      label: xAxisKey,
      color: "#1f77b4" // Default color
    };
  }
  
  // Add all data series keys to the config if not already present
  dataKeys.forEach(key => {
    if (!chartConfig[key]) {
      chartConfig[key] = {
        label: key,
        color: "#1f77b4" // Default color
      };
    }
  });

  // Common chart props
  const commonProps = {
    data: sortedData,
    margin: { left: 12, right: 12, top: 10, bottom: 10 },
    accessibilityLayer: accessibilityLayer
  };

  return (
    <ChartContainer 
      config={chartConfig} 
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%" debounce={100}>
        {spec.chartType === 'area' ? (
          <AreaChart {...commonProps}>
            <defs>
              {useGradient && dataKeys.map((key) => {
                const configColor = chartConfig[key]?.color;
                const color = typeof configColor === 'string' ? configColor : "#1f77b4";
                return (
                  <linearGradient key={`fill${key}`} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset={topOffset}
                      stopColor={color}
                      stopOpacity={topOpacity}
                    />
                    <stop
                      offset={bottomOffset}
                      stopColor={color}
                      stopOpacity={bottomOpacity}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={spec.xAxisConfig?.tickLine ?? false}
              axisLine={spec.xAxisConfig?.axisLine ?? false}
              tickMargin={spec.xAxisConfig?.tickMargin ?? 8}
              interval={interval}
              hide={spec.xAxisConfig?.hide ?? false}
              tickFormatter={formatXAxis}
            />
            <YAxis
              tickLine={spec.yAxisConfig?.tickLine ?? false}
              axisLine={spec.yAxisConfig?.axisLine ?? false}
              tickMargin={spec.yAxisConfig?.tickMargin ?? 8}
              tickCount={spec.yAxisConfig?.tickCount ?? 10}
              hide={spec.yAxisConfig?.hide ?? false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            
            {dataKeys.map((key) => {
              const configColor = chartConfig[key]?.color;
              const color = typeof configColor === 'string' ? configColor : "#1f77b4";
              return (
                <Area
                  key={key}
                  dataKey={key}
                  type={spec.lineType ?? "monotone"}
                  strokeWidth={spec.strokeWidth ?? 2}
                  dot={spec.dot ?? false}
                  stroke={color}
                  fill={useGradient ? `url(#fill${key})` : color}
                  fillOpacity={defaultFillOpacity}
                  stackId={useStacks ? "a" : undefined}
                />
              );
            })}
          </AreaChart>
        ) : (
          <LineChart {...commonProps}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={spec.xAxisConfig?.tickLine ?? false}
              axisLine={spec.xAxisConfig?.axisLine ?? false}
              tickMargin={spec.xAxisConfig?.tickMargin ?? 8}
              interval={interval}
              hide={spec.xAxisConfig?.hide ?? false}
              tickFormatter={formatXAxis}
            />
            <YAxis
              tickLine={spec.yAxisConfig?.tickLine ?? false}
              axisLine={spec.yAxisConfig?.axisLine ?? false}
              tickMargin={spec.yAxisConfig?.tickMargin ?? 8}
              tickCount={spec.yAxisConfig?.tickCount ?? 10}
              hide={spec.yAxisConfig?.hide ?? false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            
            {dataKeys.map((key) => {
              const configColor = chartConfig[key]?.color;
              const color = typeof configColor === 'string' ? configColor : (spec.chartConfig?.consumption?.color || "#10B981");
              return (
                <Line
                  key={key}
                  dataKey={key}
                  type={spec.lineType ?? "monotone"}
                  strokeWidth={spec.strokeWidth ?? 2}
                  dot={spec.dot ?? false}
                  stroke={color}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
});

/**
 * Specialized renderer for area charts - maintained for backwards compatibility
 */
export function AreaChartRenderer({ spec }: { spec: ChartSpec }) {
  return <UnifiedChartRenderer spec={spec} />;
}

/**
 * Specialized renderer for line charts - maintained for backwards compatibility
 */
export function LineChartRenderer({ spec }: { spec: ChartSpec }) {
  return <UnifiedChartRenderer spec={spec} />;
} 