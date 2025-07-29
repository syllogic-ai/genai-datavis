"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronDown, Type, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  fetchGoogleFonts, 
  filterFonts, 
  sortFontsByPopularity,
  loadGoogleFont,
  getFontFamilyString,
  type GoogleFont 
} from "@/lib/google-fonts";

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
  placeholder?: string;
  className?: string;
  previewText?: string;
  showCategory?: boolean;
  categories?: string[];
}

const FONT_CATEGORIES = [
  { value: 'all', label: 'All Fonts' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'display', label: 'Display' },
  { value: 'handwriting', label: 'Handwriting' },
];

export function FontSelector({
  value,
  onChange,
  placeholder = "Select font...",
  className,
  previewText = "The quick brown fox jumps over the lazy dog",
  showCategory = true,
  categories = FONT_CATEGORIES.map(c => c.value)
}: FontSelectorProps) {
  const [open, setOpen] = useState(false);
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(new Set());

  // Load Google Fonts on mount
  useEffect(() => {
    const loadFonts = async () => {
      try {
        setLoading(true);
        const googleFonts = await fetchGoogleFonts();
        const sortedFonts = sortFontsByPopularity(googleFonts);
        setFonts(sortedFonts);
      } catch (error) {
        console.error('Failed to load Google Fonts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFonts();
  }, []);

  // Filter fonts based on search and category
  const filteredFonts = useMemo(() => {
    const categoryFilter = categories.includes(selectedCategory) ? selectedCategory : 'all';
    return filterFonts(fonts, searchQuery, categoryFilter);
  }, [fonts, searchQuery, selectedCategory, categories]);

  // Load font when hovered or selected
  const handleFontLoad = async (fontFamily: string) => {
    if (loadingFonts.has(fontFamily)) return;

    setLoadingFonts(prev => new Set([...prev, fontFamily]));
    
    try {
      await loadGoogleFont(fontFamily, ['400', '500', '600', '700']);
    } catch (error) {
      console.warn(`Failed to load font: ${fontFamily}`, error);
    } finally {
      setLoadingFonts(prev => {
        const next = new Set(prev);
        next.delete(fontFamily);
        return next;
      });
    }
  };

  // Get display name for selected font
  const selectedFont = fonts.find(font => font.family === value);
  const displayValue = selectedFont ? selectedFont.family : value || placeholder;

  // Get category label
  const getCategoryLabel = (category: string) => {
    return FONT_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Type className="h-4 w-4 shrink-0" />
            <span 
              className="truncate"
              style={{ 
                fontFamily: value ? getFontFamilyString(value) : undefined 
              }}
            >
              {displayValue}
            </span>
            {selectedFont && showCategory && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {getCategoryLabel(selectedFont.category)}
              </Badge>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <CommandInput
              placeholder="Search fonts..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="flex-1"
            />
          </div>
          
          {showCategory && (
            <div className="flex gap-1 p-2 border-b bg-muted/50">
              {FONT_CATEGORIES.filter(cat => categories.includes(cat.value)).map((category) => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          )}

          <CommandList>
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading fonts...</span>
                </div>
              ) : filteredFonts.length === 0 ? (
                <CommandEmpty>No fonts found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredFonts.map((font) => (
                    <CommandItem
                      key={font.family}
                      value={font.family}
                      onSelect={() => {
                        onChange(font.family);
                        setOpen(false);
                      }}
                      onMouseEnter={() => handleFontLoad(font.family)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-medium truncate"
                              style={{ 
                                fontFamily: getFontFamilyString(font.family)
                              }}
                            >
                              {font.family}
                            </span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {getCategoryLabel(font.category)}
                            </Badge>
                            {loadingFonts.has(font.family) && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                          </div>
                          <div 
                            className="text-sm text-muted-foreground truncate"
                            style={{ 
                              fontFamily: getFontFamilyString(font.family)
                            }}
                          >
                            {previewText}
                          </div>
                        </div>
                        {value === font.family && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}