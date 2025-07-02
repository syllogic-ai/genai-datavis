"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Widget } from "@/types/enhanced-dashboard-types";
import { ChartSpec, ChangeDirection } from "@/types/chart-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Default styles for KPI cards (matching KPIRenderer)
const defaultStyles = {
  valueColor: "#111827", // text-gray-900
  labelColor: "#6B7280", // text-gray-500
  subLabelColor: "#9CA3AF", // text-gray-400
  changePositiveColor: "#10B981", // text-emerald-500
  changeNegativeColor: "#EF4444", // text-red-500
  changeFlatColor: "#9CA3AF", // text-gray-400
  backgroundColor: "transparent", // white
  padding: "1.5rem",
  borderRadius: "0.5rem",
  fontSize: {
    value: "2.5rem",
    label: "0.875rem",
    change: "0.875rem",
  },
};

interface KPICardProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function KPICard({ widget, onUpdate, isEditing, onEditToggle }: KPICardProps) {
  // Map widget config to KPI properties
  const [kpiLabel, setKpiLabel] = useState(widget.config.kpiLabel || widget.config.title || "KPI");
  const [kpiValue, setKpiValue] = useState(widget.config.kpiValue || widget.config.value || "0");
  const [kpiChange, setKpiChange] = useState(widget.config.kpiChange || widget.config.change || "0");
  const [kpiChangeDirection, setKpiChangeDirection] = useState(widget.config.kpiChangeDirection || widget.config.changeDirection || "flat");
  const [kpiSuffix, setKpiSuffix] = useState(widget.config.kpiSuffix || widget.config.unit || "");
  const [kpiPrefix, setKpiPrefix] = useState(widget.config.kpiPrefix || "");
  const [kpiSubLabel, setKpiSubLabel] = useState(widget.config.kpiSubLabel || widget.config.subtitle || "");

  // Style helper functions (matching KPIRenderer)
  const getChangeColor = (direction: ChangeDirection | undefined) => {
    switch (direction) {
      case "increase":
        return defaultStyles.changePositiveColor;
      case "decrease":
        return defaultStyles.changeNegativeColor;
      case "flat":
        return defaultStyles.changeFlatColor;
      default:
        return defaultStyles.changeFlatColor;
    }
  };

