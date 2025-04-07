"use client"

import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface BarChartHorizontalProps {
  data: any[]
  config: ChartConfig
  className?: string
  yAxisKey?: string
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showAxis?: boolean
  barRadius?: number
  barSize?: number
}

export function BarChartHorizontal({
  data,
  config,
  className,
  yAxisKey = "category",
  showLegend = true,
  showTooltip = true,
  showGrid = true, 
  showAxis = true,
  barRadius = 4,
  barSize = 20,
}: BarChartHorizontalProps) {
  // Get data keys (excluding the yAxisKey)
  const dataKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== yAxisKey
  )

  return (
    <ChartContainer config={config} className={`min-h-[400px] w-full ${className}`}>
      <RechartsBarChart 
        data={data} 
        layout="vertical" 
        accessibilityLayer
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        barCategoryGap={8}
      >
        {showGrid && <CartesianGrid horizontal={false} strokeDasharray="3 3" />}
        {showAxis && (
          <>
            <XAxis 
              type="number" 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10} 
            />
            <YAxis 
              type="category"
              dataKey={yAxisKey} 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10} 
              width={100}
              scale="band"
              tickFormatter={(value) => typeof value === 'string' ? (value.length > 15 ? `${value.slice(0, 15)}...` : value) : value}
            />
          </>
        )}
        {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        
        {dataKeys.map((key) => (
          <Bar 
            key={key}
            dataKey={key} 
            fill={`var(--color-${key})`}
            radius={[0, barRadius, barRadius, 0]}
            barSize={barSize}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
} 