"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme, ThemeStyleProps } from "@/db/schema";

interface DashboardThemeContextType {
  theme: Theme | null;
  themes: Theme[];
  activeTheme: Theme | null;
  isLoading: boolean;
  error: string | null;
  setActiveTheme: (themeId: string) => Promise<void>;
  createTheme: (theme: Partial<Theme>) => Promise<void>;
  updateTheme: (themeId: string, updates: Partial<Theme>) => Promise<void>;
  deleteTheme: (themeId: string) => Promise<void>;
  getThemeStyles: () => ThemeStyleProps | null;
}

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined);

export function DashboardThemeProvider({
  dashboardId,
  children,
}: {
  dashboardId: string;
  children: React.ReactNode;
}) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveThemeState] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const hasClass = document.documentElement.classList.contains('dark');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDarkMode = hasClass || systemDark;
      
      console.log('Dark mode check:', {
        hasClass,
        systemDark,
        isDarkMode,
        htmlClasses: document.documentElement.className
      });
      
      // Temporary: force light mode for testing (disabling dark mode completely)
      setIsDark(false);
      // Remove dark class if it exists
      document.documentElement.classList.remove('dark');
      // setIsDark(isDarkMode);
    };

    checkDarkMode();
    
    // Listen for class changes on html element
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Fetch themes for the dashboard
  useEffect(() => {
    fetchThemes();
  }, [dashboardId]);

  // Apply active theme to CSS variables
  useEffect(() => {
    if (activeTheme) {
      console.log('Applying theme with isDark:', isDark);
      applyThemeToDOM(activeTheme, isDark);
    } else {
      // If no active theme, ensure we're in light mode with default colors
      console.log('No active theme, forcing light mode');
      const root = document.documentElement;
      root.classList.remove('dark');
      // Set basic light mode colors
      root.style.setProperty('--background', 'hsl(0 0% 100%)');
      root.style.setProperty('--foreground', 'hsl(0 1.64% 11.96%)');
    }
  }, [activeTheme, isDark]);

  const fetchThemes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/${dashboardId}/themes`);
      if (!response.ok) throw new Error("Failed to fetch themes");
      
      const data = await response.json();
      console.log('Fetched themes:', data.themes);
      setThemes(data.themes);
      
      // Set the active theme
      const active = data.themes.find((t: Theme) => t.isActive);
      console.log('Active theme:', active);
      setActiveThemeState(active || null);
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError(err instanceof Error ? err.message : "Failed to fetch themes");
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveTheme = async (themeId: string) => {
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}/themes/${themeId}/activate`, {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Failed to activate theme");
      
      // Refresh themes
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate theme");
    }
  };

  const createTheme = async (theme: Partial<Theme>) => {
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}/themes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      
      if (!response.ok) throw new Error("Failed to create theme");
      
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create theme");
    }
  };

  const updateTheme = async (themeId: string, updates: Partial<Theme>) => {
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}/themes/${themeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error("Failed to update theme");
      
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme");
    }
  };

  const deleteTheme = async (themeId: string) => {
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}/themes/${themeId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete theme");
      
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete theme");
    }
  };

  const getThemeStyles = (): ThemeStyleProps | null => {
    if (!activeTheme) return null;
    return isDark ? activeTheme.styles.dark : activeTheme.styles.light;
  };

  const value: DashboardThemeContextType = {
    theme: activeTheme,
    themes,
    activeTheme,
    isLoading,
    error,
    setActiveTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    getThemeStyles,
  };

  return (
    <DashboardThemeContext.Provider value={value}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);
  if (context === undefined) {
    throw new Error("useDashboardTheme must be used within a DashboardThemeProvider");
  }
  return context;
}

// Apply theme styles to CSS variables
function applyThemeToDOM(theme: Theme, isDark: boolean) {
  const styles = isDark ? theme.styles.dark : theme.styles.light;
  const root = document.documentElement;

  console.log('Applying theme:', theme.name, 'isDark:', isDark);
  console.log('Theme styles:', styles);

  // Ensure dark class matches our isDark state
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Force override body background to ensure it's not black
  document.body.style.backgroundColor = isDark ? 
    (styles.background || 'oklch(0.1400 0 0)') : 
    (styles.background || 'hsl(0 0% 100%)');

  // Apply chart colors
  Object.entries(styles).forEach(([key, value]) => {
    if (key.startsWith("chart-")) {
      // Set the CSS variable
      root.style.setProperty(`--${key}`, value);
      console.log(`Set --${key} to ${value}`);
    }
  });

  // Apply font settings
  if (styles["font-sans"]) {
    root.style.setProperty("--font-sans", styles["font-sans"]);
  }
  if (styles["font-serif"]) {
    root.style.setProperty("--font-serif", styles["font-serif"]);
  }
  if (styles["font-mono"]) {
    root.style.setProperty("--font-mono", styles["font-mono"]);
  }

  // Apply font sizes
  if (styles["font-size-base"]) {
    root.style.setProperty("--font-size-base", styles["font-size-base"]);
    // Also apply to body for global font size
    document.body.style.fontSize = styles["font-size-base"];
  }
  if (styles["font-size-sm"]) {
    root.style.setProperty("--font-size-sm", styles["font-size-sm"]);
  }
  if (styles["font-size-lg"]) {
    root.style.setProperty("--font-size-lg", styles["font-size-lg"]);
  }

  // Apply UI colors with fallbacks
  const uiColors = [
    "background", "foreground", "card", "card-foreground",
    "primary", "primary-foreground", "secondary", "secondary-foreground",
    "muted", "muted-foreground", "accent", "accent-foreground",
    "destructive", "destructive-foreground", "border", "input", "ring"
  ];

  // Define fallbacks for critical colors
  const fallbacks = isDark ? {
    background: 'oklch(0.1400 0 0)',
    foreground: 'oklch(1 0 0)',
    card: 'oklch(0.1800 0 0)',
    'card-foreground': 'oklch(1 0 0)'
  } : {
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(0 1.64% 11.96%)',
    card: 'hsl(20 20.00% 97.06%)',
    'card-foreground': 'hsl(0 0% 14.90%)'
  };

  uiColors.forEach(colorKey => {
    const value = styles[colorKey as keyof ThemeStyleProps] || fallbacks[colorKey as keyof typeof fallbacks];
    if (value) {
      root.style.setProperty(`--${colorKey}`, value);
      console.log(`Set --${colorKey} to ${value}`);
    }
  });

  // Apply other styling
  if (styles.radius) {
    root.style.setProperty("--radius", styles.radius);
  }
  if (styles.spacing) {
    root.style.setProperty("--spacing", styles.spacing);
  }

  // Apply shadow properties
  const shadowProps = [
    "shadow-color", "shadow-opacity", "shadow-blur",
    "shadow-spread", "shadow-offset-x", "shadow-offset-y"
  ];

  shadowProps.forEach(prop => {
    const key = prop as keyof ThemeStyleProps;
    if (styles[key]) {
      root.style.setProperty(`--${prop}`, styles[key]);
    }
  });

  // Apply letter spacing
  if (styles["letter-spacing"]) {
    root.style.setProperty("--letter-spacing", styles["letter-spacing"]);
  }
}