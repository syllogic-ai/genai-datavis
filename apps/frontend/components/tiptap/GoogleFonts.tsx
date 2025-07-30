"use client";

import { useEffect } from "react";

// Popular Google Fonts list
export const GOOGLE_FONTS = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Roboto", value: "Roboto, sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Lato", value: "Lato, sans-serif" },
  { name: "Montserrat", value: "Montserrat, sans-serif" },
  { name: "Source Sans Pro", value: "'Source Sans Pro', sans-serif" },
  { name: "Raleway", value: "Raleway, sans-serif" },
  { name: "Ubuntu", value: "Ubuntu, sans-serif" },
  { name: "Nunito", value: "Nunito, sans-serif" },
  { name: "PT Sans", value: "'PT Sans', sans-serif" },
  { name: "Poppins", value: "Poppins, sans-serif" },
  { name: "Merriweather", value: "Merriweather, serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Lora", value: "Lora, serif" },
  { name: "Crimson Text", value: "'Crimson Text', serif" },
  { name: "PT Serif", value: "'PT Serif', serif" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif" },
  { name: "Source Serif Pro", value: "'Source Serif Pro', serif" },
  { name: "Roboto Slab", value: "'Roboto Slab', serif" },
  { name: "Vollkorn", value: "Vollkorn, serif" },
  { name: "Fira Code", value: "'Fira Code', monospace" },
  { name: "Source Code Pro", value: "'Source Code Pro', monospace" },
  { name: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { name: "Inconsolata", value: "Inconsolata, monospace" },
  { name: "Roboto Mono", value: "'Roboto Mono', monospace" },
];

// Load Google Fonts dynamically
export function loadGoogleFont(fontFamily: string) {
  // Extract font name from font family value
  const fontName = fontFamily.split(',')[0].replace(/['"]/g, '');
  
  // Check if font is already loaded
  const existingLink = document.querySelector(`link[href*="${fontName.replace(/\s+/g, '+')}"]`);
  if (existingLink) return;

  // Create and append font link
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
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