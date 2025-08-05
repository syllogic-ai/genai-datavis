import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { dashboards, widgets, themes, ThemeStyleProps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { THEME_PRESETS } from "@/lib/theme-presets";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;

    if (!dashboardId) {
      return NextResponse.json({ error: "Dashboard ID is required" }, { status: 400 });
    }

    // Fetch dashboard with theme - must be public
    const result = await db
      .select({
        dashboard: dashboards,
        theme: themes,
      })
      .from(dashboards)
      .leftJoin(themes, eq(dashboards.activeThemeId, themes.id))
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.isPublic, true)))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: "Dashboard not found or not public" }, { status: 404 });
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
          userId: dashboard.userId, // Use dashboard owner's userId
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

    // Fetch widgets for the dashboard
    const dashboardWidgets = await db
      .select()
      .from(widgets)
      .where(eq(widgets.dashboardId, dashboardId))
      .orderBy(widgets.order);

    // Remove sensitive data from widgets (like SQL queries, chat IDs, etc.)
    const sanitizedWidgets = dashboardWidgets.map(widget => ({
      id: widget.id,
      type: widget.type,
      title: widget.title,
      config: widget.config,
      data: widget.data,
      layout: widget.layout,
      order: widget.order,
      createdAt: widget.createdAt,
      updatedAt: widget.updatedAt,
      // Exclude: sql, chatId, cacheKey, lastDataFetch
    }));

    // Remove sensitive data from dashboard
    const sanitizedDashboard = {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      icon: dashboard.icon,
      width: dashboard.width || 'full', // Include width setting for layout
      themeMode: dashboard.themeMode || 'light', // Include theme mode for public dashboards
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
      // Exclude: userId, setupCompleted, activeThemeId
    };

    return NextResponse.json({
      dashboard: sanitizedDashboard,
      widgets: sanitizedWidgets,
      theme: theme, // Include theme information for public dashboards
    });

  } catch (error) {
    console.error("Error fetching public dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}