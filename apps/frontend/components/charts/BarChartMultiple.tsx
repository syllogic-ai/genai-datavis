"use client"

import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface BarChartMultipleProps {
  data: any[]
  config: ChartConfig
  className?: string
  xAxisKey?: string
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showAxis?: boolean
  barRadius?: number
}

export function BarChartMultiple({
  data,
  config,
  className,
  xAxisKey = "name",
  showLegend = true,
  showTooltip = true,
  showGrid = true, 
  showAxis = true,
  barRadius = 4,
}: BarChartMultipleProps) {
  // Get data keys (excluding the xAxisKey)
  const dataKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== xAxisKey
  )

  return (
    <ChartContainer config={config} className={`min-h-[300px] w-full ${className}`}>
      <RechartsBarChart data={data} accessibilityLayer>
        {showGrid && <CartesianGrid vertical={false} />}
        {showAxis && (
          <>
            <XAxis 
              dataKey={xAxisKey} 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10} 
              tickFormatter={(value) => typeof value === 'string' ? (value.length > 6 ? `${value.slice(0, 6)}...` : value) : value}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={10} />
          </>
        )}
        {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        
        {dataKeys.map((key) => (
          <Bar 
            key={key}
            dataKey={key} 
            fill={`var(--color-${key})`}
            radius={barRadius}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
} 