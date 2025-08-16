"use client";

import { useMemo } from "react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartSpec } from "@/types/chart-types";

interface RadialChartRendererProps {
  spec: ChartSpec;
}

export function RadialChartRenderer({ spec }: RadialChartRendererProps) {
  const {
    data = [],
    chartConfig = {},
    radialConfig = {},
  } = spec;

  const {
    variant = 'default',
    startAngle = 0,
    endAngle = variant === 'default' ? 250 : 180,
    innerRadius = 80,
    outerRadius = variant === 'default' ? 110 : 130,
    cornerRadius = variant === 'default' ? 10 : 5,
    dataKey,
    stackId = 'a',
    showBackground = variant === 'default',
    centerText,
    gridConfig = {}
  } = radialConfig;

  const {
    gridType = 'circle',
    radialLines = false,
    polarRadius = [86, 74]
  } = gridConfig;

  // Process data based on variant
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (variant === 'default') {
      // For default variant, we expect single value data
      // Find the first non-string numeric field as the primary data key
      const firstItem = data[0];
      const numericKeys = Object.keys(firstItem).filter(key => 
        typeof firstItem[key] === 'number'
      );
      
      const primaryKey = dataKey || numericKeys[0];
      if (!primaryKey) return [];

      return data.map(item => ({
        ...item,
        fill: `var(--color-${primaryKey})` || chartConfig[primaryKey]?.color || "var(--chart-1)"
      }));
    } else {
      // For stacked variant, return data as-is
      return data;
    }
  }, [data, variant, dataKey, chartConfig]);

  // Calculate total for stacked variant
  const totalValue = useMemo(() => {
    if (variant !== 'stacked' || !processedData.length) return 0;
    
    const firstItem = processedData[0];
    return Object.keys(firstItem)
      .filter(key => typeof (firstItem as any)[key] === 'number')
      .reduce((total, key) => total + ((firstItem as any)[key] as number), 0);
  }, [processedData, variant]);

  // Get primary value for default variant
  const primaryValue = useMemo(() => {
    if (variant !== 'default' || !processedData.length) return 0;
    
    const firstItem = processedData[0];
    const numericKeys = Object.keys(firstItem).filter(key => 
      typeof (firstItem as any)[key] === 'number'
    );
    const primaryKey = dataKey || numericKeys[0];
    
    return primaryKey ? ((firstItem as any)[primaryKey] as number) : 0;
  }, [processedData, variant, dataKey]);

  // Render center label content
  const renderCenterLabel = ({ viewBox }: any) => {
    if (!(viewBox && "cx" in viewBox && "cy" in viewBox)) return null;

    const { cx, cy } = viewBox;

    if (variant === 'default') {
      // Default variant - show single value
      const displayValue = centerText?.primary || primaryValue.toLocaleString();
      const displayLabel = centerText?.secondary || (dataKey && chartConfig[dataKey]?.label) || "Value";

      return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
          <tspan
            x={cx}
            y={cy}
            className="fill-foreground text-4xl font-bold"
          >
            {displayValue}
          </tspan>
          <tspan
            x={cx}
            y={cy + 24}
            className="fill-muted-foreground"
          >
            {displayLabel}
          </tspan>
        </text>
      );
    } else {
      // Stacked variant - show total
      const displayValue = centerText?.showTotal !== false 
        ? (centerText?.primary || totalValue.toLocaleString())
        : (centerText?.primary || "");
      const displayLabel = centerText?.secondary || "Total";

      return (
        <text x={cx} y={cy} textAnchor="middle">
          <tspan
            x={cx}
            y={cy - 16}
            className="fill-foreground text-2xl font-bold"
          >
            {displayValue}
          </tspan>
          <tspan
            x={cx}
            y={cy + 4}
            className="fill-muted-foreground"
          >
            {displayLabel}
          </tspan>
        </text>
      );
    }
  };

  if (!processedData.length) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-2xl mb-2">⭕</div>
          <p className="text-sm">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <RadialBarChart
        data={processedData}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
      >
        {variant === 'stacked' && (
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
        )}
        
        {variant === 'default' && (
          <PolarGrid
            gridType={gridType}
            radialLines={radialLines}
            stroke="none"
            className="first:fill-muted last:fill-background"
            polarRadius={polarRadius}
          />
        )}
        
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label content={renderCenterLabel} />
        </PolarRadiusAxis>

        {variant === 'default' ? (
          // Default variant - single RadialBar
          <RadialBar
            dataKey={dataKey || Object.keys(processedData[0]).find(key => typeof (processedData[0] as any)[key] === 'number') || 'value'}
            background={showBackground}
            cornerRadius={cornerRadius}
          />
        ) : (
          // Stacked variant - multiple RadialBars
          Object.keys(chartConfig).map((key, index) => (
            <RadialBar
              key={key}
              dataKey={key}
              stackId={stackId}
              cornerRadius={cornerRadius}
              fill={`var(--color-${key})`}
              className="stroke-transparent stroke-2"
            />
          ))
        )}
      </RadialBarChart>
    </ChartContainer>
  );
}