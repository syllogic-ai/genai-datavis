"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/types/chart-types";

/**
 * Specialized renderer for pie charts
 */
export function PieChartRenderer({ spec }: { spec: ChartSpec }) {
  if (spec.chartType !== 'pie') {
    console.error(`PieChartRenderer: Expected chart type 'pie', got '${spec.chartType}'`);
    return null;
  }

  if (!spec.data || spec.data.length === 0) {
    console.error("PieChartRenderer: Chart data is empty or undefined");
    return null;
  }

  // Get the value key (first non-label key) and label key
  const labelKey = spec.xAxisConfig?.dataKey || "name";
  const valueKeys = Object.keys(spec.data[0]).filter(key => key !== labelKey);
  const valueKey = valueKeys[0]; // Use first value key for pie chart

  if (!valueKey) {
    console.error("PieChartRenderer: No value key found in data");
    return null;
  }

  // Transform data for pie chart format
  const pieData = spec.data.map((item, index) => ({
    name: item[labelKey],
    value: Number(item[valueKey]),
    fill: spec.chartConfig?.[Object.keys(spec.chartConfig)[index % Object.keys(spec.chartConfig).length]]?.color || `hsl(${index * 45}, 70%, 60%)`
  }));

  const isDonut = spec.pieConfig?.isDonut === true;
  const showLabels = spec.pieConfig?.showLabels === true;
  const showLegend = !spec.hideLegend;

  return (
    <ChartContainer 
      config={spec.chartConfig || {}} 
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
            outerRadius={spec.pieConfig?.outerRadius || 80}
            innerRadius={isDonut ? (spec.pieConfig?.innerRadius || 40) : 0}
            fill="#8884d8"
            dataKey="value"
            stroke={spec.pieConfig?.stroke || "transparent"}
            strokeWidth={spec.pieConfig?.strokeWidth || 0}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          
          <ChartTooltip 
            content={<ChartTooltipContent />} 
          />
          
          {showLegend && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}