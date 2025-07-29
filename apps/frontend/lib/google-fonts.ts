/**
 * Google Fonts integration utility
 * Fetches available fonts and manages dynamic font loading
 */

export interface GoogleFont {
  family: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
  variants: string[];
  subsets: string[];
  version: string;
  lastModified: string;
  files: Record<string, string>;
}

export interface GoogleFontsResponse {
  kind: string;
  items: GoogleFont[];
}

// Popular fonts that should appear first in the list
const POPULAR_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Source Sans Pro',
  'Raleway',
  'Poppins',
  'Merriweather',
  'Playfair Display',
  'Lora',
  'Source Serif Pro',
  'Crimson Text',
  'PT Serif',
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'IBM Plex Mono'
];

// Cache for Google Fonts
let fontsCache: GoogleFont[] | null = null;
let fontsCacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetches Google Fonts from the API or cache
 */
export async function fetchGoogleFonts(): Promise<GoogleFont[]> {
  const now = Date.now();
  
  // Return cached fonts if available and fresh
  if (fontsCache && (now - fontsCacheTimestamp) < CACHE_DURATION) {
    return fontsCache;
  }

  try {
    // For development, we'll use a static list since we need an API key for Google Fonts API
    // In production, you would use: https://www.googleapis.com/webfonts/v1/webfonts?key=YOUR_API_KEY
    const staticFonts = getStaticGoogleFonts();
    
    fontsCache = staticFonts;
    fontsCacheTimestamp = now;
    
    return staticFonts;
  } catch (error) {
    console.error('Failed to fetch Google Fonts:', error);
    return getStaticGoogleFonts();
  }
}

/**
 * Static list of popular Google Fonts for development
 * In production, this would be replaced with actual API calls
 */
function getStaticGoogleFonts(): GoogleFont[] {
  return [
    // Sans-serif fonts
    {
      family: 'Inter',
      category: 'sans-serif',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v12',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
      }
    },
    {
      family: 'Roboto',
      category: 'sans-serif',
      variants: ['100', '300', '400', '500', '700', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v30',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2'
      }
    },
    {
      family: 'Open Sans',
      category: 'sans-serif',
      variants: ['300', '400', '500', '600', '700', '800'],
      subsets: ['latin', 'latin-ext'],
      version: 'v34',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.woff2'
      }
    },
    {
      family: 'Lato',
      category: 'sans-serif',
      variants: ['100', '300', '400', '700', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v24',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2'
      }
    },
    {
      family: 'Montserrat',
      category: 'sans-serif',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v25',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2'
      }
    },
    {
      family: 'Source Sans Pro',
      category: 'sans-serif',
      variants: ['200', '300', '400', '600', '700', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v21',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/sourcesanspro/v21/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7lujVj9w.woff2'
      }
    },
    {
      family: 'Raleway',
      category: 'sans-serif',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v28',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/raleway/v28/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCIPrQ.woff2'
      }
    },
    {
      family: 'Poppins',
      category: 'sans-serif',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v20',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2'
      }
    },
    // Serif fonts
    {
      family: 'Merriweather',
      category: 'serif',
      variants: ['300', '400', '700', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v30',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l5-fCZMdeX3rsHo.woff2'
      }
    },
    {
      family: 'Playfair Display',
      category: 'serif',
      variants: ['400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v30',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qO0g.woff2'
      }
    },
    {
      family: 'Lora',
      category: 'serif',
      variants: ['400', '500', '600', '700'],
      subsets: ['latin', 'latin-ext'],
      version: 'v32',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/lora/v32/0QIvMX1D_JOuGQbT0gvTJPa787weuxJEkqsJ9cxJSQ.woff2'
      }
    },
    {
      family: 'Source Serif Pro',
      category: 'serif',
      variants: ['200', '300', '400', '600', '700', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v15',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/sourceserifpro/v15/neIQzD-0qpwxpaWvjeD0X88SAOeasdtYYi0H4g.woff2'
      }
    },
    {
      family: 'Crimson Text',
      category: 'serif',
      variants: ['400', '600', '700'],
      subsets: ['latin'],
      version: 'v19',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/crimsontext/v19/wlp2gwHKFkZgtmSR3NB0oRJvaAJSA_JN3Q.woff2'
      }
    },
    {
      family: 'PT Serif',
      category: 'serif',
      variants: ['400', '700'],
      subsets: ['latin', 'latin-ext'],
      version: 'v17',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/ptserif/v17/EJRVQgYoZZY2vCFuvAFWzr8HA.woff2'
      }
    },
    // Monospace fonts
    {
      family: 'JetBrains Mono',
      category: 'monospace',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800'],
      subsets: ['latin', 'latin-ext'],
      version: 'v13',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/jetbrainsmono/v13/tDbY297L-B-Ny_Vm1Gma-3G0RxAkOr1YYKKwHwGxGHPY17aM.woff2'
      }
    },
    {
      family: 'Fira Code',
      category: 'monospace',
      variants: ['300', '400', '500', '600', '700'],
      subsets: ['latin', 'latin-ext'],
      version: 'v21',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/firacode/v21/uU9eCBsR6Z2vfE9aq3bL0fxyUs4tcw4W_D1sJVD7Ng.woff2'
      }
    },
    {
      family: 'Source Code Pro',
      category: 'monospace',
      variants: ['200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      version: 'v22',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/sourcecodepro/v22/HI_XiYsKILxRpg3hIP6sJ7fM7PqlPevWnsUnkg.woff2'
      }
    },
    {
      family: 'IBM Plex Mono',
      category: 'monospace',
      variants: ['100', '200', '300', '400', '500', '600', '700'],
      subsets: ['latin', 'latin-ext'],
      version: 'v19',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/ibmplexmono/v19/-F6pfjptAgt5VM-kVkqdyU8n3kwq0L1kEoEIIIwvbs8.woff2'
      }
    },
    // Display fonts
    {
      family: 'Oswald',
      category: 'sans-serif',
      variants: ['200', '300', '400', '500', '600', '700'],
      subsets: ['latin', 'latin-ext'],
      version: 'v49',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg752GT8Gl-1PK62t.woff2'
      }
    },
    {
      family: 'Dancing Script',
      category: 'handwriting',
      variants: ['400', '500', '600', '700'],
      subsets: ['latin', 'latin-ext'],
      version: 'v24',
      lastModified: '2023-05-02',
      files: {
        '400': 'https://fonts.gstatic.com/s/dancingscript/v24/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3ROp-.woff2'
      }
    }
  ];
}

