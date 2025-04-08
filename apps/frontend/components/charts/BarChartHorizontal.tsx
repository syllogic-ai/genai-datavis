"use client"

import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"

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
  xAxisLabel,
  yAxisLabel,
}: BarChartHorizontalProps) {
  // Get data keys (excluding the yAxisKey)
  const dataKeys = Object.keys(data[0] || {}).filter(
    (key) => key !== yAxisKey
  )

  return (
    <ChartContainer config={config} className={`min-h-[400px] w-full ${className}`}>
      <div className="relative w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart 
            data={data} 
            layout="vertical" 
            accessibilityLayer
            margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
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