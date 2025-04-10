'use client'

import { LineChartComponent } from "@/components/charts/LineChart";
import { ChartSpec } from "@/types/chart-types";
import { consumptionData } from "@/types/aep_2017_data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LineChartBlock from "@/components/blocks/lineChart-block";

// Mock data for the chart
const chartData = consumptionData;

// Create chart specification using the new unified format
const lineChartSpec: ChartSpec = {
  chartType: "line",
  title: "Line Chart",
  description: "Consumption over time",
  data: chartData,
  chartConfig: {
    datetime: {
      label: "datetime",
      color: "#616A91"
    },
    consumption: {
      label: "Consumption",
      color: "#606889"
    }
  },
  xAxisConfig: {
    dataKey: "datetime",
    dateFormat: "DD-MM-YYYY",
    hide: false,
    tickLine: false,
    axisLine: false,
    tickMargin: 10
  },
  yAxisConfig: {
    hide: false,
    tickLine: false,
    axisLine: false,
    tickMargin: 10,
    tickCount: 4
  },
  dateFormatTooltip: "DD-MM-YYYY",
  lineType: "monotone",
  hideLegend: false,
  strokeWidth: 2,
  dot: false,
};

// Usage somewhere else
export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-12 w-full h-[calc(100vh-4rem)] bg-neutral-100">
      <LineChartBlock cardData={lineChartSpec} />
    </div>
  );
}
