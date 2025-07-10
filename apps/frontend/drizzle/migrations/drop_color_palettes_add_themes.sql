-- Drop the old color_palettes table completely (no data migration needed)
DROP TABLE IF EXISTS color_palettes CASCADE;

-- Create new themes table for dashboard-level theming
CREATE TABLE themes (
    id TEXT PRIMARY KEY,
    dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false NOT NULL,
    styles JSONB NOT NULL,
    preset_id TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_themes_dashboard_id ON themes(dashboard_id);
CREATE INDEX idx_themes_is_active ON themes(is_active);

-- Add constraint to ensure only one active theme per dashboard
CREATE UNIQUE INDEX unique_active_theme_per_dashboard 
ON themes (dashboard_id) 
WHERE is_active = true;

-- Create default themes for existing dashboards
INSERT INTO themes (id, dashboard_id, name, is_active, styles)
SELECT 
    gen_random_uuid()::text,
    id,
    'Default Theme',
    true,
    '{
      "light": {
        "chart-1": "oklch(0.81 0.10 252)",
        "chart-2": "oklch(0.62 0.19 260)",
        "chart-3": "oklch(0.55 0.22 263)",
        "chart-4": "oklch(0.49 0.22 264)",
        "chart-5": "oklch(0.42 0.18 266)",
        "font-sans": "Open Sans, sans-serif",
        "font-serif": "Source Serif 4, serif",
        "font-mono": "JetBrains Mono, monospace",
        "font-size-base": "16px",
        "font-size-sm": "14px",
        "font-size-lg": "18px",
        "background": "oklch(1 0 0)",
        "foreground": "oklch(0.145 0 0)",
        "card": "oklch(1 0 0)",
        "card-foreground": "oklch(0.145 0 0)",
        "primary": "oklch(0.205 0 0)",
        "primary-foreground": "oklch(0.985 0 0)",
        "secondary": "oklch(0.97 0 0)",
        "secondary-foreground": "oklch(0.205 0 0)",
        "muted": "oklch(0.97 0 0)",
        "muted-foreground": "oklch(0.556 0 0)",
        "accent": "oklch(0.97 0 0)",
        "accent-foreground": "oklch(0.205 0 0)",
        "destructive": "oklch(0.577 0.245 27.325)",
        "destructive-foreground": "oklch(1 0 0)",
        "border": "oklch(0.922 0 0)",
        "input": "oklch(0.922 0 0)",
        "ring": "oklch(0.708 0 0)",
        "radius": "0.625rem",
        "spacing": "0.25rem",
        "shadow-color": "oklch(0 0 0)",
        "shadow-opacity": "0.1",
        "shadow-blur": "3px",
        "shadow-spread": "0px",
        "shadow-offset-x": "0",
        "shadow-offset-y": "1px",
        "letter-spacing": "0em"
      },
      "dark": {
        "chart-1": "oklch(0.81 0.10 252)",
        "chart-2": "oklch(0.62 0.19 260)",
        "chart-3": "oklch(0.55 0.22 263)",
        "chart-4": "oklch(0.49 0.22 264)",
        "chart-5": "oklch(0.42 0.18 266)",
        "font-sans": "Open Sans, sans-serif",
        "font-serif": "Source Serif 4, serif",
        "font-mono": "JetBrains Mono, monospace",
        "font-size-base": "16px",
        "font-size-sm": "14px",
        "font-size-lg": "18px",
        "background": "oklch(0.145 0 0)",
        "foreground": "oklch(0.985 0 0)",
        "card": "oklch(0.205 0 0)",
        "card-foreground": "oklch(0.985 0 0)",
        "primary": "oklch(0.922 0 0)",
        "primary-foreground": "oklch(0.205 0 0)",
        "secondary": "oklch(0.269 0 0)",
        "secondary-foreground": "oklch(0.985 0 0)",
        "muted": "oklch(0.269 0 0)",
        "muted-foreground": "oklch(0.708 0 0)",
        "accent": "oklch(0.371 0 0)",
        "accent-foreground": "oklch(0.985 0 0)",
        "destructive": "oklch(0.704 0.191 22.216)",
        "destructive-foreground": "oklch(0.985 0 0)",
        "border": "oklch(0.275 0 0)",
        "input": "oklch(0.325 0 0)",
        "ring": "oklch(0.556 0 0)",
        "radius": "0.625rem",
        "spacing": "0.25rem",
        "shadow-color": "oklch(0 0 0)",
        "shadow-opacity": "0.1",
        "shadow-blur": "3px",
        "shadow-spread": "0px",
        "shadow-offset-x": "0",
        "shadow-offset-y": "1px",
        "letter-spacing": "0em"
      }
    }'::jsonb
FROM dashboards;