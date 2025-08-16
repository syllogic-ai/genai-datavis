"use client";

import { useState, useEffect } from 'react';

/**
 * Hook to read the show-grid-lines setting from CSS variables
 * This allows chart components to respond to theme changes
 */
export function useThemeGridLines(): boolean {
  const [showGridLines, setShowGridLines] = useState(true); // Default to true

  useEffect(() => {
    const updateGridLines = () => {
      try {
        const root = document.documentElement;
        const gridLinesValue = root.style.getPropertyValue('--show-grid-lines');
        
        // If the CSS variable is explicitly set to "false", hide grid lines
        // Otherwise, show them (default behavior)
        setShowGridLines(gridLinesValue !== 'false');
      } catch (error) {
        console.warn('Failed to read grid lines setting:', error);
        setShowGridLines(true); // Fallback to showing grid lines
      }
    };

    // Initial check
    updateGridLines();

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          updateGridLines();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    // Also listen for CSS variable changes via custom events
    const handleThemeChange = () => {
      updateGridLines();
    };

    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  return showGridLines;
}