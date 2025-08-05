"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Theme, ThemeStyleProps } from "@/db/schema";
import { THEME_PRESETS } from "@/lib/theme-presets";

interface DashboardThemeContextType {
  theme: Theme | null;
  activeTheme: Theme | null;
  isLoading: boolean;
  error: string | null;
  setActiveTheme: (themeId: string | null) => Promise<void>;
  getThemeStyles: () => ThemeStyleProps | null;
  themeClassName: string;
}

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined);

// Function to clean up global theme variables
function cleanupGlobalTheme() {
  const root = document.documentElement;
  
  // List of theme variables to remove
  const themeVariables = [
    'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
    'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
    'accent', 'accent-foreground', 'destructive', 'destructive-foreground', 'border', 'input', 'ring',
    'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
    'font-family', 'font-mono', 'font-serif', 'border-radius', 'letter-spacing', 'spacing',
    'shadow-offset-x', 'shadow-offset-y', 'shadow-blur', 'shadow-spread', 'shadow-color', 'shadow-opacity',
    'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'show-grid-lines'
  ];

  // Remove all theme variables from :root
  themeVariables.forEach(variable => {
    root.style.removeProperty(`--${variable}`);
  });
}

export function DashboardThemeProvider({
  dashboardId,
  children,
}: {
  dashboardId: string;
  children: React.ReactNode;
}) {
  
  const [activeTheme, setActiveThemeState] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [themeClassName, setThemeClassName] = useState<string>('');

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
      
      // Respect the global theme state instead of forcing light mode
      setIsDark(isDarkMode);
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

  const loadDashboardTheme = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/dashboard/${dashboardId}/theme`);
      if (!response.ok) throw new Error('Failed to get dashboard theme');
      
      const data = await response.json();
      console.log('Dashboard theme:', data.theme);
      setActiveThemeState(data.theme);
    } catch (err) {
      console.error('Error loading dashboard theme:', err);
      setError(err instanceof Error ? err.message : "Failed to load theme");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  // Load dashboard theme on mount
  useEffect(() => {
    loadDashboardTheme();
  }, [dashboardId, loadDashboardTheme]);

  // Apply active theme to CSS variables
  useEffect(() => {
    let className = '';
    
    if (activeTheme) {
      console.log('Applying theme with isDark:', isDark);
      className = applyThemeToDOM(activeTheme, isDark, dashboardId);
    } else {
      // If no active theme, apply default preset theme
      console.log('No active theme, applying default preset');
      const defaultPreset = THEME_PRESETS.find(p => p.id === 'default');
      if (defaultPreset) {
        const defaultTheme = {
          id: defaultPreset.id,
          userId: '',
          name: defaultPreset.name,
          description: defaultPreset.description || null,
          isDefault: false,
          presetId: defaultPreset.id,
          styles: defaultPreset.styles as { light: ThemeStyleProps; dark: ThemeStyleProps },
          createdAt: null,
          updatedAt: null,
        };
        className = applyThemeToDOM(defaultTheme, isDark, dashboardId);
      }
    }
    
    // Set the theme class name
    setThemeClassName(className);
    
    // Return cleanup function to remove theme styles when component unmounts
    return () => {
      const styleElement = document.getElementById(`theme-${dashboardId}`);
      if (styleElement) {
        styleElement.remove();
      }
      // No need to clean up global variables since we don't apply them globally anymore
    };
  }, [activeTheme, isDark, dashboardId]);

  const setActiveTheme = async (themeId: string | null) => {
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });
      
      if (!response.ok) throw new Error('Failed to set dashboard theme');

      // Reload the theme to get updated data
      await loadDashboardTheme();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set theme");
    }
  };

  const getThemeStyles = (): ThemeStyleProps | null => {
    if (!activeTheme) return null;
    return isDark ? activeTheme.styles.dark : activeTheme.styles.light;
  };

  const value: DashboardThemeContextType = {
    theme: activeTheme,
    activeTheme,
    isLoading,
    error,
    setActiveTheme,
    getThemeStyles,
    themeClassName,
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

// Apply theme styles to CSS variables - SCOPED TO DASHBOARD CONTENT ONLY
function applyThemeToDOM(theme: Theme, isDark: boolean, dashboardId: string) {
  const styles = isDark ? theme.styles.dark : theme.styles.light;
  
  console.log('Applying theme:', theme.name, 'isDark:', isDark, 'to dashboard:', dashboardId);
  console.log('Theme styles:', styles);

  // Create a unique CSS class for this dashboard's theme
  const themeClassName = `dashboard-theme-${dashboardId}`;
  
  // Remove any existing theme styles for this dashboard
  const existingStyle = document.getElementById(`theme-${dashboardId}`);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create a new style element with scoped CSS variables - NO GLOBAL APPLICATION
  const styleElement = document.createElement('style');
  styleElement.id = `theme-${dashboardId}`;
  
  let cssRules = `.${themeClassName} {\n`;

  // Apply all theme styles as CSS variables to the scoped class only
  Object.entries(styles).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cssRules += `  --${key}: ${value};
`;
    }
  });
  
  // Generate dynamic shadow from individual shadow properties
  const shadowColor = styles["shadow-color"] || "oklch(0 0 0)";
  const shadowOpacity = parseFloat(styles["shadow-opacity"] || "0.1");
  const shadowBlur = styles["shadow-blur"] || "3";
  const shadowSpread = styles["shadow-spread"] || "0";
  const shadowOffsetX = styles["shadow-offset-x"] || "0";
  const shadowOffsetY = styles["shadow-offset-y"] || "1";
  
  // Convert OKLCH color to rgba for better browser compatibility
  let shadowColorWithOpacity;
  if (shadowColor.startsWith('oklch(')) {
    const match = shadowColor.match(/oklch\(([^)]+)\)/);
    if (match) {
      const values = match[1].split(' ');
      const lightness = parseFloat(values[0]) || 0;
      const grayValue = Math.round(lightness * 255);
      shadowColorWithOpacity = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${shadowOpacity})`;
    } else {
      shadowColorWithOpacity = `rgba(0, 0, 0, ${shadowOpacity})`;
    }
  } else if (shadowColor.startsWith('hsl(')) {
    shadowColorWithOpacity = shadowColor.replace('hsl(', 'hsla(').replace(')', `, ${shadowOpacity})`)
  } else if (shadowColor.startsWith('rgb(')) {
    shadowColorWithOpacity = shadowColor.replace('rgb(', 'rgba(').replace(')', `, ${shadowOpacity})`)
  } else {
    shadowColorWithOpacity = `rgba(0, 0, 0, ${shadowOpacity})`;
  }
  
  // Generate the complete shadow string
  const dynamicShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowSpread}px ${shadowColorWithOpacity}`;
  
  // Add shadow CSS variables to scoped class only (no global application)
  cssRules += `  --shadow: ${dynamicShadow};
`;
  cssRules += `  --shadow-sm: ${dynamicShadow};
`;
  cssRules += `  --shadow-md: ${dynamicShadow};
`;
  cssRules += `  --shadow-lg: ${dynamicShadow};
`;

  cssRules += `}
`;
  
  // Add specific styles for dark mode if needed
  if (isDark) {
    cssRules += `.${themeClassName}.dark {
`;
    Object.entries(styles).forEach(([key, value]) => {
      if (typeof value === 'string') {
        cssRules += `  --${key}: ${value};
`;
      }
    });
    cssRules += `}
`;
  }
  
  // Apply the styles
  styleElement.textContent = cssRules;
  document.head.appendChild(styleElement);

  // Emit a custom event to notify components about theme changes
  window.dispatchEvent(new CustomEvent('theme-changed', {
    detail: { themeId: theme.id, isDark }
  }));

  // Return the theme class name so it can be applied to the dashboard container
  return themeClassName;
}