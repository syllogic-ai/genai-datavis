"use client";

import { LineChart, Line, XAxis, CartesianGrid, YAxis } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from "@/components/ui/chart";
import type { LineChartProps } from "@/types/line-chart-types";
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
    return moment(tickItem).format('DD-MM-YYYY')
    }

  return (

        <ChartContainer config={config.chartConfig}>
          <LineChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={"datetime"}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={interval}
              hide={false}
              tickFormatter={formatXAxis}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={3}
              hide={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              key={"consumption"}
              dataKey={"consumption"}
              type="monotone"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
  )
}
