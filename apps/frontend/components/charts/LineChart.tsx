"use client";

import type { ChartSpec } from "@/types/chart-types";
import { ChartRenderer } from "./ChartRenderer";

/**
 * @deprecated Use ChartRenderer directly with a ChartSpec object where chartType = "line"
 */
export function LineChartComponent({ spec }: { spec: ChartSpec }) {
  // Ensure the chart type is set to line
  const lineChartSpec: ChartSpec = {
    ...spec,
    chartType: "line"
  };

  return <ChartRenderer spec={lineChartSpec} />;
}
