"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  AreaChart, 
  BarChart3, 
  BarChart, 
  PieChart, 
  Table, 
  Target,
  X,
  Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardWidget {
  id: string;
  title: string;
  type: string;
  dashboardId: string;
  createdAt: Date;
}

export interface WidgetContextSelectorProps {
  dashboardId: string;
  selectedWidgets: DashboardWidget[];
  onWidgetSelectionChange: (widgets: DashboardWidget[]) => void;
  availableWidgets: DashboardWidget[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

// Icon mapping for widget types
const getWidgetIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'line-chart':
    case 'line':
      return TrendingUp;
    case 'area-chart':
    case 'area':
      return AreaChart;
    case 'bar-chart':
    case 'bar':
      return BarChart3;
    case 'horizontal-bar-chart':
    case 'horizontal-bar':
      return BarChart;
    case 'pie-chart':
    case 'pie':
      return PieChart;
    case 'table':
      return Table;
    case 'kpi-card':
    case 'kpi':
      return Target;
    default:
      return Target;
  }
};

export function WidgetContextSelector({
  dashboardId,
  selectedWidgets,
  onWidgetSelectionChange,
  availableWidgets,
  loading = false,
  disabled = false,
  className,
}: WidgetContextSelectorProps) {
  const handleToggleWidget = (widget: DashboardWidget) => {
    if (disabled) return;
    
    const isSelected = selectedWidgets.some(w => w.id === widget.id);
    
    if (isSelected) {
      onWidgetSelectionChange(selectedWidgets.filter(w => w.id !== widget.id));
    } else {
      onWidgetSelectionChange([...selectedWidgets, widget]);
    }
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (disabled) return;
    onWidgetSelectionChange(selectedWidgets.filter(w => w.id !== widgetId));
  };

  const unselectedWidgets = availableWidgets.filter(
    widget => !selectedWidgets.some(selected => selected.id === widget.id)
  );

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Label className="text-sm font-medium">Widget Context (Optional)</Label>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">
        Widget Context (Optional)
      </Label>
      
      {/* Selected Widgets */}
      {selectedWidgets.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Selected:</div>
          <div className="flex flex-wrap gap-1">
            {selectedWidgets.map((widget) => {
              const IconComponent = getWidgetIcon(widget.type);
              return (
                <Badge
                  key={widget.id}
                  variant="default"
                  className="flex items-center gap-1 pl-2 pr-1"
                >
                  <IconComponent className="h-3 w-3" />
                  <span className="text-xs">{widget.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveWidget(widget.id)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Widgets */}
      {unselectedWidgets.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Available widgets:</div>
          <div className="flex flex-wrap gap-1">
            {unselectedWidgets.map((widget) => {
              const IconComponent = getWidgetIcon(widget.type);
              return (
                <Button
                  key={widget.id}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 flex items-center gap-1"
                  onClick={() => handleToggleWidget(widget)}
                  disabled={disabled}
                >
                  <Plus className="h-3 w-3" />
                  <IconComponent className="h-3 w-3" />
                  <span className="text-xs">{widget.title}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {availableWidgets.length === 0 && !loading && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No widgets available in this dashboard
        </div>
      )}

      {/* Helper Text */}
      <div className="text-xs text-muted-foreground">
        Select existing widgets to use as context for your new widget creation.
      </div>
    </div>
  );
}