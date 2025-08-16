"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Upload,
  Trash2,
} from "lucide-react";
import { Theme, ThemeStyleProps } from "@/db/schema";
import { THEME_PRESETS } from "@/lib/theme-presets";
import toast, { Toaster } from "react-hot-toast";
import { ColorPicker } from "@/components/ui/color-picker";
import { hexToOklch, getDisplayColor, isValidHexColor, oklchToHex, isOklchColor } from "@/lib/color-utils";
import {
    SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CSSImportDialog } from "@/components/theme/CSSImportDialog";
import { preloadPopularFonts } from "@/lib/google-fonts";
import { GOOGLE_FONTS, loadGoogleFont } from "@/components/tiptap/GoogleFonts";

interface ThemeEditorState {
  selectedPresetId: string;
  selectedUserTheme: Theme | null;
  customizedStyles: Partial<ThemeStyleProps>;
  isModified: boolean;
  previewMode: "light" | "dark";
}

// Helper function to get font type from font-family string
const getFontType = (fontFamily: string): string => {
  if (fontFamily.includes('serif') && !fontFamily.includes('sans-serif')) {
    return 'Serif';
  }
  if (fontFamily.includes('monospace')) {
    return 'Mono';
  }
  return 'Sans';
};

// Create formatted font lists from Google Fonts
const SANS_SERIF_FONTS = GOOGLE_FONTS
  .filter(font => getFontType(font.value) === 'Sans')
  .map(font => ({
    value: font.value,
    label: `${font.name} (Sans)`,
    name: font.name
  }));

const SERIF_FONTS = GOOGLE_FONTS
  .filter(font => getFontType(font.value) === 'Serif')
  .map(font => ({
    value: font.value,
    label: `${font.name} (Serif)`,
    name: font.name
  }));

const MONO_FONTS = GOOGLE_FONTS
  .filter(font => getFontType(font.value) === 'Mono')
  .map(font => ({
    value: font.value,
    label: `${font.name} (Mono)`,
    name: font.name
  }));

