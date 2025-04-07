"use client"

import { Area, AreaChart as RechartsAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface AreaChartProps {
  data: any[]
  config: ChartConfig
  className?: string
  xAxisKey?: string
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showAxis?: boolean
}

export function AreaChart({
  data,
  config,
  className,
  xAxisKey = "name",
  showLegend = true,
  showTooltip = true,
  showGrid = true, 
  showAxis = true,
}: AreaChartProps) {
  // Get data keys (excluding the xAxisKey)
  const dataKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== xAxisKey
  )

  return (
    <ChartContainer config={config} className={`min-h-[300px] w-full ${className}`}>
      <RechartsAreaChart data={data} accessibilityLayer>
        {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
        {showAxis && (
          <>
            <XAxis 
              dataKey={xAxisKey} 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10} 
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={10} />
          </>
        )}
        {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        
        {dataKeys.map((key) => (
          <Area 
            key={key}
            type="monotone"
            dataKey={key} 
            fill={`var(--color-${key})`}
            stroke={`var(--color-${key})`}
            fillOpacity={0.2} 
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  )
} 