"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { TrendingUp } from "lucide-react";
import type { ChartSpec } from "@/types/chart-types";

export function BarChartExample() {
  // Sample data for bar chart
  const chartData = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
  ];

  // ChartSpec for regular multi-bar chart
  const multiBarChartSpec: ChartSpec = {
    chartType: "bar",
    title: "Monthly Device Usage",
    description: "January - June 2024",
    data: chartData,
    chartConfig: {
      desktop: {
        label: "Desktop",
        color: "hsl(var(--chart-1))",
      },
      mobile: {
        label: "Mobile",
        color: "hsl(var(--chart-2))",
      },
    },
    xAxisConfig: {
      dataKey: "month",
      tickLine: false,
      axisLine: false,
      tickMargin: 10,
    },
    barConfig: {
      radius: 4,
      truncateLabels: true,
      maxLabelLength: 3,
      accessibilityLayer: true,
    },
  };

  // ChartSpec for stacked bar chart
  const stackedBarChartSpec: ChartSpec = {
    ...multiBarChartSpec,
    title: "Monthly Device Usage (Stacked)",
    stacked: true,
  };

  return (
    <div className="space-y-8">
      {/* Regular Multi-Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{multiBarChartSpec.title}</CardTitle>
          <CardDescription>{multiBarChartSpec.description}</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ChartRenderer spec={multiBarChartSpec} />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            Showing total visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>

      {/* Stacked Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{stackedBarChartSpec.title}</CardTitle>
          <CardDescription>{stackedBarChartSpec.description}</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ChartRenderer spec={stackedBarChartSpec} />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Total device usage is trending up
          </div>
          <div className="leading-none text-muted-foreground">
            Stacked view shows combined usage patterns
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 