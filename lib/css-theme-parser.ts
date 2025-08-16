/**
 * Utility for parsing CSS theme files and converting them to our theme format
 */

import { ThemeStyleProps } from "@/db/schema";

export interface ParsedCSSTheme {
  light: Record<string, string>;
  dark: Record<string, string>;
}

/**
 * Parses CSS content and extracts CSS variables from :root and .dark selectors
 */
export function parseCSSTheme(cssContent: string): ParsedCSSTheme {
  const result: ParsedCSSTheme = {
    light: {},
    dark: {}
  };

  // Remove comments and normalize whitespace
  const cleanCSS = cssContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Extract :root variables (light theme)
  const rootMatch = cleanCSS.match(/:root\s*{([^}]+)}/);
  if (rootMatch) {
    const rootContent = rootMatch[1];
    result.light = extractCSSVariables(rootContent);
  }

  // Extract .dark variables (dark theme)
  const darkMatch = cleanCSS.match(/\.dark\s*{([^}]+)}/);
  if (darkMatch) {
    const darkContent = darkMatch[1];
    result.dark = extractCSSVariables(darkContent);
  }

  return result;
}

/**
 * Extracts CSS variables from a CSS block content
 */
function extractCSSVariables(cssBlock: string): Record<string, string> {
  const variables: Record<string, string> = {};
  
  // Match CSS variable declarations: --variable-name: value;
  const variableRegex = /--([^:]+):\s*([^;]+);/g;
  let match;
  
  while ((match = variableRegex.exec(cssBlock)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    variables[name] = value;
  }
  
  return variables;
}

/**
 * Converts parsed CSS variables to our ThemeStyleProps format
 */
export function convertCSSToThemeStyle(cssVars: Record<string, string>): Partial<ThemeStyleProps> {
  const themeStyle: Partial<ThemeStyleProps> = {};

  // Color mappings
  const colorMappings: Record<string, keyof ThemeStyleProps> = {
    'background': 'background',
    'foreground': 'foreground',
    'card': 'card',
    'card-foreground': 'card-foreground',
    'primary': 'primary',
    'primary-foreground': 'primary-foreground',
    'secondary': 'secondary',
    'secondary-foreground': 'secondary-foreground',
    'muted': 'muted',
    'muted-foreground': 'muted-foreground',
    'accent': 'accent',
    'accent-foreground': 'accent-foreground',
    'destructive': 'destructive',
    'destructive-foreground': 'destructive-foreground',
    'border': 'border',
    'input': 'input',
    'ring': 'ring',
    'chart-1': 'chart-1',
    'chart-2': 'chart-2',
    'chart-3': 'chart-3',
    'chart-4': 'chart-4',
    'chart-5': 'chart-5',
  };

  // Map colors
  Object.entries(colorMappings).forEach(([cssVar, themeKey]) => {
    if (cssVars[cssVar]) {
      themeStyle[themeKey] = cssVars[cssVar];
    }
  });

  // Handle fonts
  if (cssVars['font-sans']) {
    themeStyle['font-sans'] = cssVars['font-sans'];
  }
  if (cssVars['font-mono']) {
    themeStyle['font-mono'] = cssVars['font-mono'];
  }
  if (cssVars['font-serif']) {
    themeStyle['font-serif'] = cssVars['font-serif'];
  }

  // Handle radius
  if (cssVars['radius']) {
    themeStyle['radius'] = cssVars['radius'];
  }

  // Handle shadow - extract first shadow as our primary shadow
  const shadowKeys = ['shadow', 'shadow-sm', 'shadow-md', 'shadow-lg'];
  const shadowValue = shadowKeys.find(key => cssVars[key]);
  if (shadowValue && cssVars[shadowValue]) {
    const shadow = parseShadowString(cssVars[shadowValue]);
    if (shadow) {
      themeStyle['shadow-offset-x'] = shadow.offsetX;
      themeStyle['shadow-offset-y'] = shadow.offsetY;
      themeStyle['shadow-blur'] = shadow.blur;
      themeStyle['shadow-spread'] = shadow.spread;
      themeStyle['shadow-color'] = shadow.color;
      themeStyle['shadow-opacity'] = shadow.opacity;
    }
  }

  // Default values for missing properties
  themeStyle['spacing'] = cssVars['spacing'] || '0.25rem';
  themeStyle['show-grid-lines'] = 'true'; // Default to showing grid lines

  return themeStyle;
}

/**
 * Parses a CSS shadow string and extracts individual components
 */
function parseShadowString(shadowStr: string): {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
  opacity: string;
} | null {
  try {
    // Handle multiple shadows - take the first one
    const firstShadow = shadowStr.split(',')[0].trim();
    
    // Parse shadow components: offset-x offset-y blur-radius spread-radius color
    // Example: "0 1px 3px 0px hsl(0 0% 0% / 0.10)"
    const shadowRegex = /(-?\d+(?:\.\d+)?(?:px|rem|em))\s+(-?\d+(?:\.\d+)?(?:px|rem|em))\s+(-?\d+(?:\.\d+)?(?:px|rem|em))\s+(-?\d+(?:\.\d+)?(?:px|rem|em))?\s*(.+)/;
    const match = firstShadow.match(shadowRegex);
    
    if (!match) return null;
    
    const [, offsetX, offsetY, blur, spread = '0px', colorPart] = match;
    
    // Parse color and opacity
    let color = 'oklch(0 0 0)';
    let opacity = '0.1';
    
    if (colorPart.includes('hsl(') && colorPart.includes('/')) {
      // Extract opacity from HSL with alpha
      const opacityMatch = colorPart.match(/\/\s*([\d.]+)\)/);
      if (opacityMatch) {
        opacity = opacityMatch[1];
      }
      
      // Convert HSL to a basic OKLCH representation
      const hslMatch = colorPart.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%/);
      if (hslMatch) {
        const [, h, s, l] = hslMatch;
        // Simple conversion to OKLCH format (this is approximate)
        const lightness = parseInt(l) / 100;
        const chroma = parseInt(s) / 100 * 0.4; // Approximate chroma conversion
        const hue = parseInt(h);
        color = `oklch(${lightness} ${chroma} ${hue})`;
      }
    } else if (colorPart.includes('oklch(')) {
      // Already OKLCH format
      const oklchMatch = colorPart.match(/oklch\([^)]+\)/);
      if (oklchMatch) {
        color = oklchMatch[0];
      }
    }
    
    return {
      offsetX: offsetX.replace(/px$/, ''),
      offsetY: offsetY.replace(/px$/, ''),
      blur: blur.replace(/px$/, ''),
      spread: spread.replace(/px$/, ''),
      color,
      opacity
    };
  } catch (error) {
    console.warn('Failed to parse shadow string:', shadowStr, error);
    return null;
  }
}