/**
 * Sorts fonts by popularity and category
 */
export function sortFontsByPopularity(fonts: GoogleFont[]): GoogleFont[] {
  return fonts.sort((a, b) => {
    const aPopular = POPULAR_FONTS.indexOf(a.family);
    const bPopular = POPULAR_FONTS.indexOf(b.family);
    
    // Popular fonts first
    if (aPopular !== -1 && bPopular !== -1) {
      return aPopular - bPopular;
    }
    if (aPopular !== -1) return -1;
    if (bPopular !== -1) return 1;
    
    // Then sort by category and name
    if (a.category !== b.category) {
      const categoryOrder = ['sans-serif', 'serif', 'monospace', 'display', 'handwriting'];
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    }
    
    return a.family.localeCompare(b.family);
  });
}

/**
 * Filters fonts by search query and category
 */
export function filterFonts(
  fonts: GoogleFont[], 
  searchQuery: string = '', 
  category: string = 'all'
): GoogleFont[] {
  let filtered = fonts;
  
  // Filter by category
  if (category && category !== 'all') {
    filtered = filtered.filter(font => font.category === category);
  }
  
  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(font => 
      font.family.toLowerCase().includes(query)
    );
  }
  
  return filtered;
}

/**
 * Loads a Google Font dynamically
 */
export function loadGoogleFont(fontFamily: string, weights: string[] = ['400']): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if font is already loaded
    const existingLink = document.querySelector(`link[href*="${fontFamily.replace(/\s+/g, '+')}"]`);
    if (existingLink) {
      resolve();
      return;
    }

    // Create font link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@${weights.join(';')}&display=swap`;

    // Handle load events
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load font: ${fontFamily}`));

    // Add to document
    document.head.appendChild(link);
  });
}

/**
 * Gets the CSS font-family string for a Google Font
 */
export function getFontFamilyString(fontFamily: string): string {
  // Add fallbacks based on category
  const font = fontsCache?.find(f => f.family === fontFamily);
  if (!font) return fontFamily;

  switch (font.category) {
    case 'serif':
      return `"${fontFamily}", serif`;
    case 'monospace':
      return `"${fontFamily}", monospace`;
    case 'handwriting':
      return `"${fontFamily}", cursive`;
    case 'display':
      return `"${fontFamily}", fantasy`;
    default:
      return `"${fontFamily}", sans-serif`;
  }
}

/**
 * Preloads popular fonts for better performance
 */
export async function preloadPopularFonts(): Promise<void> {
  const popularFonts = POPULAR_FONTS.slice(0, 5); // Load first 5 popular fonts
  
  try {
    await Promise.all(
      popularFonts.map(font => loadGoogleFont(font, ['400', '500', '600', '700']))
    );
  } catch (error) {
    console.warn('Failed to preload some popular fonts:', error);
  }
}