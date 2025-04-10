'use client'

import { ChartSpec } from "@/types/chart-types";
import { consumptionData } from "@/types/aep_2017_data";
import { ChartBlock } from "@/components/blocks/ChartBlock";

// Mock data for the chart
const chartData = consumptionData;

// Generate mock data for area charts
const generateMultiSeriesData = (days = 30) => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Generate values with some correlation but different patterns
    const baseValue = Math.sin(i / 5) * 500 + 3000;
    const desktop = Math.round(baseValue + Math.random() * 800);
    const mobile = Math.round(baseValue * 0.6 + Math.random() * 400);
    const tablet = Math.round(baseValue * 0.3 + Math.random() * 200);
    
    data.push({
      datetime: date.toISOString(),
      desktop,
      mobile,
      tablet,
    });
  }
  
  return data;
};

const areaChartData = generateMultiSeriesData();

// Create chart specification using the new unified format
const lineChartSpec: ChartSpec = {
  chartType: "line",
  title: "Line Chart",
  description: "Consumption over time",
  data: chartData,
  chartConfig: {
    datetime: {
      label: "datetime",
      color: "#616A91"
    },
    consumption: {
      label: "Consumption",
      color: "#606889"
    }
  },
  xAxisConfig: {
    dataKey: "datetime",
    dateFormat: "DD-MM-YYYY",
    hide: false,
    tickLine: false,
    axisLine: false,
    tickMargin: 10
  },
  yAxisConfig: {
    hide: false,
    tickLine: false,
    axisLine: false,
    tickMargin: 10,
    tickCount: 4
  },
  dateFormatTooltip: "DD-MM-YYYY",
  lineType: "monotone",
  hideLegend: false,
  strokeWidth: 2,
  dot: false,
};

// Stacked area chart specification
const stackedAreaChartSpec: ChartSpec = {
  chartType: "area",
  title: "Device Usage (Stacked)",
  description: "Website traffic by device type",
  data: areaChartData,
  stacked: true,
  chartConfig: {
    desktop: { 
      color: "#3b82f6", // blue
      label: "Desktop" 
    },
    mobile: { 
      color: "#ef4444", // red
      label: "Mobile" 
    },
    tablet: { 
      color: "#10b981", // green
      label: "Tablet" 
    }
  },
  xAxisConfig: {
    dataKey: "datetime",
    dateFormat: "MMM DD",
    tickLine: false,
    axisLine: false
  },
  yAxisConfig: {
    tickLine: false,
    axisLine: false,
    tickCount: 5
  },
  lineType: "natural",
  dateFormatTooltip: "MMM DD, YYYY",
  dot: false,
  areaConfig: {
    useGradient: true,
    fillOpacity: 0.4,
    accessibilityLayer: true,
    gradientStops: {
      topOffset: "5%",
      bottomOffset: "95%",
      topOpacity: 0.8,
      bottomOpacity: 0.1
    }
  }
};

// Unstacked area chart specification
const unstackedAreaChartSpec: ChartSpec = {
  ...stackedAreaChartSpec,
  title: "Device Usage (Unstacked)",
  stacked: false,
  areaConfig: {
    useGradient: true,
    fillOpacity: 0.4,
    accessibilityLayer: true,
    gradientStops: {
      topOffset: "5%",
      bottomOffset: "95%",
      topOpacity: 0.6,
      bottomOpacity: 0.1
    }
  }
};

// Example KPI cards
const dailyActiveUsersKPI: ChartSpec = {
  chartType: "kpi",
  title: "Daily Active Users",
  description: "Number of users active in the last 24 hours",
  kpiValue: 3450,
  kpiLabel: "Daily active users",
  kpiChange: 0.121,
  kpiChangeDirection: "increase",
  kpiStyles: {
    valueColor: "#111827",
    labelColor: "#6B7280",
    changePositiveColor: "#10B981",
    fontSize: {
      value: "2.5rem"
    }
  }
};

const revenueKPI: ChartSpec = {
  chartType: "kpi",
  title: "Monthly Revenue",
  description: "Total revenue for the current month",
  kpiValue: 42500,
  kpiPrefix: "$",
  kpiLabel: "Monthly revenue",
  kpiSubLabel: "Compared to last month",
  kpiChange: -0.053,
  kpiChangeDirection: "decrease",
  kpiStyles: {
    valueColor: "#1F2937",
    labelColor: "#4B5563",
    changeNegativeColor: "#EF4444",
  }
};

const conversionRateKPI: ChartSpec = {
  chartType: "kpi",
  title: "Conversion Rate",
  description: "Percentage of visitors who make a purchase",
  kpiValue: 5.2,
  kpiSuffix: "%",
  kpiLabel: "Conversion rate",
  kpiSubLabel: "No significant change",
  kpiChange: 0.001,
  kpiChangeDirection: "flat",
  kpiStyles: {
    changeFlatColor: "#9CA3AF",
    borderRadius: "1rem"
  }
};

// Usage somewhere else
export default function Page() {
  return (
    <div className="flex flex-col gap-6 p-12 w-full min-h-[calc(100vh-4rem)] bg-neutral-100">
      <h1 className="text-3xl font-bold mb-4">Chart Examples</h1>
      
      {/* Line Chart */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Line Chart Example</h2>
        <ChartBlock spec={lineChartSpec} />
      </div>
      
      {/* Area Charts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Area Chart Examples</h2>
        <div className="space-y-6">
          <ChartBlock spec={stackedAreaChartSpec} />
          <ChartBlock spec={unstackedAreaChartSpec} />
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">KPI Cards Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartBlock spec={dailyActiveUsersKPI} />
          <ChartBlock spec={revenueKPI} />
          <ChartBlock spec={conversionRateKPI} />
        </div>
      </div>
    </div>
  );
}
