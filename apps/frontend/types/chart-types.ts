// Each item in `data` can have arbitrary string keys

import { ChartConfig } from "@/components/ui/chart";

/** General data item type for charts */
export interface DataItem {
  [key: string]: string | number;
}

export type ChartType = "line" | "bar" | "area" | "kpi";

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
   * Series configuration (maps data keys to visual properties)
   * For example: { "consumption": { color: "#10B981" } }
   */
  seriesConfig?: Record<string, {
    color?: string;
    [key: string]: any;
  }>;

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

  /**
   * KPI-specific fields (only used if chartType === "kpi").
   */
  kpiValue?: string | number;
  kpiLabel?: string;
  kpiChange?: number;
  kpiChangeDirection?: "increase" | "decrease" | "flat";
}
