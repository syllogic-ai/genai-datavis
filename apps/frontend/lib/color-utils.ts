/**
 * Utility functions for color conversions and palette management
 */

// Convert HSL string format "151.20 26.04% 37.65%" to CSS hsl() format
export function hslToCss(hsl: string): string {
  return `hsl(${hsl})`;
}

// Convert hex color to HSL string format "151.20 26.04% 37.65%"
export function hexToHslString(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) {
    return `0 0% ${(l * 100).toFixed(2)}%`;
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  
  return `${(h * 360).toFixed(2)} ${(s * 100).toFixed(2)}% ${(l * 100).toFixed(2)}%`;
}

// Convert HSL string "151.20 26.04% 37.65%" to hex color
export function hslStringToHex(hsl: string): string {
  const [h, s, l] = hsl.split(' ').map((v, i) => {
    if (i === 0) return parseFloat(v) / 360;
    return parseFloat(v.replace('%', '')) / 100;
  });
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Default color palettes
export const defaultPalettes = [
  {
    name: "Default",
    description: "A balanced palette suitable for most dashboards",
    chartColors: {
      "chart-1": "220 70% 50%",    // Blue
      "chart-2": "140 70% 50%",    // Green
      "chart-3": "30 70% 50%",     // Orange
      "chart-4": "0 70% 50%",      // Red
      "chart-5": "270 70% 50%",    // Purple
    },
    brandColors: {
      primary: "220 70% 50%",
      secondary: "140 70% 50%",
      accent: "30 70% 50%"
    }
  },
  {
    name: "Ocean",
    description: "Cool blues and teals inspired by the ocean",
    chartColors: {
      "chart-1": "200 80% 45%",
      "chart-2": "190 75% 55%",
      "chart-3": "180 70% 50%",
      "chart-4": "170 65% 60%",
      "chart-5": "210 85% 40%",
    },
    brandColors: {
      primary: "200 80% 45%",
      secondary: "180 70% 50%",
      accent: "190 75% 55%"
    }
  },
  {
    name: "Sunset",
    description: "Warm colors from orange to purple",
    chartColors: {
      "chart-1": "15 85% 55%",     // Orange
      "chart-2": "350 80% 60%",    // Pink
      "chart-3": "330 75% 55%",    // Magenta
      "chart-4": "300 70% 50%",    // Purple
      "chart-5": "45 90% 60%",     // Yellow-orange
    },
    brandColors: {
      primary: "15 85% 55%",
      secondary: "330 75% 55%",
      accent: "350 80% 60%"
    }
  },
  {
    name: "Forest",
    description: "Natural greens and earth tones",
    chartColors: {
      "chart-1": "120 40% 40%",    // Forest green
      "chart-2": "90 50% 50%",     // Yellow-green
      "chart-3": "60 30% 45%",     // Olive
      "chart-4": "30 40% 50%",     // Brown
      "chart-5": "150 35% 45%",    // Sea green
    },
    brandColors: {
      primary: "120 40% 40%",
      secondary: "90 50% 50%",
      accent: "150 35% 45%"
    }
  },
  {
    name: "Monochrome",
    description: "Shades of gray for a professional look",
    chartColors: {
      "chart-1": "0 0% 20%",
      "chart-2": "0 0% 35%",
      "chart-3": "0 0% 50%",
      "chart-4": "0 0% 65%",
      "chart-5": "0 0% 80%",
    },
    brandColors: {
      primary: "0 0% 20%",
      secondary: "0 0% 50%",
      accent: "0 0% 35%"
    }
  }
];