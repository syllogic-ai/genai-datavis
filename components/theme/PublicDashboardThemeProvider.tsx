"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme, ThemeStyleProps } from "@/db/schema";
import { THEME_PRESETS } from "@/lib/theme-presets";

interface PublicDashboardThemeContextType {
  theme: Theme | null;
  activeTheme: Theme | null;
  isLoading: boolean;
  error: string | null;
  getThemeStyles: () => ThemeStyleProps | null;
  themeClassName: string;
}

const PublicDashboardThemeContext = createContext<PublicDashboardThemeContextType | undefined>(undefined);

export function PublicDashboardThemeProvider({
  dashboardId,
  theme,
  dashboardData,
  children,
}: {
  dashboardId: string;
  theme?: Theme | null;
  dashboardData?: any;
  children: React.ReactNode;
}) {
  
  const [activeTheme, setActiveTheme] = useState<Theme | null>(theme || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [themeClassName, setThemeClassName] = useState<string>('');
  const [themeMode] = useState<'light' | 'dark' | 'system'>(dashboardData?.themeMode || 'system');

  // Determine dark mode based on dashboard theme mode preference
  useEffect(() => {
    const updateDarkMode = () => {
      let shouldBeDark = false;
      
      if (themeMode === 'dark') {
        shouldBeDark = true;
      } else if (themeMode === 'light') {
        shouldBeDark = false;
      } else if (themeMode === 'system') {
        // For system mode, check both HTML class and system preference
        const hasClass = document.documentElement.classList.contains('dark');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        shouldBeDark = hasClass || systemDark;
      }
      
      console.log('Public dashboard theme mode check:', {
        themeMode,
        shouldBeDark,
        htmlClasses: document.documentElement.className
      });
      
      setIsDark(shouldBeDark);
    };

    updateDarkMode();
    
    // Only listen for system changes if mode is 'system'
    if (themeMode === 'system') {
      // Listen for class changes on html element
      const observer = new MutationObserver(updateDarkMode);
      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class'] 
      });

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateDarkMode);

      return () => {
        observer.disconnect();
        mediaQuery.removeEventListener('change', updateDarkMode);
      };
    }
  }, [themeMode]);

  // Set active theme from props
  useEffect(() => {
    setActiveTheme(theme || null);
  }, [theme]);

  // Apply active theme to CSS variables
  useEffect(() => {
    let className = '';
    
    if (activeTheme) {
      console.log('Applying public dashboard theme with isDark:', isDark);
      className = applyThemeToDOM(activeTheme, isDark, dashboardId);
    } else {
      // If no active theme, apply default preset theme
      console.log('No active theme, applying default preset for public dashboard');
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
    };
  }, [activeTheme, isDark, dashboardId]);

  const getThemeStyles = (): ThemeStyleProps | null => {
    if (!activeTheme) return null;
    return isDark ? activeTheme.styles.dark : activeTheme.styles.light;
  };

  const value: PublicDashboardThemeContextType = {
    theme: activeTheme,
    activeTheme,
    isLoading,
    error,
    getThemeStyles,
    themeClassName,
  };

  return (
    <PublicDashboardThemeContext.Provider value={value}>
      {children}
    </PublicDashboardThemeContext.Provider>
  );
}

export function usePublicDashboardTheme() {
  const context = useContext(PublicDashboardThemeContext);
  if (context === undefined) {
    throw new Error("usePublicDashboardTheme must be used within a PublicDashboardThemeProvider");
  }
  return context;
}

// Apply theme styles to CSS variables - SCOPED TO DASHBOARD CONTENT ONLY
function applyThemeToDOM(theme: Theme, isDark: boolean, dashboardId: string) {
  const styles = isDark ? theme.styles.dark : theme.styles.light;
  
  console.log('Applying public theme:', theme.name, 'isDark:', isDark, 'to dashboard:', dashboardId);
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
      cssRules += `  --${key}: ${value};\n`;
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
  cssRules += `  --shadow: ${dynamicShadow};\n`;
  cssRules += `  --shadow-sm: ${dynamicShadow};\n`;
  cssRules += `  --shadow-md: ${dynamicShadow};\n`;
  cssRules += `  --shadow-lg: ${dynamicShadow};\n`;

  cssRules += `}\n`;
  
  // Add specific styles for dark mode if needed
  if (isDark) {
    cssRules += `.${themeClassName}.dark {\n`;
    Object.entries(styles).forEach(([key, value]) => {
      if (typeof value === 'string') {
        cssRules += `  --${key}: ${value};\n`;
      }
    });
    cssRules += `}\n`;
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