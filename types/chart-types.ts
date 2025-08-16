// Each item in `data` can have arbitrary string keys

import { ChartConfig } from "@/components/ui/chart";

/** General data item type for charts */
export interface DataItem {
  [key: string]: string | number; // { category: "Product A", revenue: 4200, cost: 2100, profit: 2100 } OR { datetime: "2024-01-01", desktop: 1000, mobile: 500, tablet: 200 }
}

export type ChartType = "line" | "bar" | "area" | "kpi" | "pie" | "table" | "radial";

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
  title: string;
  description: string;

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
  lineType?: "monotone" | "step" | "bump" | "linear" | "natural";
  hideLegend?: boolean;
  strokeWidth?: number;
  dot?: boolean;
  
  /** Whether to stack elements (for area and bar charts) */
  stacked?: boolean;
  
  /** Area-specific configuration properties */
  areaConfig?: {
    /** Whether to use gradient fills instead of solid colors */
    useGradient?: boolean;
    /** Default fill opacity for areas */
    fillOpacity?: number;
    /** Add accessibility layer */
    accessibilityLayer?: boolean;
    /** Gradient color stop configurations */
    gradientStops?: {
      topOffset?: string;
      bottomOffset?: string;
      topOpacity?: number;
      bottomOpacity?: number;
    };
  };

  /** Bar-specific configuration properties */
  barConfig?: {
    /** Border radius for bar corners */
    radius?: number;
    /** Whether to truncate long labels in x-axis */
    truncateLabels?: boolean;
    /** Maximum label length if truncating */
    maxLabelLength?: number;
    /** Whether to add accessibility layer to the chart */
    accessibilityLayer?: boolean;
    /** Custom fill opacity for bars */
    fillOpacity?: number;
    /** Custom bar padding */
    barSize?: number;
    /** Gap between bars in a group */
    barGap?: number;
    /** Gap between bar groups */
    barCategoryGap?: number;
    /** Whether to display the bar chart horizontally */
    isHorizontal?: boolean;
    /** Bar chart variant - negative allows different colors for positive/negative values */
    variant?: 'default' | 'negative';
    /** Color for negative values when using negative variant */
    negativeColor?: string;
    /** Color for positive values when using negative variant */
    positiveColor?: string;
    /** Whether to show labels on bars */
    showLabels?: boolean;
    /** Position of labels when shown */
    labelPosition?: 'top' | 'center' | 'bottom';
  };

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

  /** Pie-specific configuration properties */
  pieConfig?: {
    /** Whether to render as donut chart (with inner radius) */
    isDonut?: boolean;
    /** Inner radius for donut charts */
    innerRadius?: number;
    /** Outer radius of the pie chart */
    outerRadius?: number;
    /** Whether to show labels on pie slices */
    showLabels?: boolean;
    /** Stroke color around pie slices */
    stroke?: string;
    /** Stroke width around pie slices */
    strokeWidth?: number;
  };

  /** Table-specific configuration properties */
  tableConfig?: {
    /** Custom column labels */
    columnLabels?: { [key: string]: string };
    /** Column formatters */
    columnFormatters?: { 
      [key: string]: {
        type: 'currency' | 'number' | 'percentage';
        currency?: string;
        decimals?: number;
      }
    };
    /** Cell alignment per column */
    cellAlignment?: { [key: string]: string };
    /** Header row alignment */
    headerAlignment?: string;
    /** Whether to show striped rows */
    striped?: boolean;
    /** Sorting configuration */
    sortBy?: {
      column: string;
      direction?: 'asc' | 'desc';
    };
    /** Pagination configuration */
    pagination?: {
      page?: number;
      pageSize?: number;
    };
  };

  /** Radial-specific configuration properties */
  radialConfig?: {
    /** Variant of radial chart - default (single value) or stacked (multiple values) */
    variant?: 'default' | 'stacked';
    /** Start angle in degrees */
    startAngle?: number;
    /** End angle in degrees */
    endAngle?: number;
    /** Inner radius of the radial chart */
    innerRadius?: number;
    /** Outer radius of the radial chart */
    outerRadius?: number;
    /** Corner radius for bars */
    cornerRadius?: number;
    /** Data key for the main value (for default variant) */
    dataKey?: string;
    /** Stack ID for stacked variant */
    stackId?: string;
    /** Whether to show background for radial bars */
    showBackground?: boolean;
    /** Text to display in the center */
    centerText?: {
      /** Primary text (usually the value) */
      primary?: string;
      /** Secondary text (usually the label) */
      secondary?: string;
      /** Whether to show total for stacked variant */
      showTotal?: boolean;
    };
    /** Grid configuration */
    gridConfig?: {
      /** Grid type */
      gridType?: 'circle' | 'polygon';
      /** Whether to show radial lines */
      radialLines?: boolean;
      /** Polar radius values for grid circles */
      polarRadius?: number[];
    };
  };
}
