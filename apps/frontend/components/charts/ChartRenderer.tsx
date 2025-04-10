"use client";

import { ChartSpec } from "@/types/chart-types";
import { LineChartRenderer } from "@/components/charts/renderers/LineChartRenderer";
import { AreaChartRenderer } from "@/components/charts/renderers/AreaChartRenderer";
import { KPIRenderer } from "@/components/charts/renderers/KPIRenderer";

/**
 * Unified chart renderer that determines which chart component to render
 * based on the provided ChartSpec.
 */
export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  if (!spec) {
    console.error("ChartRenderer: Missing chart specification");
    return null;
  }

  if (!spec.data && spec.chartType !== 'kpi') {
    console.error("ChartRenderer: Chart data is empty or undefined");
    return null;
  }

  switch (spec.chartType) {
    case "line":
      return <LineChartRenderer spec={spec} />;
    case "bar":
      // To be implemented
      console.warn("Bar charts not yet implemented");
      return <div>Bar Chart (Not yet implemented)</div>;
    case "area":
      return <AreaChartRenderer spec={spec} />;
    case "kpi":
      return <KPIRenderer spec={spec} />;
    default:
      console.error(`Unknown chart type: ${spec.chartType}`);
      return null;
  }
} 