  const formatChange = (change: number | string | undefined) => {
    if (change === undefined || change === null) return null;
    
    const numChange = typeof change === 'string' ? parseFloat(change) : change;
    if (isNaN(numChange)) return null;
    
    // Always show a sign (plus for positive, minus for negative)
    const prefix = numChange > 0 ? '+' : (numChange < 0 ? '' : '±');
    return prefix + (numChange / 100).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 });
  };

  const formattedValue = (val: number | string | undefined) => {
    if (val === undefined || val === null) return '';
    
    // If it's a number, format it
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    
    // If it's a string that can be converted to number
    const numVal = parseFloat(val.toString());
    if (!isNaN(numVal)) {
      return numVal.toLocaleString();
    }
    
    // Otherwise return as is
    return val.toString();
  };

  const handleSave = () => {
    onUpdate(widget.id, {
      config: {
        ...widget.config,
        // Keep backward compatibility
        title: kpiLabel,
        value: parseFloat(kpiValue.toString()) || 0,
        change: parseFloat(kpiChange.toString()) || 0,
        changeDirection: kpiChangeDirection,
        unit: kpiSuffix,
        subtitle: kpiSubLabel,
        // New KPI properties
        kpiLabel,
        kpiValue: parseFloat(kpiValue.toString()) || 0,
        kpiChange: parseFloat(kpiChange.toString()) || 0,
        kpiChangeDirection,
        kpiSuffix,
        kpiPrefix,
        kpiSubLabel,
        kpiChangeFormat: 'percentage',
        kpiValueFormat: 'number',
      },
    });
    onEditToggle();
  };

  const handleCancel = () => {
    setKpiLabel(widget.config.kpiLabel || widget.config.title || "KPI");
    setKpiValue(widget.config.kpiValue || widget.config.value || "0");
    setKpiChange(widget.config.kpiChange || widget.config.change || "0");
    setKpiChangeDirection(widget.config.kpiChangeDirection || widget.config.changeDirection || "flat");
    setKpiSuffix(widget.config.kpiSuffix || widget.config.unit || "");
    setKpiPrefix(widget.config.kpiPrefix || "");
    setKpiSubLabel(widget.config.kpiSubLabel || widget.config.subtitle || "");
    onEditToggle();
  };

  const getChangeIcon = () => {
    switch (kpiChangeDirection) {
      case "increase":
        return <TrendingUp className="w-4 h-4" />;
      case "decrease":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getChangeColorClass = () => {
    switch (kpiChangeDirection) {
      case "increase":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
      case "decrease":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30";
    }
  };

  if (isEditing) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kpiLabel" className="text-xs">Label</Label>
            <Input
              id="kpiLabel"
              value={kpiLabel}
              onChange={(e) => setKpiLabel(e.target.value)}
              placeholder="KPI Label"
              className="text-xs h-8"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="kpiPrefix" className="text-xs">Prefix</Label>
              <Input
                id="kpiPrefix"
                value={kpiPrefix}
                onChange={(e) => setKpiPrefix(e.target.value)}
                placeholder="$, €"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kpiValue" className="text-xs">Value</Label>
              <Input
                id="kpiValue"
                type="number"
                value={kpiValue}
                onChange={(e) => setKpiValue(e.target.value)}
                placeholder="0"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kpiSuffix" className="text-xs">Suffix</Label>
              <Input
                id="kpiSuffix"
                value={kpiSuffix}
                onChange={(e) => setKpiSuffix(e.target.value)}
                placeholder="%, K, M"
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="kpiChange" className="text-xs">Change (%)</Label>
              <Input
                id="kpiChange"
                type="number"
                value={kpiChange}
                onChange={(e) => setKpiChange(e.target.value)}
                placeholder="0"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kpiChangeDirection" className="text-xs">Direction</Label>
              <Select value={kpiChangeDirection} onValueChange={setKpiChangeDirection}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kpiSubLabel" className="text-xs">Sub Label</Label>
            <Input
              id="kpiSubLabel"
              value={kpiSubLabel}
              onChange={(e) => setKpiSubLabel(e.target.value)}
              placeholder="vs last month"
              className="text-xs h-8"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              size="sm"
              className="text-xs"
            >
              Save
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the actual KPI value from data or fallback to config
  const getKPIValue = () => {
    // If widget has data from database, use that
    if (widget.data && widget.data.length > 0) {
      const firstRow = widget.data[0];
      // Look for common KPI value column names
      const valueKeys = Object.keys(firstRow);
      const kpiKey = valueKeys.find(key => 
        key.toLowerCase().includes('total') || 
        key.toLowerCase().includes('sum') ||
        key.toLowerCase().includes('count') ||
        key.toLowerCase().includes('value') ||
        key.toLowerCase().includes('amount')
      ) || valueKeys[0]; // Use first column if no match
      
      return firstRow[kpiKey];
    }
    // Fallback to config value (use new kpi properties first, then old ones)
    return widget.config.kpiValue || widget.config.value || 0;
  };

  const actualValue = getKPIValue();
  const hasRealData = widget.data && widget.data.length > 0;
  const actualChange = widget.config.kpiChange || widget.config.change || 0;
  const actualChangeDirection = widget.config.kpiChangeDirection || widget.config.changeDirection || "flat";
  const actualLabel = widget.config.kpiLabel || widget.config.title || "KPI";
  const actualSubLabel = widget.config.kpiSubLabel || widget.config.subtitle;
  const actualPrefix = widget.config.kpiPrefix || "";
  const actualSuffix = widget.config.kpiSuffix || widget.config.unit || "";

  return (
    <div 
      className="relative w-full h-full flex flex-col justify-center border border-gray-600"
      style={{
        backgroundColor: defaultStyles.backgroundColor,
        padding: defaultStyles.padding,
        borderRadius: defaultStyles.borderRadius,
      }}
    >
      {/* Main KPI value */}
      <div className="flex items-baseline justify-center">
        {actualPrefix && (
          <span 
            className="text-xl mr-1" 
            style={{ color: defaultStyles.valueColor }}
          >
            {actualPrefix}
          </span>
        )}
        <span 
          className="font-semibold" 
          style={{ 
            color: defaultStyles.valueColor,
            fontSize: defaultStyles.fontSize.value,
          }}
        >
          {formattedValue(actualValue)}
        </span>
        {actualSuffix && (
          <span 
            className="ml-1" 
            style={{ 
              color: defaultStyles.valueColor,
              fontSize: "1.25rem" // Smaller than main value
            }}
          >
            {actualSuffix}
          </span>
        )}
        {hasRealData && (
          <span className="w-2 h-2 bg-green-500 rounded-full ml-2" title="Live data" />
        )}
      </div>

      {/* KPI Label */}
      {actualLabel && (
        <div 
          className="mt-1 font-medium text-center"
          style={{ 
            color: defaultStyles.labelColor,
            fontSize: defaultStyles.fontSize.label,
          }}
        >
          {actualLabel}
        </div>
      )}

      {/* KPI sub-label or description */}
      {actualSubLabel && (
        <div 
          className="text-xs mt-1 text-center"
          style={{ color: defaultStyles.subLabelColor }}
        >
          {actualSubLabel}
        </div>
      )}

      {/* Change indicator */}
      {actualChange !== 0 && (
        <div 
          className={cn(
            "absolute top-4 right-4 px-2 py-1 rounded-full font-medium text-xs flex items-center",
          )}
          style={{ 
            color: getChangeColor(actualChangeDirection as ChangeDirection),
            backgroundColor: `${getChangeColor(actualChangeDirection as ChangeDirection)}15`, // 15% opacity
            fontSize: defaultStyles.fontSize.change,
          }}
        >
          {formatChange(actualChange)}
        </div>
      )}
    </div>
  );
}