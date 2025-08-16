/**
 * Helper function to add theme colors to API requests
 * This ensures the backend uses the user's preferred colors when generating charts
 */
export async function fetchWithTheme(url: string, options: RequestInit = {}) {
  // Try to get user preferences from the API
  let themeColors = null;
  
  try {
    const prefsResponse = await fetch('/api/user/preferences');
    if (prefsResponse.ok) {
      const prefs = await prefsResponse.json();
      themeColors = prefs.themeColors;
    }
  } catch (error) {
    console.warn('Failed to fetch user theme preferences:', error);
  }
  
  // Merge theme colors into the request
  const body = options.body ? JSON.parse(options.body as string) : {};
  
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify({
      ...body,
      themeColors: themeColors || {
        primary: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
        secondary: ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee"],
      }
    })
  };
  
  return fetch(url, enhancedOptions);
}