/**
 * Converts parsed CSS theme to our complete theme format
 */
export function createThemeFromCSS(
  name: string,
  description: string,
  parsedCSS: ParsedCSSTheme
): {
  name: string;
  description: string;
  styles: {
    light: ThemeStyleProps;
    dark: ThemeStyleProps;
  };
} {
  const lightStyles = convertCSSToThemeStyle(parsedCSS.light);
  const darkStyles = convertCSSToThemeStyle(parsedCSS.dark);
  
  // Ensure we have complete style objects with defaults
  const defaultStyle: ThemeStyleProps = {
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.1450 0 0)',
    card: 'oklch(1 0 0)',
    'card-foreground': 'oklch(0.1450 0 0)',
    primary: 'oklch(0.2050 0 0)',
    'primary-foreground': 'oklch(0.9850 0 0)',
    secondary: 'oklch(0.9700 0 0)',
    'secondary-foreground': 'oklch(0.2050 0 0)',
    muted: 'oklch(0.9700 0 0)',
    'muted-foreground': 'oklch(0.5560 0 0)',
    accent: 'oklch(0.9700 0 0)',
    'accent-foreground': 'oklch(0.2050 0 0)',
    destructive: 'oklch(0.5770 0.2450 27.3250)',
    'destructive-foreground': 'oklch(1 0 0)',
    border: 'oklch(0.9220 0 0)',
    input: 'oklch(0.9220 0 0)',
    ring: 'oklch(0.7080 0 0)',
    'chart-1': 'oklch(0.8100 0.1000 252)',
    'chart-2': 'oklch(0.6200 0.1900 260)',
    'chart-3': 'oklch(0.5500 0.2200 263)',
    'chart-4': 'oklch(0.4900 0.2200 264)',
    'chart-5': 'oklch(0.4200 0.1800 266)',
    'chart-positive': 'oklch(0.5682 0.167 135.46)',
    'chart-negative': 'oklch(0.4149 0.1695 28.96)',
    'font-sans': 'ui-sans-serif, system-ui, sans-serif',
    'font-mono': 'ui-monospace, SFMono-Regular, monospace',
    'font-serif': 'ui-serif, Georgia, serif',
    'font-size-base': '16px',
    'font-size-sm': '14px',
    'font-size-lg': '18px',
    radius: '0.625rem',
    spacing: '0.25rem',
    'shadow-offset-x': '0',
    'shadow-offset-y': '1',
    'shadow-blur': '3',
    'shadow-spread': '0',
    'shadow-color': 'oklch(0 0 0)',
    'shadow-opacity': '0.1',
    'show-grid-lines': 'true'
  };

  return {
    name,
    description,
    styles: {
      light: { ...defaultStyle, ...lightStyles } as ThemeStyleProps,
      dark: { ...defaultStyle, ...darkStyles } as ThemeStyleProps
    }
  };
}