// Combined lists for different use cases
const ALL_FONTS = [...SANS_SERIF_FONTS, ...SERIF_FONTS, ...MONO_FONTS];
const HEADING_FONTS = [...SERIF_FONTS, ...SANS_SERIF_FONTS]; // Prefer serif for headings, but include sans as options

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
    selectedUserTheme: null,
    customizedStyles: {},
    isModified: false,
    previewMode: "light",
  });

  const [userThemes, setUserThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load user themes
  useEffect(() => {
    loadUserThemes();
  }, []);

  // Preload popular Google Fonts for better performance
  useEffect(() => {
    preloadPopularFonts().catch(error => {
      console.warn('Failed to preload popular fonts:', error);
    });
  }, []);

  // Apply theme styles only to preview container
  useEffect(() => {
    const currentStyles = getCurrentStyles();
    
    // Remove any existing preview theme styles
    const existingStyle = document.getElementById('theme-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create dynamic box-shadow from individual shadow properties
    const shadowColor = currentStyles["shadow-color"] || "oklch(0 0 0)";
    const shadowOpacity = parseFloat(currentStyles["shadow-opacity"] || "0.1");
    const shadowBlur = currentStyles["shadow-blur"] || "3";
    const shadowSpread = currentStyles["shadow-spread"] || "0";
    const shadowOffsetX = currentStyles["shadow-offset-x"] || "0";
    const shadowOffsetY = currentStyles["shadow-offset-y"] || "1";
    
    // Convert OKLCH color to rgba for better browser compatibility and opacity support
    let shadowColorWithOpacity;
    if (shadowColor.startsWith('oklch(')) {
      // Extract OKLCH values and convert to a usable format
      const match = shadowColor.match(/oklch\(([^)]+)\)/);
      if (match) {
        const values = match[1].split(' ');
        const lightness = parseFloat(values[0]) || 0;
        // Convert lightness to grayscale for shadow (0 = black, 1 = white)
        const grayValue = Math.round(lightness * 255);
        shadowColorWithOpacity = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${shadowOpacity})`;
      } else {
        shadowColorWithOpacity = `rgba(0, 0, 0, ${shadowOpacity})`;
      }
    } else if (shadowColor.startsWith('hsl(')) {
      shadowColorWithOpacity = shadowColor.replace('hsl(', 'hsla(').replace(')', `, ${shadowOpacity})`);
    } else if (shadowColor.startsWith('rgb(')) {
      shadowColorWithOpacity = shadowColor.replace('rgb(', 'rgba(').replace(')', `, ${shadowOpacity})`);
    } else {
      // Fallback to black with opacity
      shadowColorWithOpacity = `rgba(0, 0, 0, ${shadowOpacity})`;
    }
    
    // Generate the box-shadow string (offset-x offset-y blur-radius spread-radius color)
    const dynamicShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowSpread}px ${shadowColorWithOpacity}`;
    
    // Create scoped CSS for preview container only
    const styleElement = document.createElement('style');
    styleElement.id = 'theme-preview-styles';
    
    let cssRules = `.theme-preview-container {\n`;
    
    // Apply all theme styles as CSS variables to the preview container
    Object.entries(currentStyles).forEach(([key, value]) => {
      if (typeof value === "string") {
        cssRules += `  --${key}: ${value};\n`;
      }
    });
    
    // Add the dynamic shadow properties
    cssRules += `  --preview-shadow: ${dynamicShadow};\n`;
    cssRules += `  --preview-shadow-color: ${shadowColorWithOpacity};\n`;
    cssRules += `  --preview-shadow-blur: ${shadowBlur}px;\n`;
    cssRules += `  --preview-shadow-spread: ${shadowSpread}px;\n`;
    cssRules += `  --preview-shadow-offset-x: ${shadowOffsetX}px;\n`;
    cssRules += `  --preview-shadow-offset-y: ${shadowOffsetY}px;\n`;
    
    // Apply background and text styles to preview container
    cssRules += `  background-color: ${currentStyles.background};\n`;
    cssRules += `  color: ${currentStyles.foreground};\n`;
    cssRules += `  font-family: ${currentStyles["font-sans"]};\n`;
    
    cssRules += `}\n`;
    
    // Ensure TipTap editor inherits theme colors correctly within the preview
    cssRules += `.theme-preview-container .ProseMirror {\n`;
    cssRules += `  color: ${currentStyles.foreground} !important;\n`;
    cssRules += `}\n`;
    
    cssRules += `.theme-preview-container .ProseMirror h1,\n`;
    cssRules += `.theme-preview-container .ProseMirror h2,\n`;
    cssRules += `.theme-preview-container .ProseMirror h3,\n`;
    cssRules += `.theme-preview-container .ProseMirror h4,\n`;
    cssRules += `.theme-preview-container .ProseMirror h5,\n`;
    cssRules += `.theme-preview-container .ProseMirror h6 {\n`;
    cssRules += `  color: ${currentStyles.foreground} !important;\n`;
    cssRules += `}\n`;
    
    cssRules += `.theme-preview-container .ProseMirror p,\n`;
    cssRules += `.theme-preview-container .ProseMirror li {\n`;
    cssRules += `  color: ${currentStyles.foreground} !important;\n`;
    cssRules += `}\n`;
    
    // Add dark mode support for preview container
    if (state.previewMode === "dark") {
      cssRules += `.theme-preview-container.dark {\n`;
      cssRules += `  color-scheme: dark;\n`;
      cssRules += `}\n`;
      
      cssRules += `.theme-preview-container.dark .ProseMirror {\n`;
      cssRules += `  color: ${currentStyles.foreground} !important;\n`;
      cssRules += `}\n`;
      
      cssRules += `.theme-preview-container.dark .ProseMirror h1,\n`;
      cssRules += `.theme-preview-container.dark .ProseMirror h2,\n`;
      cssRules += `.theme-preview-container.dark .ProseMirror h3,\n`;
      cssRules += `.theme-preview-container.dark .ProseMirror h4,\n`;
      cssRules += `.theme-preview-container.dark .ProseMirror h5,\n`;
      cssRules += `.theme-preview-container.dark .ProseMirror h6 {\n`;
      cssRules += `  color: ${currentStyles.foreground} !important;\n`;
      cssRules += `}\n`;
      
      cssRules += `.theme-preview-container.dark .ProseMirror p,\n`;
      cssRules += `.theme-preview-container.dark .ProseMirror li {\n`;
      cssRules += `  color: ${currentStyles.foreground} !important;\n`;
      cssRules += `}\n`;
    }
    
    styleElement.textContent = cssRules;
    document.head.appendChild(styleElement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
          console.log(`Filtering out built-in theme by ID: ${theme.name} (${theme.id})`);
          return false;
        }
        // Exclude if theme name matches a built-in preset name (case-insensitive)
        if (builtInPresetNames.some(name => name.toLowerCase() === theme.name.toLowerCase())) {
          console.log(`Filtering out built-in theme by name: ${theme.name}`);
          return false;
        }
        return true;
      });
      
      setUserThemes(customThemes);
    } catch (error) {
      console.error("Error loading themes:", error);
      toast.error("Failed to load themes");
    } finally {
      setLoading(false);
    }
  };

  // Get current preset or user theme
  const currentPreset =
    THEME_PRESETS.find((p) => p.id === state.selectedPresetId) ||
    THEME_PRESETS[0];

  // Get current styles (base + customizations)
  const getCurrentStyles = useCallback((): ThemeStyleProps => {
    let baseStyles;
    
    if (state.selectedUserTheme) {
      // Use user theme styles
      baseStyles = state.previewMode === "dark"
        ? state.selectedUserTheme.styles.dark
        : state.selectedUserTheme.styles.light;
    } else {
      // Use built-in preset styles
      baseStyles = state.previewMode === "dark"
        ? currentPreset.styles.dark
        : currentPreset.styles.light;
    }

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
      
      // Emit theme change event for immediate updates
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('theme-changed', {
          detail: { key, value }
        }));
      }, 0);
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
      selectedUserTheme: null, // Clear user theme when selecting preset
      customizedStyles: {},
      isModified: false,
    }));
  }, []);

  // Change to user theme
  const changeUserTheme = useCallback((theme: Theme) => {
    setState((prev) => ({
      ...prev,
      selectedPresetId: "", // Clear preset when selecting user theme
      selectedUserTheme: theme,
      customizedStyles: {},
      isModified: false,
    }));
  }, []);

  // Save custom theme
  const saveCustomTheme = async () => {
    if (!state.isModified) return;

    try {
      const currentStyles = getCurrentStyles();

      const baseName = state.selectedUserTheme ? state.selectedUserTheme.name : currentPreset.name;
      const themeData = {
        name: themeName || `${baseName} Custom`,
        description: `Customized version of ${baseName}`,
        isDefault: false, // Ensure custom themes are never default
        styles: {
          light:
            state.previewMode === "light"
              ? currentStyles
              : state.selectedUserTheme
              ? { ...state.selectedUserTheme.styles.light, ...state.customizedStyles }
              : { ...currentPreset.styles.light, ...state.customizedStyles },
          dark:
            state.previewMode === "dark"
              ? currentStyles
              : state.selectedUserTheme
              ? { ...state.selectedUserTheme.styles.dark, ...state.customizedStyles }
              : { ...currentPreset.styles.dark, ...state.customizedStyles },
        },
      };

      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(themeData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        if (response.status === 401) {
          toast.error("Authentication required. Please sign in and try again.");
          return;
        }
        throw new Error(errorData.error || "Failed to save theme");
      }

      toast.success("Theme saved successfully!");
      setSaveDialogOpen(false);
      setThemeName("");
      loadUserThemes();
      setState((prev) => ({ ...prev, isModified: false }));
    } catch (error) {
      console.error("Error saving theme:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save theme";
      toast.error(errorMessage);
    }
  };

  // Handle CSS import
  const handleCSSImport = async (importedTheme: {
    name: string;
    description: string;
    styles: {
      light: ThemeStyleProps;
      dark: ThemeStyleProps;
    };
  }) => {
    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...importedTheme,
          isDefault: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        if (response.status === 401) {
          toast.error("Authentication required. Please sign in and try again.");
          return;
        }
        throw new Error(errorData.error || "Failed to import theme");
      }

      toast.success("Theme imported successfully!");
      await loadUserThemes();
      
      // Switch to the imported theme
      const data = await response.json();
      if (data.theme) {
        changeUserTheme(data.theme);
      }
    } catch (error) {
      console.error("Error importing theme:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to import theme";
      toast.error(errorMessage);
    }
  };

  // Show delete confirmation dialog
  const confirmDeleteTheme = () => {
    if (!state.selectedUserTheme) return;
    setDeleteDialogOpen(true);
  };

  // Delete current user theme
  const deleteCurrentTheme = async () => {
    if (!state.selectedUserTheme) return;

    try {
      console.log("Attempting to delete theme:", state.selectedUserTheme.id, state.selectedUserTheme.name);
      
      const response = await fetch(`/api/themes/${state.selectedUserTheme.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete theme";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error("Delete theme error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          themeId: state.selectedUserTheme.id,
          themeName: state.selectedUserTheme.name,
          isDefault: state.selectedUserTheme.isDefault
        });
        
        if (response.status === 403) {
          toast.error("Cannot delete this theme - it may be a default theme");
        } else if (response.status === 404) {
          toast.error("Theme not found or access denied");
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      toast.success("Theme deleted successfully!");
      
      // Switch to default preset
      setState((prev) => ({
        ...prev,
        selectedPresetId: "default",
        selectedUserTheme: null,
        customizedStyles: {},
        isModified: false,
      }));
      
      setDeleteDialogOpen(false);
      await loadUserThemes();
    } catch (error) {
      console.error("Error deleting theme:", error);
      toast.error("Failed to delete theme");
      setDeleteDialogOpen(false);
    }
  };

  return (
    <SidebarInset className="bg-transparent overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <SidebarHeader className="flex-row shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">
            Theme Generator
          </h1>
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

        

        {/* Main Content - Grid layout with explicit height */}
        <div className="grid grid-cols-[320px_1fr] h-[calc(100vh-4rem)] overflow-hidden">
          {/* Left Sidebar - Theme Controls */}
          <div className="border-r bg-background/50 overflow-hidden">
            <div className="h-full overflow-auto hide-scrollbar">
              <div className="p-4 pb-8 space-y-6">
              {/* Preset Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme Preset</Label>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={commandOpen}
                  className="w-full justify-between rounded-lg"
                  onClick={() => setCommandOpen(true)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => {
                        let chartColor;
                        if (state.selectedUserTheme) {
                          chartColor = state.selectedUserTheme.styles.light[`chart-${i}` as keyof ThemeStyleProps];
                        } else {
                          const selectedPreset = THEME_PRESETS.find(p => p.id === state.selectedPresetId) || THEME_PRESETS[0];
                          chartColor = selectedPreset.styles.light[`chart-${i}` as keyof ThemeStyleProps];
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
                    <span>{state.selectedUserTheme ? state.selectedUserTheme.name : currentPreset.name}</span>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
                  <Command className="rounded-lg">
                    <CommandInput placeholder="Search themes..." />
                    <CommandList>
                      <CommandEmpty>No theme found.</CommandEmpty>
                      {userThemes.length > 0 && (
                        <CommandGroup heading="Your Custom Themes">
                          {userThemes.map((theme) => (
                            <CommandItem
                              key={theme.id}
                              value={theme.name}
                              onSelect={() => {
                                changeUserTheme(theme);
                                setCommandOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-1">
                                    {[1, 2, 3].map((i) => {
                                      const chartColor = theme.styles?.light?.[`chart-${i}` as keyof ThemeStyleProps];
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
                                  <div className="font-medium">{theme.name}</div>
                                </div>
                                {state.selectedUserTheme?.id === theme.id && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {userThemes.length > 0 && <CommandSeparator />}
                      <CommandGroup heading="Built-in Themes">
                        {THEME_PRESETS.map((preset) => (
                          <CommandItem
                            key={preset.id}
                            value={preset.name}
                            onSelect={() => {
                              changePreset(preset.id);
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
                                          preset.styles.light[
                                            `chart-${i}` as keyof ThemeStyleProps
                                          ] || "#000",
                                      }}
                                    />
                                  ))}
                                </div>
                                <div className="font-medium">{preset.name}</div>
                              </div>
                              {state.selectedPresetId === preset.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </CommandDialog>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CSS
                </Button>
                
                {state.selectedUserTheme && (
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={confirmDeleteTheme}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Theme
                  </Button>
                )}
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
                  <ColorInput
                    label="Chart Positive"
                    value={getCurrentStyles()["chart-positive"] || "oklch(0.5682 0.167 135.46)"}
                    onChange={(value) => updateStyle("chart-positive", value)}
                  />
                  <ColorInput
                    label="Chart Negative"
                    value={getCurrentStyles()["chart-negative"] || "oklch(0.4149 0.1695 28.96)"}
                    onChange={(value) => updateStyle("chart-negative", value)}
                  />
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

              {/* Border Colors */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Border Colors
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {(() => {
                    const currentStyles = getCurrentStyles();
                    return (
                      <>
                        <ColorInput
                          label="Primary Border"
                          value={currentStyles.border || ""}
                          onChange={(value) => updateStyle("border", value)}
                        />
                        <ColorInput
                          label="Input Border"
                          value={currentStyles.input || ""}
                          onChange={(value) => updateStyle("input", value)}
                        />
                        <ColorInput
                          label="Focus Ring"
                          value={currentStyles.ring || ""}
                          onChange={(value) => updateStyle("ring", value)}
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
                      </>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Chart Display Options */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Chart Display
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {(() => {
                    const currentStyles = getCurrentStyles();
                    const showGridLines = currentStyles["show-grid-lines"] !== "false";
                    
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-medium">Show Grid Lines</Label>
                            <p className="text-xs text-muted-foreground">
                              Display grid lines in charts for better readability
                            </p>
                          </div>
                          <Switch
                            checked={showGridLines}
                            onCheckedChange={(checked) => 
                              updateStyle("show-grid-lines", checked ? "true" : "false")
                            }
                          />
                        </div>
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
                              value={currentStyles["font-serif"] || SERIF_FONTS[0]?.value}
                              onValueChange={(value) => {
                                loadGoogleFont(value);
                                updateStyle("font-serif", value);
                              }}
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue placeholder="Select heading font..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg max-h-80">
                                {HEADING_FONTS.map((font) => (
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
                              value={currentStyles["font-sans"] || SANS_SERIF_FONTS[0]?.value}
                              onValueChange={(value) => {
                                loadGoogleFont(value);
                                updateStyle("font-sans", value);
                              }}
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue placeholder="Select body font..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg max-h-80">
                                {SANS_SERIF_FONTS.map((font) => (
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
                            <Label className="text-xs">Monospace Font</Label>
                            <Select
                              value={currentStyles["font-mono"] || MONO_FONTS[0]?.value}
                              onValueChange={(value) => {
                                loadGoogleFont(value);
                                updateStyle("font-mono", value);
                              }}
                            >
                              <SelectTrigger className="text-xs rounded-lg">
                                <SelectValue placeholder="Select monospace font..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg max-h-80">
                                {MONO_FONTS.map((font) => (
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

              <Separator />

              {/* Radius */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Radius
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 py-2">
                  {(() => {
                    const currentStyles = getCurrentStyles();
                    const radiusValue = parseFloat(currentStyles.radius?.replace('rem', '') || '0.5');
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Radius</Label>
                          <span className="text-xs text-muted-foreground">
                            {radiusValue.toFixed(3)} rem
                          </span>
                        </div>
                        <Slider
                          value={[radiusValue]}
                          onValueChange={([value]) => updateStyle("radius", `${value}rem`)}
                          max={2}
                          min={0}
                          step={0.125}
                          className="w-full"
                        />
                      </div>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Shadow */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:underline">
                  Shadow
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 py-2">
                  {(() => {
                    const currentStyles = getCurrentStyles();
                    const shadowColor = currentStyles["shadow-color"] || "oklch(0 0 0)";
                    const shadowOpacity = parseFloat(currentStyles["shadow-opacity"] || "0.1");
                    const blurRadius = parseFloat(currentStyles["shadow-blur"] || "3");
                    const shadowSpread = parseFloat(currentStyles["shadow-spread"] || "0");
                    const offsetX = parseFloat(currentStyles["shadow-offset-x"] || "0");
                    const offsetY = parseFloat(currentStyles["shadow-offset-y"] || "1");

                    // Generate shadow preview for display
                    const previewShadow = `${offsetX}px ${offsetY}px ${blurRadius}px ${shadowSpread}px rgba(0, 0, 0, ${shadowOpacity})`;

                    return (
                      <>
                        {/* Shadow Preview */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Shadow Preview</Label>
                          <div 
                            className="w-full h-16 bg-card border rounded-lg flex items-center justify-center text-xs text-muted-foreground"
                            style={{ boxShadow: `var(--preview-shadow, ${previewShadow})` }}
                          >
                            Preview Card
                          </div>
                        </div>

                        <ColorInput
                          label="Shadow Color"
                          value={shadowColor}
                          onChange={(value) => updateStyle("shadow-color", value)}
                        />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Shadow Opacity</Label>
                            <span className="text-xs text-muted-foreground">
                              {(shadowOpacity * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Slider
                            value={[shadowOpacity]}
                            onValueChange={([value]) => updateStyle("shadow-opacity", value.toString())}
                            max={1}
                            min={0}
                            step={0.05}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Blur Radius</Label>
                            <span className="text-xs text-muted-foreground">
                              {blurRadius}px
                            </span>
                          </div>
                          <Slider
                            value={[blurRadius]}
                            onValueChange={([value]) => updateStyle("shadow-blur", value.toString())}
                            max={50}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Spread</Label>
                            <span className="text-xs text-muted-foreground">
                              {shadowSpread}px
                            </span>
                          </div>
                          <Slider
                            value={[shadowSpread]}
                            onValueChange={([value]) => updateStyle("shadow-spread", value.toString())}
                            max={20}
                            min={-20}
                            step={1}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Offset X</Label>
                            <span className="text-xs text-muted-foreground">
                              {offsetX}px
                            </span>
                          </div>
                          <Slider
                            value={[offsetX]}
                            onValueChange={([value]) => updateStyle("shadow-offset-x", value.toString())}
                            max={20}
                            min={-20}
                            step={1}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Offset Y</Label>
                            <span className="text-xs text-muted-foreground">
                              {offsetY}px
                            </span>
                          </div>
                          <Slider
                            value={[offsetY]}
                            onValueChange={([value]) => updateStyle("shadow-offset-y", value.toString())}
                            max={20}
                            min={-20}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>
                </div>
            </div>
          </div>

          {/* Right Content - Preview */}
          <div className="flex flex-col bg-background overflow-hidden">
            {/* Preview Header - Fixed */}
            <div className="border-b p-4 bg-background h-fit shrink-0">
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

            {/* Preview Content - Scrollable */}
            <div className="h-[calc(100vh-8rem)] overflow-hidden">
              <div className="h-full overflow-auto hide-scrollbar">
                <div className={`theme-preview-container p-6 ${state.previewMode === "dark" ? "dark" : ""}`}>
                  <DashboardPreview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
      
      <CSSImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleCSSImport}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{state.selectedUserTheme?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCurrentTheme}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarInset>
  );
}

// Enhanced Color Input Component with Color Picker
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // Get the actual color to display in the picker
  const displayColor = React.useMemo(() => {
    if (isValidHexColor(value)) {
      return value;
    }
    if (isOklchColor(value)) {
      return oklchToHex(value);
    }
    // For CSS variables or other formats, use a default but show the actual value
    return '#6366f1';
  }, [value]);
  
  const handleColorPickerChange = (hexColor: string) => {
    // Convert hex to OKLCH and update
    const oklchColor = hexToOklch(hexColor);
    onChange(oklchColor);
  };
  
  const handleInputChange = (inputValue: string) => {
    // If user enters a hex color, convert to OKLCH
    if (isValidHexColor(inputValue)) {
      const oklchColor = hexToOklch(inputValue);
      onChange(oklchColor);
    } else {
      // Allow direct OKLCH or CSS variable input
      onChange(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="flex-shrink-0">
          <ColorPicker
            label=""
            color={displayColor}
            onChange={handleColorPickerChange}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="oklch(0.81 0.10 252)"
          className="text-xs flex-1 rounded-lg font-mono"
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
        <Card 
          className="rounded-xl" 
          style={{ boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))' }}
        >
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

        <Card 
          className="rounded-xl"
          style={{ boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))' }}
        >
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

        <Card 
          className="rounded-xl"
          style={{ boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))' }}
        >
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

        <Card 
          className="rounded-xl"
          style={{ boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))' }}
        >
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
      <Card 
        className="rounded-xl border"
        style={{ 
          boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--card)'
        }}
      >
        <CardHeader>
          <CardTitle className="font-serif" style={{ color: 'var(--card-foreground)' }}>Revenue Trend</CardTitle>
          <CardDescription style={{ color: 'var(--muted-foreground)' }}>
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
      <Card 
        className="rounded-xl border"
        style={{ 
          boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--card)'
        }}
      >
        <CardHeader>
          <CardTitle className="font-serif" style={{ color: 'var(--card-foreground)' }}>User Growth</CardTitle>
          <CardDescription style={{ color: 'var(--muted-foreground)' }}>Active users and new registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <AreaChartComponent />
          </div>
        </CardContent>
      </Card>

      {/* Border Style Preview */}
      <Card 
        className="rounded-xl border-2"
        style={{ 
          boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--card)'
        }}
      >
        <CardHeader>
          <CardTitle className="font-serif" style={{ color: 'var(--card-foreground)' }}>Border Style Preview</CardTitle>
          <CardDescription style={{ color: 'var(--muted-foreground)' }}>Example with thicker border to showcase border colors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="h-16 rounded-lg border flex items-center justify-center text-sm"
              style={{ 
                borderColor: 'var(--border)',
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)'
              }}
            >
              Primary Border
            </div>
            <div 
              className="h-16 rounded-lg border-2 flex items-center justify-center text-sm"
              style={{ 
                borderColor: 'var(--ring)',
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)'
              }}
            >
              Focus Ring
            </div>
            <div 
              className="h-16 rounded-lg border-dashed border-2 flex items-center justify-center text-sm"
              style={{ 
                borderColor: 'var(--input)',
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)'
              }}
            >
              Input Border
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card 
        className="rounded-xl border"
        style={{ 
          boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--card)'
        }}
      >
        <CardHeader>
          <CardTitle className="font-serif" style={{ color: 'var(--card-foreground)' }}>Sales by Category</CardTitle>
          <CardDescription style={{ color: 'var(--muted-foreground)' }}>
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
      <Card 
        className="rounded-xl border"
        style={{ 
          boxShadow: 'var(--preview-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--card)'
        }}
      >
        <CardHeader>
          <CardTitle className="font-serif" style={{ color: 'var(--card-foreground)' }}>Traffic Sources</CardTitle>
          <CardDescription style={{ color: 'var(--muted-foreground)' }}>Website traffic breakdown by source</CardDescription>
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
  const showGrid = (() => {
    try {
      const root = document.documentElement;
      const showGridLines = root.style.getPropertyValue('--show-grid-lines');
      return showGridLines !== 'false';
    } catch {
      return true; // Default to showing grid
    }
  })();

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

      {/* Grid lines - conditionally rendered */}
      {showGrid && [0, 1, 2, 3, 4].map((i) => (
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
  
  const showGrid = (() => {
    try {
      const root = document.documentElement;
      const showGridLines = root.style.getPropertyValue('--show-grid-lines');
      return showGridLines !== 'false';
    } catch {
      return true; // Default to showing grid
    }
  })();

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 600 200"
      className="overflow-visible"
    >
      {/* Grid lines - conditionally rendered */}
      {showGrid && [0, 1, 2, 3, 4].map((i) => (
        <line
          key={`grid-${i}`}
          x1="0"
          y1={i * 40}
          x2="600"
          y2={i * 40}
          stroke="var(--border)"
          strokeWidth="1"
          opacity="0.2"
        />
      ))}
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
