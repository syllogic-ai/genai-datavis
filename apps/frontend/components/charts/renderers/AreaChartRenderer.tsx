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
  
  // Get area-specific configuration
  const useGradient = spec.areaConfig?.useGradient !== false; // Default to true if not specified
  const defaultFillOpacity = spec.areaConfig?.fillOpacity ?? 0.4;
  const topOpacity = spec.areaConfig?.gradientStops?.topOpacity ?? 0.8;
  const bottomOpacity = spec.areaConfig?.gradientStops?.bottomOpacity ?? 0.1;
  const topOffset = spec.areaConfig?.gradientStops?.topOffset ?? "5%";
  const bottomOffset = spec.areaConfig?.gradientStops?.bottomOffset ?? "95%";
  const accessibilityLayer = spec.areaConfig?.accessibilityLayer ?? false;

  return (
    <ChartContainer 
      config={spec.chartConfig || {}} 
      className="w-full h-full"
    >
      <AreaChart 
        data={sortedData} 
        margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
        accessibilityLayer={accessibilityLayer}
      >
        <defs>
          {useGradient && dataKeys.map((key) => (
            <linearGradient key={`fill${key}`} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset={topOffset}
                stopColor={`var(--color-${key})`}
                stopOpacity={topOpacity}
              />
              <stop
                offset={bottomOffset}
                stopColor={`var(--color-${key})`}
                stopOpacity={bottomOpacity}
              />
            </linearGradient>
          ))}
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
        
        {dataKeys.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type={spec.lineType ?? "monotone"}
            strokeWidth={spec.strokeWidth ?? 2}
            dot={spec.dot ?? false}
            stroke={`var(--color-${key})`}
            fill={useGradient ? `url(#fill${key})` : `var(--color-${key})`}
            fillOpacity={defaultFillOpacity}
            stackId={useStacks ? "a" : undefined}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
} 