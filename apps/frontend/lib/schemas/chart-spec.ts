import { z } from "zod";
import { ChartType, ChangeDirection } from "@/types/chart-types";

const dataItemSchema = z.record(z.union([z.string(), z.number()]));

const xAxisConfigSchema = z.object({
  dataKey: z.string(),
  dateFormat: z.string().optional(),
  hide: z.boolean().optional(),
  tickLine: z.boolean().optional(),
  axisLine: z.boolean().optional(),
  tickMargin: z.number().optional(),
});

const yAxisConfigSchema = z.object({
  hide: z.boolean().optional(),
  tickLine: z.boolean().optional(),
  axisLine: z.boolean().optional(),
  tickMargin: z.number().optional(),
  tickCount: z.number().optional(),
});

const areaConfigSchema = z.object({
  useGradient: z.boolean().optional(),
  fillOpacity: z.number().optional(),
  accessibilityLayer: z.boolean().optional(),
  gradientStops: z.object({
    topOffset: z.string().optional(),
    bottomOffset: z.string().optional(),
    topOpacity: z.number().optional(),
    bottomOpacity: z.number().optional(),
  }).optional(),
});

const barConfigSchema = z.object({
  radius: z.number().optional(),
  truncateLabels: z.boolean().optional(),
  maxLabelLength: z.number().optional(),
  accessibilityLayer: z.boolean().optional(),
  fillOpacity: z.number().optional(),
  barSize: z.number().optional(),
  barGap: z.number().optional(),
  barCategoryGap: z.number().optional(),
  isHorizontal: z.boolean().optional(),
});

const kpiStylesSchema = z.object({
  valueColor: z.string().optional(),
  labelColor: z.string().optional(),
  subLabelColor: z.string().optional(),
  changePositiveColor: z.string().optional(),
  changeNegativeColor: z.string().optional(),
  changeFlatColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  padding: z.union([z.string(), z.number()]).optional(),
  borderRadius: z.union([z.string(), z.number()]).optional(),
  fontSize: z.object({
    value: z.union([z.string(), z.number()]).optional(),
    label: z.union([z.string(), z.number()]).optional(),
    change: z.union([z.string(), z.number()]).optional(),
  }).optional(),
});

const pieConfigSchema = z.object({
  isDonut: z.boolean().optional(),
  innerRadius: z.number().optional(),
  outerRadius: z.number().optional(),
  showLabels: z.boolean().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
});

const tableConfigSchema = z.object({
  columnLabels: z.record(z.string()).optional(),
  columnFormatters: z.record(z.object({
    type: z.enum(["currency", "number", "percentage"]),
    currency: z.string().optional(),
    decimals: z.number().optional(),
  })).optional(),
  cellAlignment: z.record(z.string()).optional(),
  headerAlignment: z.string().optional(),
  striped: z.boolean().optional(),
  sortBy: z.object({
    column: z.string(),
    direction: z.enum(["asc", "desc"]).optional(),
  }).optional(),
  pagination: z.object({
    page: z.number().optional(),
    pageSize: z.number().optional(),
  }).optional(),
});

export const chartSpecSchema = z.object({
  chartType: z.enum(["line", "bar", "area", "kpi", "pie", "table"] as const),
  title: z.string(),
  description: z.string(),
  data: z.array(dataItemSchema).optional(),
  xAxisConfig: xAxisConfigSchema.optional(),
  yAxisConfig: yAxisConfigSchema.optional(),
  dateFormatTooltip: z.string().optional(),
  lineType: z.enum(["monotone", "step", "bump", "linear", "natural"]).optional(),
  hideLegend: z.boolean().optional(),
  strokeWidth: z.number().optional(),
  dot: z.boolean().optional(),
  stacked: z.boolean().optional(),
  areaConfig: areaConfigSchema.optional(),
  barConfig: barConfigSchema.optional(),
  chartConfig: z.record(z.object({
    label: z.string().optional(),
    color: z.string().optional(),
  })).optional(),
  kpiValue: z.union([z.string(), z.number()]).optional(),
  kpiSuffix: z.string().optional(),
  kpiPrefix: z.string().optional(),
  kpiLabel: z.string().optional(),
  kpiSubLabel: z.string().optional(),
  kpiChange: z.number().optional(),
  kpiChangeDirection: z.enum(["increase", "decrease", "flat"]).optional(),
  kpiChangeFormat: z.string().optional(),
  kpiValueFormat: z.string().optional(),
  kpiStyles: kpiStylesSchema.optional(),
  pieConfig: pieConfigSchema.optional(),
  tableConfig: tableConfigSchema.optional(),
}); 