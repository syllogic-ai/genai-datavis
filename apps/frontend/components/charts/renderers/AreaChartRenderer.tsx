"use client";

import { AreaChart, Area, XAxis, CartesianGrid, YAxis } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
  ChartConfig,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/types/chart-types";
import moment from "moment";

/**
 * Specialized renderer for area charts
 */
export function AreaChartRenderer({ spec }: { spec: ChartSpec }) {
  console.log("AreaChartRenderer received spec:", JSON.stringify(spec, null, 2));

  if (spec.chartType !== 'area') {
    console.error(`AreaChartRenderer: Expected chart type 'area', got '${spec.chartType}'`);
    return null;
  }

  if (!spec.data || spec.data.length === 0) {
    console.error("AreaChartRenderer: Chart data is empty or undefined");
    return null;
  }

  const interval = spec.data.length > 10 ? Math.floor(spec.data.length / 10) : 0;

  // Sort data by date using the dataKey from xAxisConfig
  const dateKey = spec.xAxisConfig?.dataKey || "date";
  console.log("Using dateKey:", dateKey);
  
  const sortedData = [...spec.data].sort((a, b) => {
    const dateA = new Date(a[dateKey] as string);
    const dateB = new Date(b[dateKey] as string);
    return dateA.getTime() - dateB.getTime();
  });
  console.log("Sorted data:", sortedData);

  function formatXAxis(tickItem: string) {
    // If using moment.js
    return moment(tickItem).format(spec.xAxisConfig?.dateFormat ?? "DD-MM-YYYY");
  }

  // Get data keys excluding the x-axis key
  const dataKeys = Object.keys(sortedData[0] || {}).filter(key => key !== dateKey);
  console.log("Data keys:", dataKeys);

  // Check if we should use stack mode
  const useStacks = spec.stacked === true;
  
  // Get area-specific configuration
  const useGradient = spec.areaConfig?.useGradient !== false; // Default to true if not specified
  const defaultFillOpacity = spec.areaConfig?.fillOpacity ?? 0.4;
  const topOpacity = spec.areaConfig?.gradientStops?.topOpacity ?? 0.8;
  const bottomOpacity = spec.areaConfig?.gradientStops?.bottomOpacity ?? 0.1;
  const topOffset = spec.areaConfig?.gradientStops?.topOffset ?? "5%";
  const bottomOffset = spec.areaConfig?.gradientStops?.bottomOffset ?? "95%";
  const accessibilityLayer = spec.areaConfig?.accessibilityLayer ?? false;

  console.log("Area chart configuration:", {
    useGradient,
    defaultFillOpacity,
    topOpacity,
    bottomOpacity,
    topOffset,
    bottomOffset,
    accessibilityLayer
  });

  // Create config object compatible with ChartContainer
  const chartConfig: ChartConfig = {};
  
  // Add the date key to the config
  chartConfig[dateKey] = {
    label: spec.chartConfig?.[dateKey]?.label || dateKey,
    color: spec.chartConfig?.[dateKey]?.color || "#1f77b4" // Default color
  };
  
  // Add all data series keys to the config
  dataKeys.forEach(key => {
    chartConfig[key] = {
      label: spec.chartConfig?.[key]?.label || key,
      color: spec.chartConfig?.[key]?.color || "#1f77b4" // Default color
    };
  });
  
  console.log("Final chartConfig:", JSON.stringify(chartConfig, null, 2));

  return (
    <ChartContainer 
      config={chartConfig} 
      className="w-full h-full"
    >
      <AreaChart 
        data={sortedData} 
        margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
        accessibilityLayer={accessibilityLayer}
      >
        <defs>
          {useGradient && dataKeys.map((key) => {
            // ChartConfig uses a specific format, so we need to safely extract the color
            const configColor = chartConfig[key]?.color;
            const color = typeof configColor === 'string' ? configColor : "#1f77b4";
            console.log(`Color for key ${key}:`, color);
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
          dataKey={dateKey}
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
          // ChartConfig uses a specific format, so we need to safely extract the color
          const configColor = chartConfig[key]?.color;
          const color = typeof configColor === 'string' ? configColor : "#1f77b4";
          console.log(`Area color for key ${key}:`, color);
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
    </ChartContainer>
  );
} 