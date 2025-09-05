import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/db";
import { dashboards, themes, ThemeStyleProps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { THEME_PRESETS } from "@/lib/theme-presets";

// GET /api/dashboard/[dashboardId]/theme - Get the active theme for a dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    const { dashboardId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get dashboard with its active theme
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
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
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

    return NextResponse.json({ 
      dashboard,
      theme 
    });
  } catch (error) {
    console.error("Error fetching dashboard theme:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard theme" },
      { status: 500 }
    );
  }
}

// PUT /api/dashboard/[dashboardId]/theme - Set the active theme for a dashboard
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    const { dashboardId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { themeId, themeMode } = body;

    // Verify dashboard belongs to user
    const dashboard = await db.select().from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
      .limit(1);

    if (!dashboard[0]) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    // If themeId is provided, verify the theme exists (either in database or as preset)
    if (themeId) {
      // First check if it's a user theme
      const userTheme = await db.select().from(themes)
        .where(and(eq(themes.id, themeId), eq(themes.userId, userId)))
        .limit(1);

      // If not found, check if it's a preset theme
      if (!userTheme[0]) {
        const presetTheme = THEME_PRESETS.find(p => p.id === themeId);
        if (!presetTheme) {
          return NextResponse.json({ error: "Theme not found" }, { status: 404 });
        }
      }
    }

    // Update dashboard with new theme and/or mode
    const updateData: any = { updatedAt: new Date() };
    if (themeId !== undefined) updateData.activeThemeId = themeId || null;
    if (themeMode !== undefined) updateData.themeMode = themeMode;

    const updatedDashboard = await db.update(dashboards)
      .set(updateData)
      .where(eq(dashboards.id, dashboardId))
      .returning();

    return NextResponse.json({ dashboard: updatedDashboard[0] });
  } catch (error) {
    console.error("Error updating dashboard theme:", error);
    return NextResponse.json(
      { error: "Failed to update dashboard theme" },
      { status: 500 }
    );
  }
}