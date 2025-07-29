"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Save,
  ChevronDown,
  Palette,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
} from "lucide-react";
import { Theme, ThemeStyleProps } from "@/db/schema";
import { THEME_PRESETS } from "@/lib/theme-presets";
import toast, { Toaster } from "react-hot-toast";
import {
    SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";

interface ThemeEditorState {
  selectedPresetId: string;
  customizedStyles: Partial<ThemeStyleProps>;
  isModified: boolean;
  previewMode: "light" | "dark";
}

// Font family options
const FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "Open Sans, sans-serif", label: "Open Sans" },
  { value: "Poppins, sans-serif", label: "Poppins" },
  { value: "Lato, sans-serif", label: "Lato" },
  { value: "Montserrat, sans-serif", label: "Montserrat" },
  { value: "Source Sans 3, sans-serif", label: "Source Sans 3" },
  { value: "system-ui, sans-serif", label: "System UI" },
];

const HEADING_FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Playfair Display, serif", label: "Playfair Display" },
  { value: "Merriweather, serif", label: "Merriweather" },
  { value: "Source Serif 4, serif", label: "Source Serif 4" },
  { value: "Crimson Text, serif", label: "Crimson Text" },
  { value: "Lora, serif", label: "Lora" },
  { value: "Poppins, sans-serif", label: "Poppins" },
  { value: "Montserrat, sans-serif", label: "Montserrat" },
];

// Font size options
const FONT_SIZES = [
  { value: "12px", label: "12px" },
  { value: "14px", label: "14px" },
  { value: "16px", label: "16px" },
  { value: "18px", label: "18px" },
  { value: "20px", label: "20px" },
  { value: "24px", label: "24px" },
  { value: "28px", label: "28px" },
  { value: "32px", label: "32px" },
  { value: "36px", label: "36px" },
  { value: "42px", label: "42px" },
  { value: "48px", label: "48px" },
];

