"use client";

import { useState, useMemo } from "react";
import { Widget } from "@/types/enhanced-dashboard-types";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { ChartSpec } from "@/types/chart-types";
import { useDashboardChartColors } from "@/hooks/useDashboardChartColors";
import { convertHexToThemeReference } from "@/lib/update-widget-colors";

interface ChartWidgetProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function ChartWidget({ widget, onUpdate, isEditing, onEditToggle }: ChartWidgetProps) {
  const [title, setTitle] = useState(widget.config.title || "New Chart");
  const [description, setDescription] = useState(widget.config.description || "");
  const [chartType, setChartType] = useState(widget.config.chartType || "bar");
  const { resolveWidgetColor } = useDashboardChartColors();

  const handleSave = () => {
    onUpdate(widget.id, {
      config: {
        ...widget.config,
        title,
        description,
        chartType,
      },
    });
    onEditToggle();
  };

  const handleCancel = () => {
    setTitle(widget.config.title || "New Chart");
    setDescription(widget.config.description || "");
    setChartType(widget.config.chartType || "bar");
    onEditToggle();
  };

  // Sample data for demonstration
  const sampleData = [
    { name: "Jan", value: 400, revenue: 2400, cost: 1400 },
    { name: "Feb", value: 300, revenue: 1398, cost: 2210 },
    { name: "Mar", value: 200, revenue: 9800, cost: 2290 },
    { name: "Apr", value: 278, revenue: 3908, cost: 2000 },
    { name: "May", value: 189, revenue: 4800, cost: 2181 },
    { name: "Jun", value: 239, revenue: 3800, cost: 2500 },
  ];

  // Build chart config with resolved theme colors
  const chartConfig = useMemo(() => {
    if (widget.config.chartConfig) {
      // If we have existing chartConfig, resolve any theme references
      const resolvedConfig: any = {};
      Object.entries(widget.config.chartConfig).forEach(([key, config], index) => {
        // Convert hex colors to theme references for existing widgets
        const colorToResolve = config.color?.startsWith('#') 
          ? convertHexToThemeReference(config.color)
          : config.color;
          
        resolvedConfig[key] = {
          ...config,
          color: resolveWidgetColor(colorToResolve, index)
        };
      });
      return resolvedConfig;
    }
    
    // Default chart config with theme colors
    return {
      value: {
        label: "Value",
        color: resolveWidgetColor("var(--chart-1)", 0),
      },
      revenue: {
        label: "Revenue",  
        color: resolveWidgetColor("var(--chart-2)", 1),
      },
      cost: {
        label: "Cost",
        color: resolveWidgetColor("var(--chart-3)", 2),
      },
    };
  }, [widget.config.chartConfig, resolveWidgetColor]);

  const chartSpec: ChartSpec = {
    chartType: chartType as any,
    title: widget.config.title || "Sample Chart",
    description: widget.config.description || "Sample chart description",
    data: widget.data || sampleData,
    xAxisConfig: widget.config.xAxisConfig || {
      dataKey: "name",
    },
    chartConfig,
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        <div className="space-y-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chart Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="Enter chart title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="Enter chart description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <div className="h-full border border-gray-200 dark:border-gray-700 rounded p-2">
            <ChartRenderer spec={{ ...chartSpec, chartType: chartType as any, title, description }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col  bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg  transition-all duration-200 p-4">
      {widget.config.title && (
        <div className="mb-1 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
            {widget.config.title}
          </h3>
          {widget.config.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {widget.config.description}
            </p>
          )}
        </div>
      )}
      
      <div className="flex-1 min-h-0 overflow-hidden">
        {widget.data || sampleData ? (
          <ChartRenderer spec={chartSpec} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <p className="text-xs">No chart data available</p>
              <p className="text-xs mt-1">Click edit to configure</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}