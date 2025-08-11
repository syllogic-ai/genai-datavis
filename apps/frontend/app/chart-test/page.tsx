'use client'

import { useState, useEffect } from "react";
import { ChartSpec } from "@/types/chart-types";
import { consumptionData } from "@/types/aep_2017_data";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Copy, Check, Sun, Moon, ChevronDown } from "lucide-react";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { useTheme } from "@/lib/ThemeProvider";
import { Theme, ThemeStyleProps } from "@/db/schema";
import toast, { Toaster } from "react-hot-toast";

// Enhanced sample data generators
const generateMultiSeriesData = (days = 30) => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const baseValue = Math.sin(i / 5) * 500 + 3000;
    const desktop = Math.round(baseValue + Math.random() * 800);
    const mobile = Math.round(baseValue * 0.6 + Math.random() * 400);
    const tablet = Math.round(baseValue * 0.3 + Math.random() * 200);
    
    data.push({
      datetime: date.toISOString(),
      desktop,
      mobile,
      tablet,
    });
  }
  
  return data;
};

// Comprehensive test data
const barChartData = [
  { category: "Product A", revenue: 4200, cost: 2100, profit: 2100 },
  { category: "Product B", revenue: 3800, cost: 1700, profit: 2100 },
  { category: "Product C", revenue: 5100, cost: 2700, profit: 2400 },
  { category: "Product D", revenue: 2700, cost: 1500, profit: 1200 },
  { category: "Product E", revenue: 6100, cost: 3200, profit: 2900 },
  { category: "Product F", revenue: 4800, cost: 2400, profit: 2400 },
];

const horizontalBarData = [
  { department: "Sales", headcount: 42 },
  { department: "Marketing", headcount: 28 },
  { department: "Engineering", headcount: 65 },
  { department: "Product", headcount: 15 },
  { department: "Customer Support", headcount: 34 },
  { department: "Operations", headcount: 21 },
].sort((a, b) => a.headcount - b.headcount);

const pieChartData = [
  { name: "Chrome", value: 45.2 },
  { name: "Safari", value: 18.4 },
  { name: "Firefox", value: 12.1 },
  { name: "Edge", value: 8.9 },
  { name: "Opera", value: 3.2 },
  { name: "Other", value: 12.2 },
];

const tableData = [
  { name: "John Smith", department: "Engineering", salary: 95000, performance: 4.5 },
  { name: "Sarah Connor", department: "Product", salary: 120000, performance: 4.8 },
  { name: "Mike Johnson", department: "Sales", salary: 85000, performance: 4.2 },
  { name: "Emily Davis", department: "Marketing", salary: 75000, performance: 4.6 },
  { name: "David Wilson", department: "Engineering", salary: 110000, performance: 4.9 },
  { name: "Lisa Anderson", department: "Operations", salary: 70000, performance: 4.3 },
];

const areaChartData = generateMultiSeriesData();

// Radial chart test data
const radialChartData = [
  { browser: "safari", visitors: 1260, fill: "var(--color-safari)" }
];

const radialStackedData = [
  { month: "january", desktop: 1260, mobile: 570 }
];

// IRR (Internal Rate of Return) data for negative bar chart test
const irrData = [
  { investment: "Tech Startup A", irr: 25.5 },
  { investment: "Real Estate Fund", irr: 12.3 },
  { investment: "Venture Capital", irr: -15.2 },
  { investment: "Private Equity", irr: 18.7 },
  { investment: "Crypto Fund", irr: -32.1 },
  { investment: "Growth Equity", irr: 8.9 },
  { investment: "Distressed Debt", irr: -8.4 },
  { investment: "Infrastructure", irr: 14.2 },
];

