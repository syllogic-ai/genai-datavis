"use client"

import { CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

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
  xAxisLabel?: string
  yAxisLabel?: string
}

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
  xAxisLabel,
  yAxisLabel,
}: LineChartProps) {
  const dataKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== xAxisKey
  )

  return (
    <ChartContainer config={config} className={`min-h-[300px] w-full ${className}`}>
      <div className="relative w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart 
            data={data} 
            accessibilityLayer
            margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
          >
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