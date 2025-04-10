"use client";

import { LineChart, Line, XAxis, CartesianGrid, YAxis } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/types/chart-types";
import moment from "moment";

/**
 * Specialized renderer for line charts
 */
export function LineChartRenderer({ spec }: { spec: ChartSpec }) {
  if (spec.chartType !== 'line') {
    console.error(`LineChartRenderer: Expected chart type 'line', got '${spec.chartType}'`);
    return null;
  }

  if (!spec.data || spec.data.length === 0) {
    console.error("LineChartRenderer: Chart data is empty or undefined");
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

  return (
    <ChartContainer 
      config={spec.chartConfig || {}} 
      className="w-full h-full"
    >
      <LineChart 
        data={sortedData} 
        margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
      >
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
        <Line
          key={Object.keys(spec.chartConfig || {}).find(key => key !== spec.xAxisConfig?.dataKey)}
          dataKey={Object.keys(spec.chartConfig || {}).find(key => key !== spec.xAxisConfig?.dataKey)}
          type={spec.lineType ?? "monotone"}
          strokeWidth={spec.strokeWidth ?? 2}
          dot={spec.dot ?? false}
          stroke={spec.chartConfig?.consumption?.color || "#10B981"}
        />
      </LineChart>
    </ChartContainer>
  );
} 