"use client"

import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis } from "recharts"

import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface LineChartProps {
  data: any[]
  config: ChartConfig
  className?: string
  xAxisKey?: string
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showAxis?: boolean
  lineType?: "linear" | "monotone" | "step" | "stepBefore" | "stepAfter"
  dotSize?: number
  activeDotSize?: number
}

export function LineChart({
  data,
  config,
  className,
  xAxisKey = "name",
  showLegend = true,
  showTooltip = true,
  showGrid = true, 
  showAxis = true,
  lineType = "monotone",
  dotSize = 4,
  activeDotSize = 6,
}: LineChartProps) {
  // Get data keys (excluding the xAxisKey)
  const dataKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== xAxisKey
  )

  return (
    <ChartContainer config={config} className={`min-h-[300px] w-full ${className}`}>
      <RechartsLineChart data={data} accessibilityLayer>
        {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
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
          <Line 
            key={key}
            type={lineType}
            dataKey={key} 
            stroke={`var(--color-${key})`}
            dot={{ r: dotSize, fill: `var(--color-${key})`, strokeWidth: 0 }}
            activeDot={{ r: activeDotSize, fill: `var(--color-${key})`, strokeWidth: 0 }}
            strokeWidth={2}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  )
} 