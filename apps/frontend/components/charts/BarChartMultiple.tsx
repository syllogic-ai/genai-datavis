"use client"

import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Custom label components for better visibility
const CustomXAxisLabel = ({ value, x, y }: { value: string; x: number; y: number }) => {
  return (
    <text
      x={x}
      y={y}
      dy={16}
      fill="currentColor"
      textAnchor="middle"
      fontSize={12}
    >
      {value}
    </text>
  );
};

const CustomYAxisLabel = ({ value, x, y }: { value: string; x: number; y: number }) => {
  return (
    <text
      x={x}
      y={y}
      dx={-16}
      fill="currentColor"
      textAnchor="middle"
      fontSize={12}
      transform={`rotate(-90, ${x}, ${y})`}
    >
      {value}
    </text>
  );
};

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
  xAxisLabel?: string
  yAxisLabel?: string
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
  xAxisLabel,
  yAxisLabel,
}: BarChartMultipleProps) {
  // Get data keys (excluding the xAxisKey)
  const dataKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== xAxisKey
  )

  return (
    <ChartContainer config={config} className={`min-h-[300px] w-full ${className}`}>
      <div className="relative w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart 
            data={data} 
            accessibilityLayer
            margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
          >
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
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={10}
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
                radius={barRadius}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
        
        {/* X-axis label as a separate element */}
        {xAxisLabel && (
          <div className="absolute bottom-0 left-0 right-0 text-center text-sm text-muted-foreground pb-2">
            {xAxisLabel}
          </div>
        )}
        
        {/* Y-axis label as a separate element */}
        {yAxisLabel && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 -rotate-90 text-sm text-muted-foreground whitespace-nowrap">
            {yAxisLabel}
          </div>
        )}
      </div>
    </ChartContainer>
  )
} 