import { ThemeStyleProps } from "@/db/schema";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  styles: {
    light: Partial<ThemeStyleProps>;
    dark: Partial<ThemeStyleProps>;
  };
}

// Base UI colors and settings that all themes share
const baseUIColors = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    "destructive-foreground": "oklch(1 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    radius: "0.625rem",
    spacing: "0.25rem",
    "shadow-color": "oklch(0 0 0)",
    "shadow-opacity": "0.1",
    "shadow-blur": "3",
    "shadow-spread": "0",
    "shadow-offset-x": "0",
    "shadow-offset-y": "1",
    "show-grid-lines": "true",
    "letter-spacing": "0em",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.371 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    "destructive-foreground": "oklch(0.985 0 0)",
    border: "oklch(0.275 0 0)",
    input: "oklch(0.325 0 0)",
    ring: "oklch(0.556 0 0)",
    radius: "0.625rem",
    spacing: "0.25rem",
    "shadow-color": "oklch(0.8 0 0)",
    "shadow-opacity": "0.2",
    "shadow-blur": "6",
    "shadow-spread": "0",
    "shadow-offset-x": "0",
    "shadow-offset-y": "2",
    "show-grid-lines": "true",
    "letter-spacing": "0em",
  },
};

// Default font settings
const defaultFonts = {
  "font-sans": "Open Sans, sans-serif",
  "font-serif": "Source Serif 4, serif",
  "font-mono": "JetBrains Mono, monospace",
  "font-size-base": "16px",
  "font-size-sm": "14px",
  "font-size-lg": "18px",
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Balanced blue-purple colors for data visualization",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "chart-1": "oklch(0.81 0.10 252)",
        "chart-2": "oklch(0.62 0.19 260)",
        "chart-3": "oklch(0.55 0.22 263)",
        "chart-4": "oklch(0.49 0.22 264)",
        "chart-5": "oklch(0.42 0.18 266)",
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "chart-1": "oklch(0.81 0.10 252)",
        "chart-2": "oklch(0.62 0.19 260)",
        "chart-3": "oklch(0.55 0.22 263)",
        "chart-4": "oklch(0.49 0.22 264)",
        "chart-5": "oklch(0.42 0.18 266)",
      },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blues and teals inspired by the sea",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "chart-1": "oklch(0.70 0.15 200)",
        "chart-2": "oklch(0.65 0.18 210)",
        "chart-3": "oklch(0.60 0.20 220)",
        "chart-4": "oklch(0.55 0.18 230)",
        "chart-5": "oklch(0.50 0.15 240)",
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "chart-1": "oklch(0.70 0.15 200)",
        "chart-2": "oklch(0.65 0.18 210)",
        "chart-3": "oklch(0.60 0.20 220)",
        "chart-4": "oklch(0.55 0.18 230)",
        "chart-5": "oklch(0.50 0.15 240)",
      },
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm oranges to purples like a sunset sky",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "chart-1": "oklch(0.75 0.20 30)",
        "chart-2": "oklch(0.70 0.22 50)",
        "chart-3": "oklch(0.65 0.18 340)",
        "chart-4": "oklch(0.60 0.20 320)",
        "chart-5": "oklch(0.55 0.18 300)",
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "chart-1": "oklch(0.75 0.20 30)",
        "chart-2": "oklch(0.70 0.22 50)",
        "chart-3": "oklch(0.65 0.18 340)",
        "chart-4": "oklch(0.60 0.20 320)",
        "chart-5": "oklch(0.55 0.18 300)",
      },
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural greens and earth tones",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "chart-1": "oklch(0.65 0.20 140)",
        "chart-2": "oklch(0.60 0.18 160)",
        "chart-3": "oklch(0.70 0.15 90)",
        "chart-4": "oklch(0.55 0.15 180)",
        "chart-5": "oklch(0.50 0.12 120)",
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "chart-1": "oklch(0.65 0.20 140)",
        "chart-2": "oklch(0.60 0.18 160)",
        "chart-3": "oklch(0.70 0.15 90)",
        "chart-4": "oklch(0.55 0.15 180)",
        "chart-5": "oklch(0.50 0.12 120)",
      },
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Professional grayscale for reports",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "chart-1": "oklch(0.30 0 0)",
        "chart-2": "oklch(0.45 0 0)",
        "chart-3": "oklch(0.60 0 0)",
        "chart-4": "oklch(0.75 0 0)",
        "chart-5": "oklch(0.85 0 0)",
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "chart-1": "oklch(0.85 0 0)",
        "chart-2": "oklch(0.70 0 0)",
        "chart-3": "oklch(0.55 0 0)",
        "chart-4": "oklch(0.40 0 0)",
        "chart-5": "oklch(0.30 0 0)",
      },
    },
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Bold, high-contrast colors for impact",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "chart-1": "oklch(0.65 0.30 15)",   // Bright red-orange
        "chart-2": "oklch(0.70 0.25 250)",  // Vivid blue
        "chart-3": "oklch(0.68 0.28 130)",  // Bright green
        "chart-4": "oklch(0.65 0.25 300)",  // Purple
        "chart-5": "oklch(0.72 0.26 60)",   // Yellow
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "chart-1": "oklch(0.65 0.30 15)",
        "chart-2": "oklch(0.70 0.25 250)",
        "chart-3": "oklch(0.68 0.28 130)",
        "chart-4": "oklch(0.65 0.25 300)",
        "chart-5": "oklch(0.72 0.26 60)",
      },
    },
  },
  {
    id: "pastel",
    name: "Pastel",
    description: "Soft, muted colors for a gentle look",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "chart-1": "oklch(0.85 0.08 350)",  // Soft pink
        "chart-2": "oklch(0.83 0.10 220)",  // Soft blue
        "chart-3": "oklch(0.84 0.09 140)",  // Soft green
        "chart-4": "oklch(0.82 0.08 280)",  // Soft purple
        "chart-5": "oklch(0.86 0.10 60)",   // Soft yellow
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "chart-1": "oklch(0.65 0.08 350)",
        "chart-2": "oklch(0.63 0.10 220)",
        "chart-3": "oklch(0.64 0.09 140)",
        "chart-4": "oklch(0.62 0.08 280)",
        "chart-5": "oklch(0.66 0.10 60)",
      },
    },
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Professional blues and grays for business",
    styles: {
      light: {
        ...baseUIColors.light,
        ...defaultFonts,
        "font-sans": "Inter, sans-serif",
        "chart-1": "oklch(0.45 0.15 220)",  // Navy blue
        "chart-2": "oklch(0.60 0.10 210)",  // Medium blue
        "chart-3": "oklch(0.50 0.02 200)",  // Gray-blue
        "chart-4": "oklch(0.65 0.08 200)",  // Light blue
        "chart-5": "oklch(0.55 0.01 0)",    // Gray
      },
      dark: {
        ...baseUIColors.dark,
        ...defaultFonts,
        "font-sans": "Inter, sans-serif",
        "chart-1": "oklch(0.75 0.15 220)",
        "chart-2": "oklch(0.70 0.10 210)",
        "chart-3": "oklch(0.65 0.02 200)",
        "chart-4": "oklch(0.80 0.08 200)",
        "chart-5": "oklch(0.60 0.01 0)",
      },
    },
  },
];