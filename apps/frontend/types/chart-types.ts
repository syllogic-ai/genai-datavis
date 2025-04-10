// Each item in `data` can have arbitrary string keys

import { ChartConfig } from "@/components/ui/chart";

/** General data item type for charts */
export interface DataItem {
  [key: string]: string | number;
}

export type ChartType = "line" | "bar" | "area" | "kpi";

/**
 * Represents the direction of change for KPI metrics
 */
export type ChangeDirection = "increase" | "decrease" | "flat";

/** 
 * A unified interface for all chart types (line, bar, area, KPI, etc.)
 * Only certain fields apply to certain chart types.
 */
export interface ChartSpec {
  /** The high-level visualization type */
  chartType: ChartType;

  /** Optional metadata for display */
  title?: string;
  description?: string;

  /** Data to be plotted if we're dealing with a "chart" type */
  data?: Array<DataItem>;

  /** Global chart configuration from ui/chart components */
  chartConfig?: ChartConfig;

  /**
   * Axis configs if we're dealing with a line/bar/area chart.
   * If chartType === "kpi", these can be ignored in rendering.
   */
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

  /** Formatting for tooltips, etc. (primarily for line/bar/area charts) */
  dateFormatTooltip?: string;

  /** Optional line-specific configs—only meaningful if chartType === "line" or "area" */
  lineType?: "monotone" | "step" | "bump" | "linear";
  hideLegend?: boolean;
  strokeWidth?: number;
  dot?: boolean;
  
  /** Whether to stack elements (for area and bar charts) */
  stacked?: boolean;

  /**
   * KPI-specific fields (only used if chartType === "kpi").
   */
  kpiValue?: string | number;
  kpiSuffix?: string; // For appending units like %, $, etc.
  kpiPrefix?: string; // For prepending symbols like $, €, etc.
  kpiLabel?: string;
  kpiSubLabel?: string; // Secondary label, e.g., "compared to last month"
  kpiChange?: number;
  kpiChangeDirection?: ChangeDirection;
  kpiChangeFormat?: string; // Format for the change value, e.g., "+0.0%"
  kpiValueFormat?: string; // Format for the main value
  
  /** Optional KPI styling options */
  kpiStyles?: {
    valueColor?: string;
    labelColor?: string;
    subLabelColor?: string;
    changePositiveColor?: string;
    changeNegativeColor?: string;
    changeFlatColor?: string;
    backgroundColor?: string;
    padding?: string | number;
    borderRadius?: string | number;
    fontSize?: {
      value?: string | number;
      label?: string | number;
      change?: string | number;
    };
  };
}
