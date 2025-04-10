"use client";

import { ChartSpec, ChangeDirection } from "@/types/chart-types";
import { cn } from "@/lib/utils";

// Default styles for KPI cards
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

/**
 * Specialized renderer for KPI cards
 */
export function KPIRenderer({ spec }: { spec: ChartSpec }) {
  if (spec.chartType !== 'kpi') {
    console.error(`KPIRenderer: Expected chart type 'kpi', got '${spec.chartType}'`);
    return null;
  }

  // Merge default styles with custom styles from spec
  const styles = {
    ...defaultStyles,
    ...spec.kpiStyles,
    fontSize: {
      ...defaultStyles.fontSize,
      ...spec.kpiStyles?.fontSize,
    }
  };

  // Determine change indicator color
  const getChangeColor = (direction: ChangeDirection | undefined) => {
    switch (direction) {
      case "increase":
        return styles.changePositiveColor;
      case "decrease":
        return styles.changeNegativeColor;
      case "flat":
        return styles.changeFlatColor;
      default:
        return styles.changeFlatColor;
    }
  };

  // Format change value
  const formatChange = () => {
    if (spec.kpiChange === undefined) return null;
    
    const change = spec.kpiChange;
    // Always show a sign (plus for positive, minus for negative)
    const prefix = change > 0 ? '+' : (change < 0 ? '' : '±'); // Plus is added for positive, nothing for negative (already has minus), ± for zero/flat
    
    const formatted = spec.kpiChangeFormat 
      ? prefix + change.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 })
      : prefix + change.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 });
    
    return formatted;
  };

  // Format main value
  const formattedValue = () => {
    if (spec.kpiValue === undefined) return '';
    
    // If it's a number, format it
    if (typeof spec.kpiValue === 'number') {
      return spec.kpiValueFormat 
        ? spec.kpiValue.toLocaleString() 
        : spec.kpiValue.toLocaleString();
    }
    
    // Otherwise return as is
    return spec.kpiValue;
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col justify-center border border-gray-600"
      style={{
        backgroundColor: styles.backgroundColor,
        padding: styles.padding,
        borderRadius: styles.borderRadius,
      }}
    >
      {/* Main KPI value */}
      <div className="flex items-baseline">
        {spec.kpiPrefix && (
          <span 
            className="text-xl mr-1" 
            style={{ color: styles.valueColor }}
          >
            {spec.kpiPrefix}
          </span>
        )}
        <span 
          className="font-semibold" 
          style={{ 
            color: styles.valueColor,
            fontSize: styles.fontSize.value,
          }}
        >
          {formattedValue()}
        </span>
        {spec.kpiSuffix && (
          <span 
            className="ml-1" 
            style={{ color: styles.valueColor }}
          >
            {spec.kpiSuffix}
          </span>
        )}
      </div>

      {/* KPI Label */}
      {spec.kpiLabel && (
        <div 
          className="mt-1 font-medium"
          style={{ 
            color: styles.labelColor,
            fontSize: styles.fontSize.label,
          }}
        >
          {spec.kpiLabel}
        </div>
      )}

      {/* KPI sub-label or description */}
      {spec.kpiSubLabel && (
        <div 
          className="text-xs mt-1"
          style={{ color: styles.subLabelColor }}
        >
          {spec.kpiSubLabel}
        </div>
      )}

      {/* Change indicator */}
      {spec.kpiChange !== undefined && (
        <div 
          className={cn(
            "absolute top-4 right-4 px-2 py-1 rounded-full font-medium text-xs flex items-center",
          )}
          style={{ 
            color: getChangeColor(spec.kpiChangeDirection),
            backgroundColor: `${getChangeColor(spec.kpiChangeDirection)}15`, // 15% opacity
            fontSize: styles.fontSize.change,
          }}
        >
          {formatChange()}
        </div>
      )}
    </div>
  );
} 