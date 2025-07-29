import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { dashboards, themes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/dashboard/[dashboardId]/theme - Get the active theme for a dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
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

    return NextResponse.json({ 
      dashboard: result[0].dashboard,
      theme: result[0].theme 
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
    const { userId } = await auth();
    const { dashboardId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { themeId } = body;

    // Verify dashboard belongs to user
    const dashboard = await db.select().from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
      .limit(1);

    if (!dashboard[0]) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    // If themeId is provided, verify the theme exists and belongs to the user
    if (themeId) {
      const theme = await db.select().from(themes)
        .where(and(eq(themes.id, themeId), eq(themes.userId, userId)))
        .limit(1);

      if (!theme[0]) {
        return NextResponse.json({ error: "Theme not found" }, { status: 404 });
      }
    }

    // Update dashboard with new theme
    const updatedDashboard = await db.update(dashboards)
      .set({
        activeThemeId: themeId || null,
        updatedAt: new Date(),
      })
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