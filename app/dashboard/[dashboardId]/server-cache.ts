import { 
  getDashboard, 
  getDashboardFiles, 
  getDashboardWidgets,
  getDashboardChats 
} from "@/app/lib/actions";
import db from "@/db";
import { dashboards, themes, ThemeStyleProps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { THEME_PRESETS } from "@/lib/theme-presets";

// Server-side cache utility functions that work with the existing Redis cache
// These functions are optimized for server components and don't use unstable_cache

export async function getCachedDashboardData(dashboardId: string, userId: string) {
  try {
    console.log(`[ServerCache] Loading dashboard data for ${dashboardId}`);
    const dashboard = await getDashboard(dashboardId, userId);
    return dashboard;
  } catch (error) {
    console.warn(`[ServerCache] Failed to load dashboard ${dashboardId}:`, error);
    return null;
  }
}

export async function getCachedDashboardFiles(dashboardId: string, userId: string) {
  try {
    console.log(`[ServerCache] Loading files for dashboard ${dashboardId}`);
    // The getDashboardFiles function already has Redis caching built-in
    const files = await getDashboardFiles(dashboardId, userId);
    return files;
  } catch (error) {
    console.warn(`[ServerCache] Failed to load files for dashboard ${dashboardId}:`, error);
    return [];
  }
}

export async function getCachedDashboardWidgets(dashboardId: string, userId: string) {
  try {
    console.log(`[ServerCache] Loading widgets for dashboard ${dashboardId}`);
    const widgets = await getDashboardWidgets(dashboardId, userId);
    return widgets;
  } catch (error) {
    console.warn(`[ServerCache] Failed to load widgets for dashboard ${dashboardId}:`, error);
    return [];
  }
}

export async function getCachedDashboardChats(userId: string, dashboardId: string) {
  try {
    console.log(`[ServerCache] Loading chats for dashboard ${dashboardId}`);
    const chats = await getDashboardChats(userId, dashboardId);
    return chats;
  } catch (error) {
    console.warn(`[ServerCache] Failed to load chats for dashboard ${dashboardId}:`, error);
    return [];
  }
}

export async function getCachedDashboardTheme(dashboardId: string, userId: string) {
  try {
    console.log(`[ServerCache] Loading theme for dashboard ${dashboardId}`);
    
    // Get dashboard with its active theme - same logic as the API route
    const result = await db.select({
      dashboard: dashboards,
      theme: themes,
    })
    .from(dashboards)
    .leftJoin(themes, eq(dashboards.activeThemeId, themes.id))
    .where(and(
      eq(dashboards.id, dashboardId),
      eq(dashboards.userId, userId)
    ))
    .limit(1);

    if (!result[0]) {
      console.warn(`[ServerCache] Dashboard ${dashboardId} not found`);
      return null;
    }

    const dashboard = result[0].dashboard;
    let theme = result[0].theme;

    // If no theme found in database, check if it's a preset theme
    if (!theme && dashboard.activeThemeId) {
      const presetTheme = THEME_PRESETS.find(p => p.id === dashboard.activeThemeId);
      if (presetTheme) {
        // Convert preset to theme format
        theme = {
          id: presetTheme.id,
          userId: userId,
          name: presetTheme.name,
          description: presetTheme.description,
          isDefault: false,
          presetId: presetTheme.id,
          styles: presetTheme.styles as { light: ThemeStyleProps; dark: ThemeStyleProps },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    return { dashboard, theme };
  } catch (error) {
    console.warn(`[ServerCache] Failed to load theme for dashboard ${dashboardId}:`, error);
    return null;
  }
}

// Optimized parallel data fetcher for server components
export async function preloadDashboardData(dashboardId: string, userId: string) {
  console.log(`[ServerCache] Preloading all data for dashboard ${dashboardId}`);
  
  const startTime = Date.now();
  
  // Load all data in parallel, but with error handling for each
  const [dashboardData, filesData, widgetsData, chatsData, themeData] = await Promise.allSettled([
    getCachedDashboardData(dashboardId, userId),
    getCachedDashboardFiles(dashboardId, userId),
    getCachedDashboardWidgets(dashboardId, userId),
    getCachedDashboardChats(userId, dashboardId),
    getCachedDashboardTheme(dashboardId, userId),
  ]);

  const loadTime = Date.now() - startTime;
  console.log(`[ServerCache] Preload completed in ${loadTime}ms`);

  // Extract data from settled promises
  return {
    dashboard: dashboardData.status === 'fulfilled' ? dashboardData.value : null,
    files: filesData.status === 'fulfilled' ? filesData.value : [],
    widgets: widgetsData.status === 'fulfilled' ? widgetsData.value : [],
    chats: chatsData.status === 'fulfilled' ? chatsData.value : [],
    themeData: themeData.status === 'fulfilled' ? themeData.value : null,
  };
}