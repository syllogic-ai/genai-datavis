"use client";

import { AreaChart, Area, XAxis, CartesianGrid, YAxis } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/types/chart-types";
import moment from "moment";

/**
 * Specialized renderer for area charts
 */
export function AreaChartRenderer({ spec }: { spec: ChartSpec }) {
  if (spec.chartType !== 'area') {
    console.error(`AreaChartRenderer: Expected chart type 'area', got '${spec.chartType}'`);
    return null;
  }

  if (!spec.data || spec.data.length === 0) {
    console.error("AreaChartRenderer: Chart data is empty or undefined");
    return null;
  }

  const interval = spec.data.length > 10 ? Math.floor(spec.data.length / 10) : 0;

  // Sort data by datetime
  const sortedData = [...spec.data].sort((a, b) => {
    const dateA = new Date(a.datetime as string);
    const dateB = new Date(b.datetime as string);
    return dateA.getTime() - dateB.getTime();
  });

  function formatXAxis(tickItem: string) {
    // If using moment.js
    return moment(tickItem).format(spec.xAxisConfig?.dateFormat ?? "DD-MM-YYYY");
  }

  // Get data keys excluding the x-axis key
  const dataKeys = spec.chartConfig ? 
    Object.keys(spec.chartConfig).filter(key => key !== spec.xAxisConfig?.dataKey) : 
    [];

  // Check if we should use stack mode
  const useStacks = spec.stacked === true;

  return (
    <ChartContainer 
      config={spec.chartConfig || {}} 
      className="w-full h-full"
    >
      <AreaChart 
        data={sortedData} 
        margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
      >
        <defs>
          {dataKeys.map((key) => {
            const color = spec.chartConfig?.[key]?.color || "#10B981";
            return (
              <linearGradient key={`fill${key}`} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={spec.xAxisConfig?.dataKey ?? "datetime"}
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
          const itemConfig = spec.chartConfig?.[key];
          const color = itemConfig?.color || "#10B981";
          const useGradient = true; // Can be made configurable
          
          return (
            <Area
              key={key}
              dataKey={key}
              type={spec.lineType ?? "monotone"}
              strokeWidth={spec.strokeWidth ?? 2}
              dot={spec.dot ?? false}
              stroke={color}
              fill={useGradient ? `url(#fill${key})` : color}
              fillOpacity={useGradient ? 1 : 0.2}
              stackId={useStacks ? "stack" : undefined}
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
} 