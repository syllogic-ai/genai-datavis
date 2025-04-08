"use client"

import { useState } from "react"
import { AreaChart, BarChartHorizontal, BarChartMultiple, LineChart } from "@/components/charts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ChartConfig } from "@/components/ui/chart"
import { ColorPicker } from "@/components/ui/color-picker"

interface ChartConfigCardProps {
  title?: string
  description?: string
  chartType: "line" | "bar" | "area" | "horizontal-bar"
  data: any[]
  config: ChartConfig
  xAxisKey?: string
  yAxisKey?: string
  onConfigChange?: (config: any) => void
  xAxisLabel?: string
  yAxisLabel?: string
}

interface ChartSeriesConfig {
  label: string
  color: string
  theme?: Record<"light" | "dark", string>
}

type SeriesConfig = Record<string, ChartSeriesConfig>

export function ChartConfigCard({
  title = "Chart Configuration",
  description = "Customize the appearance of your chart.",
  chartType,
  data,
  config: initialConfig,
  xAxisKey = "name",
  yAxisKey = "category",
  onConfigChange,
  xAxisLabel: initialXAxisLabel = "X Axis",
  yAxisLabel: initialYAxisLabel = "Y Axis"
}: ChartConfigCardProps) {
  // Configuration state
  const [showGrid, setShowGrid] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showTooltip, setShowTooltip] = useState(true)
  const [showAxis, setShowAxis] = useState(true)
  const [showDots, setShowDots] = useState(chartType === "line")
  const [lineType, setLineType] = useState<"monotone" | "linear" | "step">("monotone")
  const [barRadius, setBarRadius] = useState(4)
  const [barSize, setBarSize] = useState(chartType === "horizontal-bar" ? 30 : 20)
  const [config, setConfig] = useState<SeriesConfig>(initialConfig as SeriesConfig)
  const [xAxisLabel, setXAxisLabel] = useState(initialXAxisLabel)
  const [yAxisLabel, setYAxisLabel] = useState(initialYAxisLabel)
  
  // Current chart configuration
  const chartConfig = {
    showGrid,
    showLegend,
    showTooltip,
    showAxis,
    showDots,
    lineType,
    barRadius,
    barSize,
    xAxisLabel,
    yAxisLabel
  }
  
  // Update color for a specific key in the config
  const updateColor = (key: string, color: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        color
      }
    }))
  }
  
  // Apply changes
  const applyChanges = () => {
    if (onConfigChange) {
      onConfigChange({ ...chartConfig, config })
    }
  }
  
  // Render the appropriate chart type with current config
  const renderChart = () => {
    switch (chartType) {
      case "line":
        return (
          <LineChart 
            data={data} 
            config={config as ChartConfig} 
            xAxisKey={xAxisKey}
            showGrid={showGrid}
            showLegend={showLegend}
            showTooltip={showTooltip}
            showAxis={showAxis}
            lineType={lineType}
            dotSize={showDots ? 4 : 0}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
          />
        )
      case "bar":
        return (
          <BarChartMultiple 
            data={data} 
            config={config as ChartConfig} 
            xAxisKey={xAxisKey}
            showGrid={showGrid}
            showLegend={showLegend}
            showTooltip={showTooltip}
            showAxis={showAxis}
            barRadius={barRadius}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
          />
        )
      case "area":
        return (
          <AreaChart 
            data={data} 
            config={config as ChartConfig} 
            xAxisKey={xAxisKey}
            showGrid={showGrid}
            showLegend={showLegend}
            showTooltip={showTooltip}
            showAxis={showAxis}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
          />
        )
      case "horizontal-bar":
        return (
          <BarChartHorizontal 
            data={data} 
            config={config as ChartConfig} 
            yAxisKey={yAxisKey}
            showGrid={showGrid}
            showLegend={showLegend}
            showTooltip={showTooltip}
            showAxis={showAxis}
            barRadius={barRadius}
            barSize={barSize}
            className="min-h-[400px]"
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
          />
        )
      default:
        return null
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart Preview */}
          <div className="bg-card rounded-lg border p-6 min-h-[400px]">
            <h3 className="text-lg font-medium mb-4">Preview</h3>
            {renderChart()}
          </div>
          
          {/* Configuration Form */}
          <div>
            <h3 className="text-lg font-medium mb-4">Settings</h3>
            <div className="space-y-6">
              {/* Axis Labels */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Axis Labels</h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="xAxisLabel">X-Axis Label</Label>
                    <input
                      id="xAxisLabel"
                      type="text"
                      value={xAxisLabel}
                      onChange={(e) => setXAxisLabel(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="yAxisLabel">Y-Axis Label</Label>
                    <input
                      id="yAxisLabel"
                      type="text"
                      value={yAxisLabel}
                      onChange={(e) => setYAxisLabel(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
              
              {/* Display Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Display Options</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="showGrid" className="flex-1">Show Grid</Label>
                    <Switch
                      checked={showGrid}
                      onCheckedChange={setShowGrid}
                      id="showGrid"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="showLegend" className="flex-1">Show Legend</Label>
                    <Switch
                      checked={showLegend}
                      onCheckedChange={setShowLegend}
                      id="showLegend"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="showTooltip" className="flex-1">Show Tooltip</Label>
                    <Switch
                      checked={showTooltip}
                      onCheckedChange={setShowTooltip}
                      id="showTooltip"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="showAxis" className="flex-1">Show Axis</Label>
                    <Switch
                      checked={showAxis}
                      onCheckedChange={setShowAxis}
                      id="showAxis"
                    />
                  </div>
                </div>
              </div>
              
              {/* Color Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Colors</h4>
                <div className="space-y-3">
                  {Object.entries(config).map(([key, value]) => (
                    <ColorPicker
                      key={key}
                      label={value.label}
                      color={value.color}
                      onChange={(color) => updateColor(key, color)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Chart-specific options */}
              {chartType === "line" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Line Chart Options</h4>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="showDots" className="flex-1">Show Dots</Label>
                    <Switch
                      checked={showDots}
                      onCheckedChange={setShowDots}
                      id="showDots"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lineType">Line Type</Label>
                    <select
                      id="lineType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={lineType}
                      onChange={(e) => setLineType(e.target.value as any)}
                    >
                      <option value="monotone">Monotone</option>
                      <option value="linear">Linear</option>
                      <option value="step">Step</option>
                    </select>
                  </div>
                </div>
              )}
              
              {(chartType === "bar" || chartType === "horizontal-bar") && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Bar Chart Options</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="barRadius">Bar Radius: {barRadius}px</Label>
                    <input 
                      id="barRadius"
                      type="range" 
                      min="0" 
                      max="20" 
                      step="1"
                      value={barRadius}
                      onChange={(e) => setBarRadius(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  {chartType === "horizontal-bar" && (
                    <div className="space-y-2">
                      <Label htmlFor="barSize">Bar Size: {barSize}px</Label>
                      <input 
                        id="barSize"
                        type="range" 
                        min="10" 
                        max="50" 
                        step="1"
                        value={barSize}
                        onChange={(e) => setBarSize(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <Button onClick={applyChanges} className="w-full">
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 