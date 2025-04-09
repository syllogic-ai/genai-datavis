'use client'

import { LineChartComponent } from "@/components/charts/LineChart";
import { LineChartConfig } from "@/types/line-chart-types";
import { consumptionData } from "@/types/aep_2017_data";
// Mock data for the chart
const chartData = consumptionData;

// Chart configuration
const chartConfig: LineChartConfig = {
  chartConfig: {
    sales: {
      label: "Monthly Sales",
      color: "#4F46E5" // Indigo color
    },
    revenue: {
      label: "Revenue ($)",
      color: "#10B981" // Emerald color
    }
  },
  strokeWidth: 2,
  dot: true,
  tickLine: false,
  axisLine: false,
  tickMargin: 10
};

// Usage somewhere else
export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-12 w-full">
      <LineChartComponent
        data={chartData}
        config={chartConfig}
      />
    </div>
  );
}
