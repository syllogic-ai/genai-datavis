"use client"

import { useState } from "react"
import { AreaChart, BarChartHorizontal, BarChartMultiple, ChartConfigCard, LineChart } from "@/components/charts"
import { ChartConfig } from "@/components/ui/chart"

// Sample data for charts
const monthlyData = [
  { month: "January", desktop: 186, mobile: 80, tablet: 120 },
  { month: "February", desktop: 305, mobile: 200, tablet: 150 },
  { month: "March", desktop: 237, mobile: 120, tablet: 190 },
  { month: "April", desktop: 173, mobile: 190, tablet: 95 },
  { month: "May", desktop: 209, mobile: 130, tablet: 210 },
  { month: "June", desktop: 214, mobile: 240, tablet: 180 },
]

const categoryData = [
  { category: "Product A", revenue: 8400, cost: 5600 },
  { category: "Product B", revenue: 6700, cost: 4100 },
  { category: "Product C", revenue: 5200, cost: 3800 },
  { category: "Product D", revenue: 7800, cost: 4900 },
  { category: "Product E", revenue: 4300, cost: 2100 },
]

// Initial chart configurations
const initialDeviceConfig: ChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)"
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)"
  },
  tablet: {
    label: "Tablet",
    color: "var(--chart-3)"
  }
}

const initialProductConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)"
  },
  cost: {
    label: "Cost",
    color: "var(--chart-4)"
  }
}

export default function ChartTest() {
  // State for chart configurations
  const [deviceConfig, setDeviceConfig] = useState<ChartConfig>(initialDeviceConfig)
  const [productConfig, setProductConfig] = useState<ChartConfig>(initialProductConfig)
  const [lineChartOptions, setLineChartOptions] = useState({
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showAxis: true,
    showDots: true,
    lineType: "monotone" as const,
  })
  const [barChartOptions, setBarChartOptions] = useState({
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showAxis: true,
    barRadius: 4,
    barSize: 30,
  })

  // Handle configuration changes
  const handleLineChartConfigChange = (newConfig: any) => {
    setDeviceConfig(newConfig.config)
    setLineChartOptions({
      showGrid: newConfig.showGrid,
      showLegend: newConfig.showLegend,
      showTooltip: newConfig.showTooltip,
      showAxis: newConfig.showAxis,
      showDots: newConfig.showDots,
      lineType: newConfig.lineType,
    })
  }

  const handleBarChartConfigChange = (newConfig: any) => {
    setProductConfig(newConfig.config)
    setBarChartOptions({
      showGrid: newConfig.showGrid,
      showLegend: newConfig.showLegend,
      showTooltip: newConfig.showTooltip,
      showAxis: newConfig.showAxis,
      barRadius: newConfig.barRadius,
      barSize: newConfig.barSize,
    })
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Chart Components Test</h1>
      
      <div className="space-y-12">
        {/* Line Chart */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Line Chart</h2>
          <div className="p-6 bg-card rounded-lg border">
            <LineChart 
              data={monthlyData} 
              config={deviceConfig} 
              xAxisKey="month"
              {...lineChartOptions}
            />
          </div>
        </section>
        
        {/* Bar Chart Multiple */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Bar Chart Multiple</h2>
          <div className="p-6 bg-card rounded-lg border">
            <BarChartMultiple 
              data={monthlyData} 
              config={deviceConfig} 
              xAxisKey="month"
              showGrid={lineChartOptions.showGrid}
              showLegend={lineChartOptions.showLegend}
              showTooltip={lineChartOptions.showTooltip}
              showAxis={lineChartOptions.showAxis}
              barRadius={barChartOptions.barRadius}
            />
          </div>
        </section>
        
        {/* Area Chart */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Area Chart</h2>
          <div className="p-6 bg-card rounded-lg border">
            <AreaChart 
              data={monthlyData} 
              config={deviceConfig} 
              xAxisKey="month"
              showGrid={lineChartOptions.showGrid}
              showLegend={lineChartOptions.showLegend}
              showTooltip={lineChartOptions.showTooltip}
              showAxis={lineChartOptions.showAxis}
            />
          </div>
        </section>
        
        {/* Horizontal Bar Chart */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Horizontal Bar Chart</h2>
          <div className="p-6 bg-card rounded-lg border">
            <BarChartHorizontal 
              data={categoryData} 
              config={productConfig} 
              yAxisKey="category"
              {...barChartOptions}
              className="min-h-[500px]"
            />
          </div>
        </section>
        
        {/* Chart Configuration Cards */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold">Chart Configuration Examples</h2>
          
          <div className="space-y-12">
            {/* Line Chart Config */}
            <ChartConfigCard
              title="Line Chart Configuration"
              description="Customize the line chart appearance"
              chartType="line"
              data={monthlyData}
              config={deviceConfig}
              xAxisKey="month"
              onConfigChange={handleLineChartConfigChange}
            />
            
            {/* Horizontal Bar Chart Config */}
            <ChartConfigCard
              title="Horizontal Bar Chart Configuration"
              description="Customize the horizontal bar chart appearance"
              chartType="horizontal-bar"
              data={categoryData}
              config={productConfig}
              yAxisKey="category"
              onConfigChange={handleBarChartConfigChange}
            />
          </div>
        </section>
      </div>
    </main>
  )
} 