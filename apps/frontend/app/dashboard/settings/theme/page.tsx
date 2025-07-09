"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, Plus, Trash2, RotateCcw, Check, Palette, 
  Edit2, Copy, Star, StarOff 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  defaultPalettes, 
  hexToHslString, 
  hslStringToHex, 
  hslToCss 
} from "@/lib/color-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ColorPalette {
  id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  chartColors: {
    [key: string]: string; // HSL format like "220 70% 50%"
  };
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

export default function ThemeSettingsPage() {
  const { user } = useUser();
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPalette, setEditingPalette] = useState<ColorPalette | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadColorPalettes();
  }, [user]);

  const loadColorPalettes = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/color-palettes');
      if (response.ok) {
        const data = await response.json();
        setPalettes(data.palettes || []);
      }
    } catch (error) {
      console.error('Failed to load color palettes:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePalette = async (palette: ColorPalette) => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const method = palette.id ? 'PUT' : 'POST';
      const url = palette.id 
        ? `/api/user/color-palettes/${palette.id}`
        : '/api/user/color-palettes';
        
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(palette)
      });
      
      if (response.ok) {
        await loadColorPalettes();
        setMessage({ type: 'success', text: 'Palette saved successfully!' });
        setEditingPalette(null);
        setIsCreateDialogOpen(false);
      } else {
        throw new Error('Failed to save palette');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save palette. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const deletePalette = async (paletteId: string) => {
    if (!user || !confirm('Are you sure you want to delete this palette?')) return;
    
    try {
      const response = await fetch(`/api/user/color-palettes/${paletteId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadColorPalettes();
        setMessage({ type: 'success', text: 'Palette deleted successfully!' });
      } else {
        throw new Error('Failed to delete palette');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete palette. Please try again.' });
    }
  };

  const setDefaultPalette = async (paletteId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/user/color-palettes/${paletteId}/set-default`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadColorPalettes();
        setMessage({ type: 'success', text: 'Default palette updated!' });
      } else {
        throw new Error('Failed to set default palette');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update default palette.' });
    }
  };

  const duplicatePalette = (palette: ColorPalette) => {
    const newPalette: ColorPalette = {
      ...palette,
      id: undefined,
      name: `${palette.name} (Copy)`,
      isDefault: false
    };
    setEditingPalette(newPalette);
    setIsCreateDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Color Palettes</h2>
          <p className="text-muted-foreground">
            Manage your color palettes for charts and branding.
          </p>
        </div>
        
        <Button onClick={() => {
          setEditingPalette({
            name: "New Palette",
            isDefault: false,
            chartColors: {
              "chart-1": "220 70% 50%",
              "chart-2": "140 70% 50%",
              "chart-3": "30 70% 50%",
              "chart-4": "0 70% 50%",
              "chart-5": "270 70% 50%",
            }
          });
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Palette
        </Button>
      </div>

      {message && (
        <div className={cn(
          "p-3 rounded-md text-sm",
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        )}>
          {message.text}
        </div>
      )}

      {/* Preset Palettes */}
      <div className="space-y-2">
        <Label>Quick Start Templates</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {defaultPalettes.map((preset) => (
            <Card 
              key={preset.name} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setEditingPalette({
                  ...preset,
                  isDefault: false
                });
                setIsCreateDialogOpen(true);
              }}
            >
              <div className="space-y-2">
                <h4 className="font-medium">{preset.name}</h4>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
                <div className="flex gap-1">
                  {Object.values(preset.chartColors).slice(0, 5).map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: hslToCss(color) }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* User Palettes */}
      <div className="space-y-2">
        <Label>Your Palettes</Label>
        {palettes.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No custom palettes yet. Create one to get started!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {palettes.map((palette) => (
              <Card key={palette.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{palette.name}</h4>
                        {palette.isDefault && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {palette.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {palette.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDefaultPalette(palette.id!)}
                        title={palette.isDefault ? "Current default" : "Set as default"}
                      >
                        {palette.isDefault ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPalette(palette);
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicatePalette(palette)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePalette(palette.id!)}
                        disabled={palette.isDefault}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Color Preview */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Chart Colors</div>
                    <div className="flex gap-1">
                      {Object.entries(palette.chartColors).map(([key, color]) => (
                        <div
                          key={key}
                          className="flex-1 h-8 rounded"
                          style={{ backgroundColor: hslToCss(color) }}
                          title={`${key}: hsl(${color})`}
                        />
                      ))}
                    </div>
                    
                    {palette.brandColors && Object.keys(palette.brandColors).length > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground">Brand Colors</div>
                        <div className="flex gap-1">
                          {Object.entries(palette.brandColors).map(([key, color]) => (
                            color && (
                              <div
                                key={key}
                                className="h-6 px-3 rounded flex items-center justify-center text-xs font-medium"
                                style={{ 
                                  backgroundColor: hslToCss(color),
                                  color: 'white'
                                }}
                              >
                                {key}
                              </div>
                            )
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <PaletteEditDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setEditingPalette(null);
        }}
        palette={editingPalette}
        onSave={savePalette}
        saving={saving}
      />
    </div>
  );
}

interface PaletteEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  palette: ColorPalette | null;
  onSave: (palette: ColorPalette) => Promise<void>;
  saving: boolean;
}

function PaletteEditDialog({ isOpen, onClose, palette, onSave, saving }: PaletteEditDialogProps) {
  const [editedPalette, setEditedPalette] = useState<ColorPalette | null>(palette);
  
  useEffect(() => {
    setEditedPalette(palette);
  }, [palette]);
  
  if (!editedPalette) return null;
  
  const updateChartColor = (key: string, value: string) => {
    setEditedPalette(prev => {
      if (!prev) return null;
      
      // Try to parse as hex and convert to HSL
      let hslValue = value;
      if (value.startsWith('#')) {
        try {
          hslValue = hexToHslString(value);
        } catch (e) {
          // If conversion fails, keep original value
        }
      }
      
      return {
        ...prev,
        chartColors: {
          ...prev.chartColors,
          [key]: hslValue
        }
      };
    });
  };
  
  const addChartColor = () => {
    setEditedPalette(prev => {
      if (!prev) return null;
      
      const existingKeys = Object.keys(prev.chartColors);
      const lastNum = existingKeys
        .map(k => parseInt(k.replace('chart-', '')))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a)[0] || 0;
      
      return {
        ...prev,
        chartColors: {
          ...prev.chartColors,
          [`chart-${lastNum + 1}`]: "0 0% 50%"
        }
      };
    });
  };
  
  const removeChartColor = (key: string) => {
    setEditedPalette(prev => {
      if (!prev) return null;
      
      const { [key]: _, ...rest } = prev.chartColors;
      return {
        ...prev,
        chartColors: rest
      };
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editedPalette.id ? 'Edit' : 'Create'} Color Palette
          </DialogTitle>
          <DialogDescription>
            Define chart colors using HSL values or hex codes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Palette Name</Label>
            <Input
              id="name"
              value={editedPalette.name}
              onChange={(e) => setEditedPalette(prev => prev ? {...prev, name: e.target.value} : null)}
              placeholder="My Custom Palette"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={editedPalette.description || ''}
              onChange={(e) => setEditedPalette(prev => prev ? {...prev, description: e.target.value} : null)}
              placeholder="Describe when to use this palette..."
              rows={2}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Chart Colors</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addChartColor}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Color
              </Button>
            </div>
            
            <div className="space-y-2">
              {Object.entries(editedPalette.chartColors).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="w-20 text-sm">{key}</Label>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded border cursor-pointer"
                      style={{ backgroundColor: hslToCss(color) }}
                      onClick={() => {
                        const input = document.getElementById(`color-${key}`) as HTMLInputElement;
                        input?.click();
                      }}
                    />
                    <input
                      id={`color-${key}`}
                      type="color"
                      value={hslStringToHex(color)}
                      onChange={(e) => updateChartColor(key, e.target.value)}
                      className="sr-only"
                    />
                    <Input
                      value={color}
                      onChange={(e) => updateChartColor(key, e.target.value)}
                      placeholder="220 70% 50%"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeChartColor(key)}
                      disabled={Object.keys(editedPalette.chartColors).length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 bg-muted rounded-md text-xs">
              <p className="font-medium mb-1">HSL Format:</p>
              <p>Enter colors as "hue saturation% lightness%" (e.g., "220 70% 50%")</p>
              <p className="mt-1">Or use the color picker to select colors visually.</p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedPalette)} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Palette'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}