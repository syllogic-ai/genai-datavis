// Each item in `data` can have arbitrary string keys

import { ChartConfig } from "@/components/ui/chart";

export interface ChartDataItem {
  title: string;
  description: string;
  chartProps: LineChartProps;
}

// (e.g. "month", "desktop", "mobile", etc.).
export interface LineChartDataItem {
  [key: string]: string | number;
}

// Global chart display options
export interface LineChartConfig {
  chartConfig: ChartConfig;
  xAxisConfig?: {
    dataKey: string;
    dateFormat?: string;
    hide?: boolean;
    tickLine?: boolean;
    axisLine?: boolean;
    tickMargin?: number;
  };
  yAxisConfig?: {
    hide?: boolean;
    tickLine?: boolean;
    axisLine?: boolean;
    tickMargin?: number;
    tickCount?: number;
  };
  dateFormatTooltip?: string;
  lineType?: "monotone" | "step" | "bump" | "linear";
  hideLegend?: boolean;
  strokeWidth?: number;
  dot?: boolean;
}


// Props for your custom LineChart component
export interface LineChartProps {
  /** The data array you want to plot */
  data: LineChartDataItem[];
  /** The chart configuration for each series (line) */
  config: LineChartConfig;
  /** Which key in `data` should be used as the x-axis label */
}
