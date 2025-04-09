// Each item in `data` can have arbitrary string keys

import { ChartConfig } from "@/components/ui/chart";

// (e.g. "month", "desktop", "mobile", etc.).
export interface LineChartDataItem {
  [key: string]: string | number;
}

// Global chart display options
export interface LineChartConfig {
  chartConfig: ChartConfig;
  xAxisConfig?: {
    label: string;
    color: string;
  };
  strokeWidth?: number;
  dot?: boolean;
  tickLine?: boolean;
  axisLine?: boolean;
  tickMargin?: number;
}


// Props for your custom LineChart component
export interface LineChartProps {
  /** The data array you want to plot */
  data: LineChartDataItem[];
  /** The chart configuration for each series (line) */
  config: LineChartConfig;
  /** Which key in `data` should be used as the x-axis label */
}
