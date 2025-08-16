/**
 * Utility functions for color conversions and palette management
 */

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to linear RGB (remove gamma correction)
 */
function rgbToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB to XYZ color space
 */
function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  // Convert to linear RGB
  r = rgbToLinear(r);
  g = rgbToLinear(g);
  b = rgbToLinear(b);

  // Apply transformation matrix for sRGB to XYZ
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

  return { x, y, z };
}

/**
 * Convert XYZ to LAB color space
 */
function xyzToLab(x: number, y: number, z: number): { l: number; a: number; b: number } {
  // Normalize for D65 illuminant
  x = x / 0.95047;
  y = y / 1.00000;
  z = z / 1.08883;

  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

/**
 * Convert LAB to LCH (OKLCH uses similar structure)
 */
function labToLch(l: number, a: number, b: number): { l: number; c: number; h: number } {
  const c = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  
  // Normalize hue to 0-360
  if (h < 0) h += 360;

  return { l, c, h };
}

/**
 * Convert hex color to OKLCH format
 * This is a simplified approximation
 */
export function hexToOklch(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex; // Return original if conversion fails

  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  const lab = xyzToLab(xyz.x, xyz.y, xyz.z);
  const lch = labToLch(lab.l, lab.a, lab.b);

  // Convert to OKLCH-like values (simplified approximation)
  const lightness = Math.max(0, Math.min(1, lch.l / 100));
  const chroma = Math.max(0, Math.min(0.4, lch.c / 150)); // Scale chroma
  const hue = lch.h;

  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(0)})`;
}

/**
 * Check if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Check if a string is an OKLCH color
 */
export function isOklchColor(color: string): boolean {
  return color.startsWith('oklch(');
}

/**
 * Check if a string is a CSS variable
 */
export function isCssVariable(color: string): boolean {
  return color.startsWith('var(--');
}

/**
 * Parse OKLCH color string and extract values
 */
function parseOklch(oklchString: string): { l: number; c: number; h: number } | null {
  const match = oklchString.match(/oklch\(([^)]+)\)/);
  if (!match) return null;
  
  const values = match[1].split(' ').map(v => v.trim());
  if (values.length !== 3) return null;
  
  return {
    l: parseFloat(values[0]),
    c: parseFloat(values[1]),
    h: parseFloat(values[2])
  };
}

/**
 * Convert LCH to LAB color space
 */
function lchToLab(l: number, c: number, h: number): { l: number; a: number; b: number } {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return { l, a, b };
}

/**
 * Convert LAB to XYZ color space
 */
function labToXyz(l: number, a: number, b: number): { x: number; y: number; z: number } {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  
  const fx3 = Math.pow(fx, 3);
  const fy3 = Math.pow(fy, 3);
  const fz3 = Math.pow(fz, 3);
  
  const x = (fx3 > 0.008856 ? fx3 : (fx - 16/116) / 7.787) * 0.95047;
  const y = (fy3 > 0.008856 ? fy3 : (fy - 16/116) / 7.787) * 1.00000;
  const z = (fz3 > 0.008856 ? fz3 : (fz - 16/116) / 7.787) * 1.08883;
  
  return { x, y, z };
}

/**
 * Convert linear RGB to gamma-corrected RGB
 */
function linearToRgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
}

/**
 * Convert XYZ to RGB color space
 */
function xyzToRgb(x: number, y: number, z: number): { r: number; g: number; b: number } {
  // Apply inverse transformation matrix for XYZ to sRGB
  let r = x *  3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.9692660 + y *  1.8760108 + z *  0.0415560;
  let b = x *  0.0556434 + y * -0.2040259 + z *  1.0572252;
  
  // Convert linear RGB to gamma-corrected RGB
  r = linearToRgb(r);
  g = linearToRgb(g);
  b = linearToRgb(b);
  
  // Clamp values to 0-1 range
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert OKLCH color to hex format
 * This is a simplified approximation for the reverse conversion
 */
export function oklchToHex(oklchString: string): string {
  const parsed = parseOklch(oklchString);
  if (!parsed) return '#6366f1'; // fallback color
  
  try {
    // Convert OKLCH-like values back to LAB (reverse the approximation)
    const lab_l = parsed.l * 100;
    const lab_c = parsed.c * 150; // Reverse the scaling we did in hexToOklch
    const lab_h = parsed.h;
    
    const lab = lchToLab(lab_l, lab_c, lab_h);
    const xyz = labToXyz(lab.l, lab.a, lab.b);
    const rgb = xyzToRgb(xyz.x, xyz.y, xyz.z);
    
    // Validate RGB values are reasonable
    if (rgb.r < 0 || rgb.r > 255 || rgb.g < 0 || rgb.g > 255 || rgb.b < 0 || rgb.b > 255) {
      // Use a simpler HSL-based approximation as fallback
      return hslApproximationFromOklch(parsed.l, parsed.c, parsed.h);
    }
    
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  } catch (error) {
    // Fallback to a simple HSL approximation
    return hslApproximationFromOklch(parsed.l, parsed.c, parsed.h);
  }
}

/**
 * Simple HSL-based approximation for OKLCH to hex conversion
 */
function hslApproximationFromOklch(l: number, c: number, h: number): string {
  // Simple approximation: treat OKLCH roughly like HSL
  const hue = h;
  const saturation = Math.min(100, c * 250); // Scale chroma to saturation
  const lightness = Math.min(100, l * 100); // Scale lightness
  
  return hslStringToHex(`${hue} ${saturation}% ${lightness}%`);
}

/**
 * Get a displayable color for UI (converts OKLCH/CSS vars to hex for display)
 */
export function getDisplayColor(color: string): string {
  if (isValidHexColor(color)) {
    return color;
  }
  if (isOklchColor(color)) {
    return oklchToHex(color);
  }
  if (isCssVariable(color)) {
    // Return a default color for CSS variables since we can't resolve them
    return '#6366f1'; // indigo-500
  }
  return color;
}

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