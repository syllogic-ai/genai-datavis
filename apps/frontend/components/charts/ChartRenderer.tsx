"use client";

import { ChartSpec } from "@/types/chart-types";
import { LineChartRenderer } from "@/components/charts/renderers/LineChartRenderer";

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
      // To be implemented
      console.warn("Area charts not yet implemented");
      return <div>Area Chart (Not yet implemented)</div>;
    case "kpi":
      // To be implemented
      console.warn("KPI charts not yet implemented");
      return <div>KPI Display (Not yet implemented)</div>;
    default:
      console.error(`Unknown chart type: ${spec.chartType}`);
      return null;
  }
} 