"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  AreaChart, 
  BarChart3, 
  BarChart, 
  PieChart, 
  Table, 
  Target 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlatWidgetType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'chart' | 'table' | 'kpi';
}

export const WIDGET_TYPE_OPTIONS: FlatWidgetType[] = [
  { value: 'line-chart', label: 'Line Chart', icon: TrendingUp, category: 'chart' },
  { value: 'area-chart', label: 'Area Chart', icon: AreaChart, category: 'chart' },
  { value: 'bar-chart', label: 'Bar Chart', icon: BarChart3, category: 'chart' },
  { value: 'horizontal-bar-chart', label: 'Horizontal Bar Chart', icon: BarChart, category: 'chart' },
  { value: 'pie-chart', label: 'Pie Chart', icon: PieChart, category: 'chart' },
  { value: 'table', label: 'Table', icon: Table, category: 'table' },
  { value: 'kpi-card', label: 'KPI Card', icon: Target, category: 'kpi' }
];

export interface FlatWidgetTypeSelectorProps {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function FlatWidgetTypeSelector({
  selectedType,
  onTypeChange,
  disabled = false,
  className,
}: FlatWidgetTypeSelectorProps) {
  const selectedOption = React.useMemo(
    () => WIDGET_TYPE_OPTIONS.find(option => option.value === selectedType),
    [selectedType]
  );

  const chartOptions = React.useMemo(
    () => WIDGET_TYPE_OPTIONS.filter(option => option.category === 'chart'),
    []
  );

  const tableOptions = React.useMemo(
    () => WIDGET_TYPE_OPTIONS.filter(option => option.category === 'table'),
    []
  );

  const kpiOptions = React.useMemo(
    () => WIDGET_TYPE_OPTIONS.filter(option => option.category === 'kpi'),
    []
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="widget-type-select" className="text-sm font-medium">
        Widget Type *
      </Label>
      <Select
        value={selectedType || ""}
        onValueChange={(value) => onTypeChange(value || null)}
        disabled={disabled}
      >
        <SelectTrigger id="widget-type-select" className="w-full">
          <SelectValue placeholder="Select widget type..." />
        </SelectTrigger>
        <SelectContent>
          {/* Chart Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Charts
          </div>
          {chartOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
          
          {/* Table Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-2">
            Data
          </div>
          {tableOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
          
          {/* KPI Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-2">
            Metrics
          </div>
          {kpiOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}