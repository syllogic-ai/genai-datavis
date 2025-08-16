"use client";

import { useEffect } from "react";

// Font weight options
export const FONT_WEIGHTS = [
  { name: "Thin", value: "100" },
  { name: "Extra Light", value: "200" },
  { name: "Light", value: "300" },
  { name: "Regular", value: "400" },
  { name: "Medium", value: "500" },
  { name: "Semi Bold", value: "600" },
  { name: "Bold", value: "700" },
  { name: "Extra Bold", value: "800" },
  { name: "Black", value: "900" },
];

// Popular Google Fonts list with available weights
export const GOOGLE_FONTS = [
  { name: "Inter", value: "Inter, sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "Roboto", value: "Roboto, sans-serif", weights: ["100", "300", "400", "500", "700", "900"] },
  { name: "Open Sans", value: "'Open Sans', sans-serif", weights: ["300", "400", "500", "600", "700", "800"] },
  { name: "Lato", value: "Lato, sans-serif", weights: ["100", "300", "400", "700", "900"] },
  { name: "Montserrat", value: "Montserrat, sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "Source Sans Pro", value: "'Source Sans Pro', sans-serif", weights: ["200", "300", "400", "600", "700", "900"] },
  { name: "Raleway", value: "Raleway, sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "Ubuntu", value: "Ubuntu, sans-serif", weights: ["300", "400", "500", "700"] },
  { name: "Nunito", value: "Nunito, sans-serif", weights: ["200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "PT Sans", value: "'PT Sans', sans-serif", weights: ["400", "700"] },
  { name: "Poppins", value: "Poppins, sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "Merriweather", value: "Merriweather, serif", weights: ["300", "400", "700", "900"] },
  { name: "Playfair Display", value: "'Playfair Display', serif", weights: ["400", "500", "600", "700", "800", "900"] },
  { name: "Lora", value: "Lora, serif", weights: ["400", "500", "600", "700"] },
  { name: "Crimson Text", value: "'Crimson Text', serif", weights: ["400", "600", "700"] },
  { name: "PT Serif", value: "'PT Serif', serif", weights: ["400", "700"] },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif", weights: ["400", "700"] },
  { name: "Source Serif Pro", value: "'Source Serif Pro', serif", weights: ["200", "300", "400", "600", "700", "900"] },
  { name: "Roboto Slab", value: "'Roboto Slab', serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "Vollkorn", value: "Vollkorn, serif", weights: ["400", "500", "600", "700", "800", "900"] },
  { name: "Fira Code", value: "'Fira Code', monospace", weights: ["300", "400", "500", "600", "700"] },
  { name: "Source Code Pro", value: "'Source Code Pro', monospace", weights: ["200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "JetBrains Mono", value: "'JetBrains Mono', monospace", weights: ["100", "200", "300", "400", "500", "600", "700", "800"] },
  { name: "Inconsolata", value: "Inconsolata, monospace", weights: ["200", "300", "400", "500", "600", "700", "800", "900"] },
  { name: "Roboto Mono", value: "'Roboto Mono', monospace", weights: ["100", "200", "300", "400", "500", "600", "700"] },
  { name: "IBM Plex Sans", value: "'IBM Plex Sans', sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700"] },
  { name: "IBM Plex Serif", value: "'IBM Plex Serif', serif", weights: ["100", "200", "300", "400", "500", "600", "700"] },
  { name: "IBM Plex Mono", value: "'IBM Plex Mono', monospace", weights: ["100", "200", "300", "400", "500", "600", "700"] },
];

// Get available weights for a font family
export function getAvailableWeights(fontFamily: string): string[] {
  if (!fontFamily || fontFamily === "default") {
    return ["400", "700"]; // Default system font weights
  }
  
  const font = GOOGLE_FONTS.find(font => 
    font.value === fontFamily || font.name.toLowerCase() === fontFamily.toLowerCase()
  );
  
  return font ? font.weights : ["400", "700"];
}

// Load Google Fonts dynamically with all available weights
export function loadGoogleFont(fontFamily: string) {
  // Extract font name from font family value
  const fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  
  // Check if it's a generic font family
  if (!fontName || fontName === 'serif' || fontName === 'sans-serif' || fontName === 'monospace' || fontName === 'default') {
    return;
  }
  
  // Check if font is already loaded
  const existingLink = document.querySelector(`link[href*="${fontName.replace(/\s+/g, '+')}"]`);
  if (existingLink) {
    console.log(`[GoogleFonts] Font "${fontName}" already loaded`);
    return;
  }

  // Find the font in our list to get proper weights
  const fontData = GOOGLE_FONTS.find(font => 
    font.name === fontName || 
    font.value.includes(fontName)
  );
  
  if (!fontData) {
    console.warn(`[GoogleFonts] Font "${fontName}" not found in font list`);
    return;
  }

  // Get available weights for this font
  const weights = fontData.weights;
  const weightString = weights.join(';');

  console.log(`[GoogleFonts] Loading font: ${fontName} with weights: ${weightString}`);

  // Create and append font link
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@${weightString}&display=swap`;
  link.rel = 'stylesheet';
  
  // Add load event listener to verify font loading
  link.onload = () => {
    console.log(`[GoogleFonts] Successfully loaded font: ${fontName}`);
    
    // Test if font is actually usable
    if ('fonts' in document) {
      // Check if the font is available
      document.fonts.load(`400 16px "${fontName}"`).then(() => {
        console.log(`[GoogleFonts] Font "${fontName}" is available for use`);
      }).catch((err) => {
        console.error(`[GoogleFonts] Font "${fontName}" failed to become available:`, err);
      });
    }
  };
  
  link.onerror = () => {
    console.error(`[GoogleFonts] Failed to load font: ${fontName}`);
  };
  
  document.head.appendChild(link);
  console.log(`[GoogleFonts] Added font link to document: ${link.href}`);
}

// Component to preload commonly used fonts
export function GoogleFontsLoader() {
  useEffect(() => {
    // Preload most common fonts
    const commonFonts = [
      "Inter",
      "Roboto", 
      "Open Sans",
      "Lato",
      "Montserrat",
      "Merriweather",
      "Playfair Display"
    ];

    commonFonts.forEach(font => {
      loadGoogleFont(font);
    });
  }, []);

  return null;
}