export default function ThemeGeneratorPage() {
  const [state, setState] = useState<ThemeEditorState>({
    selectedPresetId: "default",
    customizedStyles: {},
    isModified: false,
    previewMode: "light",
  });

  const [userThemes, setUserThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");

  // Load user themes
  useEffect(() => {
    loadUserThemes();
  }, []);

  // Apply theme styles to entire page
  useEffect(() => {
    const currentStyles = getCurrentStyles();
    const root = document.documentElement;

    // Apply all theme styles to root
    Object.entries(currentStyles).forEach(([key, value]) => {
      if (typeof value === "string") {
        root.style.setProperty(`--${key}`, value);
      }
    });

    // Set dark/light mode class
    if (state.previewMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply background to body
    document.body.style.backgroundColor = currentStyles.background;
    document.body.style.color = currentStyles.foreground;
    document.body.style.fontFamily = currentStyles["font-sans"];
  }, [state]);

  const loadUserThemes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/themes");
      if (!response.ok) throw new Error("Failed to load themes");
      const data = await response.json();
      setUserThemes(data.themes);
    } catch (error) {
      console.error("Error loading themes:", error);
      toast.error("Failed to load themes");
    } finally {
      setLoading(false);
    }
  };

  // Get current preset
  const currentPreset =
    THEME_PRESETS.find((p) => p.id === state.selectedPresetId) ||
    THEME_PRESETS[0];

  // Get current styles (base + customizations)
  const getCurrentStyles = useCallback((): ThemeStyleProps => {
    const baseStyles =
      state.previewMode === "dark"
        ? currentPreset.styles.dark
        : currentPreset.styles.light;

    return { ...baseStyles, ...state.customizedStyles } as ThemeStyleProps;
  }, [state, currentPreset]);

  // Update a style property
  const updateStyle = useCallback(
    (key: keyof ThemeStyleProps, value: string) => {
      setState((prev) => ({
        ...prev,
        customizedStyles: {
          ...prev.customizedStyles,
          [key]: value,
        },
        isModified: true,
      }));
    },
    []
  );

  // Reset customizations
  const resetCustomizations = useCallback(() => {
    setState((prev) => ({
      ...prev,
      customizedStyles: {},
      isModified: false,
    }));
  }, []);

  // Change preset
  const changePreset = useCallback((presetId: string) => {
    setState((prev) => ({
      ...prev,
      selectedPresetId: presetId,
      customizedStyles: {},
      isModified: false,
    }));
  }, []);

  // Save custom theme
  const saveCustomTheme = async () => {
    if (!state.isModified) return;

    try {
      const currentStyles = getCurrentStyles();

      const themeData = {
        name: themeName || `${currentPreset.name} Custom`,
        description:
          themeDescription || `Customized version of ${currentPreset.name}`,
        isDefault: false,
        styles: {
          light:
            state.previewMode === "light"
              ? currentStyles
              : { ...currentPreset.styles.light, ...state.customizedStyles },
          dark:
            state.previewMode === "dark"
              ? currentStyles
              : { ...currentPreset.styles.dark, ...state.customizedStyles },
        },
      };

      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(themeData),
      });

      if (!response.ok) throw new Error("Failed to save theme");

      toast.success("Theme saved successfully!");
      setSaveDialogOpen(false);
      setThemeName("");
      setThemeDescription("");
      loadUserThemes();
      setState((prev) => ({ ...prev, isModified: false }));
    } catch (error) {
      console.error("Error saving theme:", error);
      toast.error("Failed to save theme");
    }
  };

  return (
    <SidebarInset className="bg-transparent">
      <div className="flex flex-1 flex-col">
        {/* Sidebar Header */}
        <SidebarHeader className="flex-row h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 flex-1">
            <Palette className="h-5 w-5" />
            <h1 className="font-semibold">Theme Generator</h1>
          </div>
          {state.isModified && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="animate-pulse text-xs">
                Modified
              </Badge>
              <Button variant="outline" size="sm" onClick={resetCustomizations}>
                Reset
              </Button>
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Theme
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-xl">
                  <DialogHeader>
                    <DialogTitle>Save Custom Theme</DialogTitle>
                    <DialogDescription>
                      Save your customized theme as a new template
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme-name">Theme Name</Label>
                      <Input
                        id="theme-name"
                        placeholder="My Custom Theme"
                        value={themeName}
                        onChange={(e) => setThemeName(e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="theme-description">
                        Description (optional)
                      </Label>
                      <Input
                        id="theme-description"
                        placeholder="A beautiful custom theme"
                        value={themeDescription}
                        onChange={(e) => setThemeDescription(e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setSaveDialogOpen(false)}
                      className="rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveCustomTheme} className="rounded-lg">
                      Save Theme
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </SidebarHeader>

        

        {/* Main Content - Full height with flex */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Theme Controls */}
          <div className="w-80 border-r bg-background/50 overflow-y-auto hide-scrollbar">
            <div className="p-4 space-y-6">
              {/* Preset Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme Preset</Label>
                <Select
                  value={state.selectedPresetId}
                  onValueChange={changePreset}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {THEME_PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.id}
                        value={preset.id}
                        className="rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="w-3 h-3 rounded-full border"
                                style={{
                                  backgroundColor:
                                    preset.styles.light[
                                      `chart-${i}` as keyof ThemeStyleProps
                                    ] || "#000",
                                }}
                              />
                            ))}
                          </div>
                          <span>{preset.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {currentPreset.description}
                </p>
              </div>

              <Separator />

              {/* Chart Colors */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Chart Colors
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {[1, 2, 3, 4, 5].map((i) => {
                    const key = `chart-${i}` as keyof ThemeStyleProps;
                    const currentStyles = getCurrentStyles();
                    return (
                      <ColorInput
                        key={i}
                        label={`Chart ${i}`}
                        value={currentStyles[key] || ""}
                        onChange={(value) => updateStyle(key, value)}
                      />
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Base Colors */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Base Colors
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {(() => {
                    const currentStyles = getCurrentStyles();
                    return (
                      <>
                        <ColorInput
                          label="Background"
                          value={currentStyles.background}
                          onChange={(value) => updateStyle("background", value)}
                        />
                        <ColorInput
                          label="Foreground"
                          value={currentStyles.foreground}
                          onChange={(value) => updateStyle("foreground", value)}
                        />
                        <ColorInput
                          label="Primary"
                          value={currentStyles.primary}
                          onChange={(value) => updateStyle("primary", value)}
                        />
                        <ColorInput
                          label="Primary Foreground"
                          value={currentStyles["primary-foreground"]}
                          onChange={(value) =>
                            updateStyle("primary-foreground", value)
                          }
                        />
                      </>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Card Colors */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Card Colors
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {(() => {
                    const currentStyles = getCurrentStyles();
                    return (
                      <>
                        <ColorInput
                          label="Card"
                          value={currentStyles.card}
                          onChange={(value) => updateStyle("card", value)}
                        />
                        <ColorInput
                          label="Card Foreground"
                          value={currentStyles["card-foreground"]}
                          onChange={(value) =>
                            updateStyle("card-foreground", value)
                          }
                        />
                        <ColorInput
                          label="Border"
                          value={currentStyles.border || ""}
                          onChange={(value) => updateStyle("border", value)}
                        />
                      </>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Typography */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Typography
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {(() => {
                    const currentStyles = getCurrentStyles();
                    return (
                      <>
                        {/* Font Families */}
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Heading Font</Label>
                            <Select
                              value={
                                currentStyles["font-serif"] ||
                                "Playfair Display, serif"
                              }
                              onValueChange={(value) =>
                                updateStyle("font-serif", value)
                              }
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {HEADING_FONT_FAMILIES.map((font) => (
                                  <SelectItem
                                    key={font.value}
                                    value={font.value}
                                    className="text-xs rounded-md"
                                  >
                                    <span style={{ fontFamily: font.value }}>
                                      {font.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Body Font</Label>
                            <Select
                              value={currentStyles["font-sans"]}
                              onValueChange={(value) =>
                                updateStyle("font-sans", value)
                              }
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {FONT_FAMILIES.map((font) => (
                                  <SelectItem
                                    key={font.value}
                                    value={font.value}
                                    className="text-xs rounded-md"
                                  >
                                    <span style={{ fontFamily: font.value }}>
                                      {font.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator />

                        {/* Font Sizes */}
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">H1 Size</Label>
                            <Select
                              value={currentStyles["font-size-lg"] || "36px"}
                              onValueChange={(value) =>
                                updateStyle("font-size-lg", value)
                              }
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {FONT_SIZES.filter(
                                  (size) => parseInt(size.value) >= 24
                                ).map((size) => (
                                  <SelectItem
                                    key={size.value}
                                    value={size.value}
                                    className="text-xs rounded-md"
                                  >
                                    {size.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">H2 Size</Label>
                            <Select
                              value={currentStyles["font-size-base"] || "24px"}
                              onValueChange={(value) =>
                                updateStyle("font-size-base", value)
                              }
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {FONT_SIZES.filter(
                                  (size) =>
                                    parseInt(size.value) >= 20 &&
                                    parseInt(size.value) <= 32
                                ).map((size) => (
                                  <SelectItem
                                    key={size.value}
                                    value={size.value}
                                    className="text-xs rounded-md"
                                  >
                                    {size.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">H3 Size</Label>
                            <Select
                              value={currentStyles["font-size-sm"] || "20px"}
                              onValueChange={(value) =>
                                updateStyle("font-size-sm", value)
                              }
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {FONT_SIZES.filter(
                                  (size) =>
                                    parseInt(size.value) >= 16 &&
                                    parseInt(size.value) <= 28
                                ).map((size) => (
                                  <SelectItem
                                    key={size.value}
                                    value={size.value}
                                    className="text-xs rounded-md"
                                  >
                                    {size.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Paragraph Size</Label>
                            <Select
                              value={currentStyles["font-size-base"] || "16px"}
                              onValueChange={(value) =>
                                updateStyle("font-size-base", value)
                              }
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {FONT_SIZES.filter(
                                  (size) =>
                                    parseInt(size.value) >= 12 &&
                                    parseInt(size.value) <= 20
                                ).map((size) => (
                                  <SelectItem
                                    key={size.value}
                                    value={size.value}
                                    className="text-xs rounded-md"
                                  >
                                    {size.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Right Content - Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Preview Header */}
            <div className="border-b p-4 bg-background">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Preview</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      previewMode:
                        prev.previewMode === "light" ? "dark" : "light",
                    }))
                  }
                  className="rounded-lg"
                >
                  {state.previewMode === "light" ? "Dark" : "Light"} Mode
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </SidebarInset>
  );
}

// Color Input Component
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex gap-2">
        <div
          className="w-8 h-8 rounded-lg border-2 border-border flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="oklch(0.81 0.10 252)"
          className="text-xs flex-1 rounded-lg"
        />
      </div>
    </div>
  );
}

// Dashboard Preview Component
function DashboardPreview() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-serif">Dashboard Analytics</h1>
        <p className="text-muted-foreground font-sans">
          Monitor your key performance indicators and track business metrics in
          real-time with customizable charts and visualizations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2,350</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +201 since last hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="font-serif">Revenue Trend</CardTitle>
          <CardDescription>
            Monthly revenue over the past 12 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <LineChartComponent />
          </div>
        </CardContent>
      </Card>

      {/* Area Chart */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="font-serif">User Growth</CardTitle>
          <CardDescription>Active users and new registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <AreaChartComponent />
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="font-serif">Sales by Category</CardTitle>
          <CardDescription>
            Performance across different product categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <BarChartComponent />
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="font-serif">Traffic Sources</CardTitle>
          <CardDescription>Website traffic breakdown by source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <PieChartComponent />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Chart Components
function LineChartComponent() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 600 200"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="0"
          y1={i * 40}
          x2="600"
          y2={i * 40}
          stroke="var(--border)"
          strokeWidth="1"
          opacity="0.2"
        />
      ))}

      {/* Line path */}
      <path
        d="M 0 120 L 50 100 L 100 80 L 150 110 L 200 90 L 250 70 L 300 85 L 350 60 L 400 40 L 450 55 L 500 35 L 550 20 L 600 25"
        fill="url(#lineGradient)"
        stroke="var(--chart-1)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />

      {/* Data points */}
      {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600].map(
        (x, i) => {
          const y = [120, 100, 80, 110, 90, 70, 85, 60, 40, 55, 35, 20, 25][i];
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="var(--chart-1)"
              stroke="var(--background)"
              strokeWidth="2"
            />
          );
        }
      )}
    </svg>
  );
}

function AreaChartComponent() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 600 200"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="areaGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="areaGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--chart-3)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Area 1 */}
      <path
        d="M 0 150 L 100 130 L 200 140 L 300 120 L 400 110 L 500 100 L 600 90 L 600 200 L 0 200 Z"
        fill="url(#areaGradient1)"
        stroke="var(--chart-2)"
        strokeWidth="2"
      />

      {/* Area 2 */}
      <path
        d="M 0 180 L 100 170 L 200 175 L 300 160 L 400 155 L 500 150 L 600 140 L 600 200 L 0 200 Z"
        fill="url(#areaGradient2)"
        stroke="var(--chart-3)"
        strokeWidth="2"
      />
    </svg>
  );
}

function BarChartComponent() {
  const data = [45, 78, 62, 89, 56, 73, 91, 67];
  const maxValue = Math.max(...data);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 600 200"
      className="overflow-visible"
    >
      {data.map((value, i) => {
        const barHeight = (value / maxValue) * 160;
        const x = i * 70 + 20;
        const y = 200 - barHeight - 20;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="50"
            height={barHeight}
            fill={`var(--chart-${(i % 5) + 1})`}
            rx="4"
          />
        );
      })}
    </svg>
  );
}

function PieChartComponent() {
  const data = [30, 25, 20, 15, 10];
  const total = data.reduce((sum, value) => sum + value, 0);
  let cumulativeAngle = 0;
  const radius = 80;
  const centerX = 150;
  const centerY = 150;

  return (
    <svg width="300" height="300" viewBox="0 0 300 300">
      {data.map((value, i) => {
        const angle = (value / total) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + angle;

        const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
        const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
        const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
        const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        const pathData = [
          `M ${centerX} ${centerY}`,
          `L ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          "Z",
        ].join(" ");

        cumulativeAngle += angle;

        return (
          <path
            key={i}
            d={pathData}
            fill={`var(--chart-${i + 1})`}
            stroke="var(--background)"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
}
