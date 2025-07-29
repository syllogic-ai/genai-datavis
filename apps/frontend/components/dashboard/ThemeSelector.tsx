"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Palette, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDashboardTheme } from "@/components/theme/DashboardThemeProvider";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { Theme } from "@/db/schema";

interface ThemeSelectorProps {
  dashboardId: string;
}

export function ThemeSelector({ dashboardId }: ThemeSelectorProps) {
  const router = useRouter();
  const { activeTheme, setActiveTheme, isLoading } = useDashboardTheme();
  const [userThemes, setUserThemes] = useState<Theme[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);

  // Load user themes
  useEffect(() => {
    const loadUserThemes = async () => {
      try {
        const response = await fetch('/api/themes');
        if (response.ok) {
          const data = await response.json();
          setUserThemes(data.themes || []);
        }
      } catch (error) {
        console.error('Error loading user themes:', error);
      } finally {
        setIsLoadingThemes(false);
      }
    };

    loadUserThemes();
  }, []);

  const handleThemeSelect = async (themeId: string | null) => {
    try {
      await setActiveTheme(themeId);
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  };

  const handleCreateNewTheme = () => {
    router.push('/dashboard/themes');
  };

  const getCurrentThemeName = () => {
    if (!activeTheme) return "Default";
    
    // Check if it's a preset theme
    const preset = THEME_PRESETS.find(p => p.id === activeTheme.id);
    if (preset) return preset.name;
    
    // It's a user theme
    return activeTheme.name;
  };

  // Combine all themes for the select
  const allThemes = [
    ...THEME_PRESETS.map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      isPreset: true,
      styles: preset.styles
    })),
    ...userThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description || '',
      isPreset: false,
      styles: theme.styles
    })),
    {
      id: 'create-new',
      name: 'Create new theme',
      description: 'Design your own custom theme',
      isPreset: false,
      styles: null
    }
  ];

  const handleValueChange = (value: string) => {
    if (value === 'create-new') {
      handleCreateNewTheme();
    } else {
      handleThemeSelect(value);
    }
  };

  return (
    <Select
      value={activeTheme?.id || 'default'}
      onValueChange={handleValueChange}
      disabled={isLoading}
    >
      <SelectTrigger className="h-fit py-1 px-4 rounded-lg text-sm font-medium gap-2 min-w-[120px]">
        <Palette className="size-4" />
        <span className="text-sm">{getCurrentThemeName()}</span>
      </SelectTrigger>
        <SelectContent className="rounded-lg max-w-[300px]">
          {allThemes.map((theme) => (
            <SelectItem
              key={theme.id}
              value={theme.id}
              textValue={theme.name}
              className="rounded-md"
            >
              {theme.id === 'create-new' ? (
                <div className="flex items-center gap-2 text-primary">
                  <Plus className="h-4 w-4" />
                  <span>{theme.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border border-border/50"
                        style={{
                          backgroundColor: theme.styles?.light?.[`chart-${i}` as keyof typeof theme.styles.light] || "#000",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{theme.name}</div>
                  </div>
                </div>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  );
}