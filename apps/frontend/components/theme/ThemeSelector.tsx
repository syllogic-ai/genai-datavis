"use client";

import React, { useState } from "react";
import { useDashboardTheme } from "./DashboardThemeProvider";
import { Theme } from "@/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Palette, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_PRESETS } from "@/lib/theme-presets";

export function ThemeSelector({ dashboardId }: { dashboardId: string }) {
  const {
    themes,
    activeTheme,
    setActiveTheme,
    createTheme,
    deleteTheme,
    isLoading,
  } = useDashboardTheme();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeDescription, setNewThemeDescription] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("default");

  const handleCreateTheme = async () => {
    const preset = THEME_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset) return;

    await createTheme({
      name: newThemeName || preset.name,
      description: newThemeDescription || preset.description,
      styles: preset.styles,
      presetId: preset.id,
      isActive: false,
    });

    setIsCreateDialogOpen(false);
    setNewThemeName("");
    setNewThemeDescription("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Dashboard Theme</Label>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Theme
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Theme</DialogTitle>
              <DialogDescription>
                Create a new theme based on a preset. You can customize it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="My Custom Theme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-description">Description</Label>
                <Textarea
                  id="theme-description"
                  value={newThemeDescription}
                  onChange={(e) => setNewThemeDescription(e.target.value)}
                  placeholder="A brief description of your theme"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-preset">Base Preset</Label>
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger id="theme-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((i) => {
                              const color = preset.styles.light[`chart-${i}` as keyof typeof preset.styles.light];
                              return color ? (
                                <div
                                  key={i}
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              ) : null;
                            })}
                          </div>
                          <span>{preset.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTheme}>Create Theme</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Select
        value={activeTheme?.id || ""}
        onValueChange={(value) => setActiveTheme(value)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a theme">
            {activeTheme && (
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span>{activeTheme.name}</span>
                {activeTheme.isActive && (
                  <Check className="h-3 w-3 text-green-600" />
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const color = theme.styles.light[`chart-${i}` as keyof typeof theme.styles.light];
                      return (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                  </div>
                  <span>{theme.name}</span>
                </div>
                {theme.id !== activeTheme?.id && themes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTheme(theme.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeTheme?.description && (
        <p className="text-sm text-muted-foreground">{activeTheme.description}</p>
      )}

      <div className="space-y-2">
        <Label className="text-sm">Preview</Label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((i) => {
            const color = activeTheme?.styles.light[`chart-${i}` as keyof typeof activeTheme.styles.light];
            return (
              <div key={i} className="flex-1 space-y-1">
                <div
                  className="h-8 rounded"
                  style={{ backgroundColor: color || "#ccc" }}
                />
                <p className="text-xs text-center text-muted-foreground">
                  Chart {i}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}