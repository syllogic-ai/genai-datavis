"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface ChartColors {
  [key: string]: string; // HSL format like "220 70% 50%"
}

interface ColorPalette {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  chartColors: ChartColors;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

interface ThemeContextType {
  defaultPalette: ColorPalette | null;
  palettes: ColorPalette[];
  chartColors: ChartColors;
  updateDefaultPalette: (palette: ColorPalette) => void;
  isLoading: boolean;
}

const defaultChartColors: ChartColors = {
  "chart-1": "220 70% 50%",
  "chart-2": "140 70% 50%",
  "chart-3": "30 70% 50%",
  "chart-4": "0 70% 50%",
  "chart-5": "270 70% 50%",
};

const ThemeContext = createContext<ThemeContextType>({
  defaultPalette: null,
  palettes: [],
  chartColors: defaultChartColors,
  updateDefaultPalette: () => {},
  isLoading: true
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [defaultPalette, setDefaultPalette] = useState<ColorPalette | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      loadColorPalettes();
    } else if (isLoaded && !user) {
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  const loadColorPalettes = async () => {
    try {
      const response = await fetch('/api/user/color-palettes');
      if (response.ok) {
        const data = await response.json();
        const allPalettes = data.palettes || [];
        setPalettes(allPalettes);
        
        // Find the default palette
        const defaultPal = allPalettes.find((p: ColorPalette) => p.isDefault);
        setDefaultPalette(defaultPal || null);
      }
    } catch (error) {
      console.error('Failed to load color palettes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDefaultPalette = (palette: ColorPalette) => {
    setDefaultPalette(palette);
    // Update the palettes list
    setPalettes(prev => prev.map(p => ({
      ...p,
      isDefault: p.id === palette.id
    })));
  };

  const chartColors = defaultPalette?.chartColors || defaultChartColors;

  return (
    <ThemeContext.Provider value={{ 
      defaultPalette, 
      palettes, 
      chartColors, 
      updateDefaultPalette, 
      isLoading 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}