"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseCSSTheme, createThemeFromCSS } from "@/lib/css-theme-parser";
import { Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSSImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (theme: {
    name: string;
    description: string;
    styles: {
      light: any;
      dark: any;
    };
  }) => void;
}

export function CSSImportDialog({ open, onOpenChange, onImport }: CSSImportDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cssContent, setCSSContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => {
    if (!name.trim()) {
      setError("Theme name is required");
      return;
    }

    if (!cssContent.trim()) {
      setError("CSS content is required");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Parse the CSS content
      const parsedCSS = parseCSSTheme(cssContent);
      
      // Check if we found any variables
      const hasLightVars = Object.keys(parsedCSS.light).length > 0;
      const hasDarkVars = Object.keys(parsedCSS.dark).length > 0;
      
      if (!hasLightVars && !hasDarkVars) {
        setError("No CSS variables found. Please ensure your CSS contains :root or .dark selectors with --variables.");
        return;
      }

      // Create the theme
      const theme = createThemeFromCSS(
        name.trim(),
        description.trim() || `Imported theme: ${name.trim()}`,
        parsedCSS
      );

      console.log("Created theme from CSS:", theme);

      // Call the import callback
      onImport(theme);

      // Reset form
      setName("");
      setDescription("");
      setCSSContent("");
      onOpenChange(false);
    } catch (err) {
      console.error("Error importing CSS theme:", err);
      setError(err instanceof Error ? err.message : "Failed to import CSS theme");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setCSSContent("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import CSS Theme
          </DialogTitle>
          <DialogDescription>
            Import a theme from CSS variables. Paste your index.css content below with :root and .dark selectors.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="theme-name">Theme Name *</Label>
            <Input
              id="theme-name"
              placeholder="e.g., My Custom Theme"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="theme-description">Description (optional)</Label>
            <Input
              id="theme-description"
              placeholder="e.g., A beautiful dark theme with blue accents"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="css-content">CSS Content *</Label>
            <Textarea
              id="css-content"
              placeholder={`:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.1450 0 0);
  --primary: oklch(0.2050 0 0);
  /* ... more variables ... */
}

.dark {
  --background: oklch(0.1450 0 0);
  --foreground: oklch(0.9850 0 0);
  /* ... dark theme variables ... */
}`}
              value={cssContent}
              onChange={(e) => setCSSContent(e.target.value)}
              className="font-mono text-sm min-h-[300px] resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Paste your CSS content with :root and .dark selectors containing CSS variables.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isProcessing || !name.trim() || !cssContent.trim()}
          >
            {isProcessing ? "Importing..." : "Import Theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}