// Chart configurations with all possible options
const getChartSpecs = (themeColors: any): ChartSpec[] => [
  // Line Chart - Basic
  {
    chartType: "line",
    title: "Basic Line Chart",
    description: "Simple line chart with single series",
    data: consumptionData,
    chartConfig: {
      datetime: { label: "Date", color: themeColors["chart-1"] },
      consumption: { label: "Consumption", color: themeColors["chart-1"] }
    },
    xAxisConfig: {
      dataKey: "datetime",
      dateFormat: "DD-MM-YYYY",
      hide: false,
      tickLine: false,
      axisLine: false,
      tickMargin: 10
    },
    yAxisConfig: {
      hide: false,
      tickLine: false,
      axisLine: false,
      tickMargin: 10,
      tickCount: 4
    },
    dateFormatTooltip: "DD-MM-YYYY",
    lineType: "monotone",
    hideLegend: false,
    strokeWidth: 2,
    dot: false,
  },

  // Line Chart - Multi-series with dots
  {
    chartType: "line",
    title: "Multi-series Line Chart with Dots",
    description: "Multiple data series with visible dots",
    data: areaChartData,
    chartConfig: {
      desktop: { label: "Desktop", color: themeColors["chart-1"] },
      mobile: { label: "Mobile", color: themeColors["chart-2"] },
      tablet: { label: "Tablet", color: themeColors["chart-3"] }
    },
    xAxisConfig: {
      dataKey: "datetime",
      dateFormat: "MMM DD",
      hide: false,
      tickLine: false,
      axisLine: false,
      tickMargin: 10
    },
    yAxisConfig: {
      hide: false,
      tickLine: false,
      axisLine: false,
      tickMargin: 10,
      tickCount: 6
    },
    dateFormatTooltip: "MMM DD, YYYY",
    lineType: "natural",
    hideLegend: false,
    strokeWidth: 3,
    dot: true,
  },

  // Bar Chart - Vertical
  {
    chartType: "bar",
    title: "Vertical Bar Chart",
    description: "Multi-series vertical bar chart",
    data: barChartData,
    chartConfig: {
      revenue: { label: "Revenue", color: themeColors["chart-1"] },
      cost: { label: "Cost", color: themeColors["chart-2"] }
    },
    xAxisConfig: {
      dataKey: "category",
      tickLine: false,
      axisLine: false,
      tickMargin: 10
    },
    yAxisConfig: {
      tickLine: false,
      axisLine: false,
      tickCount: 5
    },
    barConfig: {
      radius: 4,
      truncateLabels: false,
      accessibilityLayer: true,
      barGap: 4,
      barSize: 60
    }
  },

  // Bar Chart - Horizontal
  {
    chartType: "bar",
    title: "Horizontal Bar Chart",
    description: "Single-series horizontal bar chart",
    data: horizontalBarData,
    chartConfig: {
      headcount: { label: "Headcount", color: themeColors["chart-2"] }
    },
    xAxisConfig: {
      dataKey: "department",
      tickLine: false,
      axisLine: false,
      tickMargin: 10
    },
    yAxisConfig: {
      tickLine: false,
      axisLine: false,
      tickCount: 5
    },
    barConfig: {
      radius: 8,
      truncateLabels: false,
      accessibilityLayer: true,
      isHorizontal: true,
      barSize: 40
    }
  },

  // Bar Chart - Stacked
  {
    chartType: "bar",
    title: "Stacked Bar Chart",
    description: "Multi-series stacked bar chart",
    data: barChartData,
    stacked: true,
    chartConfig: {
      revenue: { label: "Revenue", color: themeColors["chart-1"] },
      cost: { label: "Cost", color: themeColors["chart-2"] },
      profit: { label: "Profit", color: themeColors["chart-3"] }
    },
    xAxisConfig: {
      dataKey: "category",
      tickLine: false,
      axisLine: false,
      tickMargin: 10
    },
    yAxisConfig: {
      tickLine: false,
      axisLine: false,
      tickCount: 5
    },
    barConfig: {
      radius: 4,
      truncateLabels: false,
      accessibilityLayer: true
    }
  },

  // Bar Chart - Negative Variant (IRR Investment Returns)
  {
    chartType: "bar",
    title: "Investment IRR - Negative Bar Chart",
    description: "Internal Rate of Return with positive/negative coloring",
    data: irrData,
    chartConfig: {
      irr: { label: "IRR (%)" }
    },
    xAxisConfig: {
      dataKey: "investment",
      tickLine: false,
      axisLine: false,
      tickMargin: 10
    },
    yAxisConfig: {
      tickLine: false,
      axisLine: false,
      tickCount: 6
    },
    barConfig: {
      variant: 'negative',
      radius: 6,
      truncateLabels: true,
      maxLabelLength: 12,
      accessibilityLayer: true,
      showLabels: true,
      labelPosition: 'top',
      barSize: 50
    }
  },

  // Area Chart - Stacked with Gradient
  {
    chartType: "area",
    title: "Stacked Area Chart with Gradient",
    description: "Multi-series stacked area chart",
    data: areaChartData,
    stacked: true,
    chartConfig: {
      desktop: { color: themeColors["chart-1"], label: "Desktop" },
      mobile: { color: themeColors["chart-2"], label: "Mobile" },
      tablet: { color: themeColors["chart-3"], label: "Tablet" }
    },
    xAxisConfig: {
      dataKey: "datetime",
      dateFormat: "MMM DD",
      tickLine: false,
      axisLine: false
    },
    yAxisConfig: {
      tickLine: false,
      axisLine: false,
      tickCount: 5
    },
    lineType: "natural",
    dateFormatTooltip: "MMM DD, YYYY",
    dot: false,
    areaConfig: {
      useGradient: true,
      fillOpacity: 0.4,
      accessibilityLayer: true,
      gradientStops: {
        topOffset: "5%",
        bottomOffset: "95%",
        topOpacity: 0.8,
        bottomOpacity: 0.1
      }
    }
  },

  // Area Chart - Unstacked
  {
    chartType: "area",
    title: "Unstacked Area Chart",
    description: "Multi-series unstacked area chart",
    data: areaChartData,
    stacked: false,
    chartConfig: {
      desktop: { color: themeColors["chart-1"], label: "Desktop" },
      mobile: { color: themeColors["chart-2"], label: "Mobile" },
      tablet: { color: themeColors["chart-3"], label: "Tablet" }
    },
    xAxisConfig: {
      dataKey: "datetime",
      dateFormat: "MMM DD",
      tickLine: false,
      axisLine: false
    },
    yAxisConfig: {
      tickLine: false,
      axisLine: false,
      tickCount: 5
    },
    lineType: "monotone",
    dateFormatTooltip: "MMM DD, YYYY",
    dot: false,
    areaConfig: {
      useGradient: true,
      fillOpacity: 0.3,
      accessibilityLayer: true,
      gradientStops: {
        topOffset: "5%",
        bottomOffset: "95%",
        topOpacity: 0.6,
        bottomOpacity: 0.1
      }
    }
  },

  // Pie Chart - Basic
  {
    chartType: "pie",
    title: "Basic Pie Chart",
    description: "Browser market share distribution",
    data: pieChartData.map((item, index) => ({ [item.name]: item.value })),
    chartConfig: {
      Chrome: { label: "Chrome", color: themeColors["chart-1"] },
      Safari: { label: "Safari", color: themeColors["chart-2"] },
      Firefox: { label: "Firefox", color: themeColors["chart-3"] },
      Edge: { label: "Edge", color: themeColors["chart-4"] },
      Opera: { label: "Opera", color: themeColors["chart-5"] },
      Other: { label: "Other", color: "#8B5A2B" }
    },
    pieConfig: {
      isDonut: false,
      outerRadius: 120,
      showLabels: true,
      stroke: "white",
      strokeWidth: 2
    },
    hideLegend: false
  },

  // Pie Chart - Donut
  {
    chartType: "pie",
    title: "Donut Chart",
    description: "Browser market share as donut chart",
    data: pieChartData.map((item, index) => ({ [item.name]: item.value })),
    chartConfig: {
      Chrome: { label: "Chrome", color: themeColors["chart-1"] },
      Safari: { label: "Safari", color: themeColors["chart-2"] },
      Firefox: { label: "Firefox", color: themeColors["chart-3"] },
      Edge: { label: "Edge", color: themeColors["chart-4"] },
      Opera: { label: "Opera", color: themeColors["chart-5"] },
      Other: { label: "Other", color: "#8B5A2B" }
    },
    pieConfig: {
      isDonut: true,
      innerRadius: 60,
      outerRadius: 120,
      showLabels: false,
      stroke: "white",
      strokeWidth: 1
    },
    hideLegend: false
  },

  // KPI Cards - Various styles
  {
    chartType: "kpi",
    title: "Daily Active Users",
    description: "Users active in the last 24 hours",
    kpiValue: 3450,
    kpiLabel: "Daily active users",
    kpiChange: 0.121,
    kpiChangeDirection: "increase",
    kpiStyles: {
      valueColor: "#111827",
      labelColor: "#6B7280",
      changePositiveColor: "#10B981",
      fontSize: {
        value: "2.5rem"
      }
    }
  },

  {
    chartType: "kpi",
    title: "Monthly Revenue",
    description: "Total revenue for current month",
    kpiValue: 42500,
    kpiPrefix: "$",
    kpiLabel: "Monthly revenue",
    kpiSubLabel: "Compared to last month",
    kpiChange: -0.053,
    kpiChangeDirection: "decrease",
    kpiStyles: {
      valueColor: "#1F2937",
      labelColor: "#4B5563",
      changeNegativeColor: "#EF4444",
    }
  },

  {
    chartType: "kpi",
    title: "Conversion Rate",
    description: "Percentage of visitors who convert",
    kpiValue: 5.2,
    kpiSuffix: "%",
    kpiLabel: "Conversion rate",
    kpiSubLabel: "No significant change",
    kpiChange: 0.001,
    kpiChangeDirection: "flat",
    kpiStyles: {
      changeFlatColor: "#9CA3AF",
      borderRadius: "1rem"
    }
  },

  // Table - Basic
  {
    chartType: "table",
    title: "Employee Data",
    description: "Company employee information",
    data: tableData,
    tableConfig: {
      columnLabels: {
        name: "Full Name",
        department: "Department",
        salary: "Annual Salary",
        performance: "Performance Score"
      },
      columnFormatters: {
        salary: { type: 'currency', currency: 'USD' },
        performance: { type: 'number', decimals: 1 }
      },
      cellAlignment: {
        salary: "text-right",
        performance: "text-center"
      },
      striped: true,
      sortBy: {
        column: "salary",
        direction: "desc"
      }
    }
  },

  // Table - With pagination
  {
    chartType: "table",
    title: "Employee Data (Paginated)",
    description: "Company employee information with pagination",
    data: [...tableData, ...tableData, ...tableData], // Triple the data
    tableConfig: {
      columnLabels: {
        name: "Full Name",
        department: "Department", 
        salary: "Annual Salary",
        performance: "Performance Score"
      },
      columnFormatters: {
        salary: { type: 'currency', currency: 'USD' },
        performance: { type: 'number', decimals: 1 }
      },
      cellAlignment: {
        salary: "text-right",
        performance: "text-center"
      },
      striped: true,
      sortBy: {
        column: "performance",
        direction: "desc"
      },
      pagination: {
        page: 1,
        pageSize: 5
      }
    }
  },

  // Radial Chart - Default (Single Value)
  {
    chartType: "radial",
    title: "Radial Chart - Default",
    description: "Single value radial chart with center text",
    data: radialChartData,
    chartConfig: {
      visitors: { label: "Visitors" },
      safari: { label: "Safari", color: themeColors["chart-2"] }
    },
    radialConfig: {
      variant: 'default',
      startAngle: 0,
      endAngle: 250,
      innerRadius: 80,
      outerRadius: 110,
      cornerRadius: 10,
      dataKey: 'visitors',
      showBackground: true,
      centerText: {
        secondary: "Visitors"
      },
      gridConfig: {
        gridType: 'circle',
        radialLines: false,
        polarRadius: [86, 74]
      }
    }
  },

  // Radial Chart - Stacked
  {
    chartType: "radial",
    title: "Radial Chart - Stacked",
    description: "Multi-value stacked radial chart",
    data: radialStackedData,
    chartConfig: {
      desktop: { label: "Desktop", color: themeColors["chart-1"] },
      mobile: { label: "Mobile", color: themeColors["chart-2"] }
    },
    radialConfig: {
      variant: 'stacked',
      startAngle: 0,
      endAngle: 180,
      innerRadius: 80,
      outerRadius: 130,
      cornerRadius: 5,
      stackId: 'a',
      showBackground: false,
      centerText: {
        showTotal: true,
        secondary: "Visitors"
      }
    }
  }
];

