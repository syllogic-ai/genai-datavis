"use client";

import { LineChart, Line, XAxis, CartesianGrid, YAxis } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from "@/components/ui/chart";
import type { LineChartProps } from "@/types/chart-types";
import moment from "moment";

export function LineChartComponent({ data, config }: LineChartProps) {
  const interval = data.length > 10 ? Math.floor(data.length / 10) : 0;

  // Sort data by datetime
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.datetime as string);
    const dateB = new Date(b.datetime as string);
    return dateA.getTime() - dateB.getTime();
  });

  // Use sortedData instead of data for the chart
  data = sortedData;

  function formatXAxis(tickItem: string) {
    // If using moment.js
    return moment(tickItem).format(config.xAxisConfig?.dateFormat ? config.xAxisConfig.dateFormat : "DD-MM-YYYY");
  }

  return (
    <ChartContainer 
      config={config.chartConfig} 
      className="w-full h-full"
    >
      <LineChart 
        data={data} 
        margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={config.xAxisConfig?.dataKey ? config.xAxisConfig.dataKey : "datetime"}
          tickLine={config.xAxisConfig?.tickLine ? config.xAxisConfig.tickLine : false}
          axisLine={config.xAxisConfig?.axisLine ? config.xAxisConfig.axisLine : false}
          tickMargin={config.xAxisConfig?.tickMargin ? config.xAxisConfig.tickMargin : 8}
          interval={interval}
          hide={config.xAxisConfig?.hide ? config.xAxisConfig.hide : false}
          tickFormatter={formatXAxis}
        />
        <YAxis
          tickLine={config.yAxisConfig?.tickLine ? config.yAxisConfig.tickLine : false}
          axisLine={config.yAxisConfig?.axisLine ? config.yAxisConfig.axisLine : false}
          tickMargin={config.yAxisConfig?.tickMargin ? config.yAxisConfig.tickMargin : 8}
          tickCount={config.yAxisConfig?.tickCount ? config.yAxisConfig.tickCount : 10}
          hide={config.yAxisConfig?.hide ? config.yAxisConfig.hide : false}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line
          key={"consumption"}
          dataKey={"consumption"}
          type={config.lineType ? config.lineType : "monotone"}
          strokeWidth={config.strokeWidth ? config.strokeWidth : 2}
          dot={config.dot ? config.dot : false}
          stroke={config.chartConfig?.consumption?.color || "#10B981"}
        />
      </LineChart>
    </ChartContainer>
  );
}