// Copy to clipboard component
interface CopyButtonProps {
  data: any;
  label: string;
}

function CopyButton({ data, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="flex items-center gap-2"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : `Copy ${label}`}
    </Button>
  );
}

// Dashboard-style chart widget component (matches actual dashboard rendering)
interface DashboardChartWidgetProps {
  spec: ChartSpec;
  index: number;
}

function DashboardChartWidget({ spec, index }: DashboardChartWidgetProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{spec.title}</CardTitle>
            <CardDescription>{spec.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <CopyButton data={spec} label="Config" />
            <CopyButton data={spec.data} label="Data" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Match exact dashboard widget styling and sizing */}
        <div 
          className="h-[300px] flex flex-col border-t transition-all duration-200 p-4" 
          style={{ 
            backgroundColor: 'var(--card)', 
            borderColor: 'var(--border)', 
            color: 'var(--card-foreground)' 
          }}
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChartRenderer spec={{ ...spec, title: "", description: "" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChartTestPage() {
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [selectedUserTheme, setSelectedUserTheme] = useState<Theme | null>(null);
  const [chartSpecs, setChartSpecs] = useState<ChartSpec[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [userThemes, setUserThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  // Load user themes
  useEffect(() => {
    loadUserThemes();
  }, []);

  const loadUserThemes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/themes");
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("User not authenticated, skipping theme loading");
          setUserThemes([]);
          return;
        }
        throw new Error("Failed to load themes");
      }
      
      const data = await response.json();
      
      // Filter out themes that are actually built-in presets
      const builtInPresetIds = THEME_PRESETS.map(preset => preset.id);
      const builtInPresetNames = THEME_PRESETS.map(preset => preset.name);
      
      const customThemes = data.themes.filter((theme: Theme) => {
        // Exclude if theme ID matches a built-in preset ID
        if (builtInPresetIds.includes(theme.id)) {
          return false;
        }
        // Exclude if theme name matches a built-in preset name (case-insensitive)
        if (builtInPresetNames.some(name => name.toLowerCase() === theme.name.toLowerCase())) {
          return false;
        }
        return true;
      });
      
      setUserThemes(customThemes);
    } catch (error) {
      console.error("Error loading themes:", error);
      // Don't show error toast as this is optional functionality
    } finally {
      setLoading(false);
    }
  };

  // Apply custom theme colors to root element
  useEffect(() => {
    let themeStyles;
    
    if (selectedUserTheme) {
      // Use user theme styles
      themeStyles = selectedUserTheme.styles[theme];
    } else {
      // Use built-in preset styles
      const themePreset = THEME_PRESETS.find(t => t.id === selectedTheme);
      if (themePreset) {
        themeStyles = themePreset.styles[theme];
      }
    }
    
    if (themeStyles) {
      const root = document.documentElement;
      
      // Apply CSS custom properties for full theme application
      Object.entries(themeStyles).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value as string);
      });
    }
  }, [selectedTheme, selectedUserTheme, theme]);

  // Update chart specs when theme changes
  useEffect(() => {
    let themeColors;
    
    if (selectedUserTheme) {
      // Use user theme colors
      themeColors = {
        "chart-1": selectedUserTheme.styles[theme]["chart-1"],
        "chart-2": selectedUserTheme.styles[theme]["chart-2"],
        "chart-3": selectedUserTheme.styles[theme]["chart-3"],  
        "chart-4": selectedUserTheme.styles[theme]["chart-4"],
        "chart-5": selectedUserTheme.styles[theme]["chart-5"],
      };
    } else {
      // Use built-in preset colors
      const themePreset = THEME_PRESETS.find(t => t.id === selectedTheme);
      if (themePreset) {
        themeColors = {
          "chart-1": themePreset.styles[theme]["chart-1"],
          "chart-2": themePreset.styles[theme]["chart-2"],
          "chart-3": themePreset.styles[theme]["chart-3"],  
          "chart-4": themePreset.styles[theme]["chart-4"],
          "chart-5": themePreset.styles[theme]["chart-5"],
        };
      }
    }
    
    if (themeColors) {
      setChartSpecs(getChartSpecs(themeColors));
    }
  }, [selectedTheme, selectedUserTheme, theme]);

  return (
    <div className="min-h-screen transition-colors duration-200" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Chart Widget Test Suite</h1>
            <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Comprehensive test page for all chart types with various configurations
            </p>
          </div>
          
          {/* Theme Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={commandOpen}
              className="w-64 justify-between rounded-lg"
              onClick={() => setCommandOpen(true)}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => {
                    let chartColor;
                    if (selectedUserTheme) {
                      chartColor = selectedUserTheme.styles[theme][`chart-${i}` as keyof ThemeStyleProps];
                    } else {
                      const selectedPreset = THEME_PRESETS.find(p => p.id === selectedTheme) || THEME_PRESETS[0];
                      chartColor = selectedPreset.styles[theme][`chart-${i}` as keyof typeof selectedPreset.styles.light];
                    }
                    return (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border"
                        style={{
                          backgroundColor: chartColor || "#000",
                        }}
                      />
                    );
                  })}
                </div>
                <span>
                  {selectedUserTheme ? selectedUserTheme.name : (THEME_PRESETS.find(p => p.id === selectedTheme)?.name || "Default")}
                </span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
            
            <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
              <Command className="rounded-lg">
                <CommandInput placeholder="Search themes..." />
                <CommandList>
                  <CommandEmpty>No theme found.</CommandEmpty>
                  
                  {/* User Created Themes */}
                  {userThemes.length > 0 && (
                    <CommandGroup heading="Your Themes">
                      {userThemes.map((userTheme) => (
                        <CommandItem
                          key={userTheme.id}
                          value={userTheme.name}
                          onSelect={() => {
                            setSelectedUserTheme(userTheme);
                            setSelectedTheme(""); // Clear built-in theme selection
                            setCommandOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                {[1, 2, 3].map((i) => (
                                  <div
                                    key={i}
                                    className="w-3 h-3 rounded-full border"
                                    style={{
                                      backgroundColor:
                                        userTheme.styles[theme][
                                          `chart-${i}` as keyof ThemeStyleProps
                                        ] || "#000",
                                    }}
                                  />
                                ))}
                              </div>
                              <div className="font-medium">{userTheme.name}</div>
                            </div>
                            {selectedUserTheme?.id === userTheme.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  
                  {/* Separator between user themes and built-in themes */}
                  {userThemes.length > 0 && <CommandSeparator />}
                  
                  {/* Built-in Theme Presets */}
                  <CommandGroup heading="Built-in Themes">
                    {THEME_PRESETS.map((preset) => (
                      <CommandItem
                        key={preset.id}
                        value={preset.name}
                        onSelect={() => {
                          setSelectedTheme(preset.id);
                          setSelectedUserTheme(null); // Clear user theme selection
                          setCommandOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="w-3 h-3 rounded-full border"
                                  style={{
                                    backgroundColor:
                                      preset.styles[theme][
                                        `chart-${i}` as keyof typeof preset.styles.light
                                      ] || "#000",
                                  }}
                                />
                              ))}
                            </div>
                            <div className="font-medium">{preset.name}</div>
                          </div>
                          {!selectedUserTheme && selectedTheme === preset.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </CommandDialog>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {chartSpecs.map((spec, index) => (
            <DashboardChartWidget key={`${spec.chartType}-${index}`} spec={spec} index={index} />
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <p>
            This page demonstrates all supported chart types with various configuration options.
            Use the copy buttons to get the configuration and data for each chart.
          </p>
        </div>
      </div>
    </div>
  );
}