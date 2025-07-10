import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { themes, dashboards } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/dashboard/[dashboardId]/themes/[themeId]/activate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string; themeId: string }> }
) {
  const { dashboardId, themeId } = await params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify dashboard ownership
    const dashboard = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
      .limit(1);

    if (dashboard.length === 0) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    // Verify theme exists and belongs to dashboard
    const existingTheme = await db
      .select()
      .from(themes)
      .where(and(
        eq(themes.id, themeId),
        eq(themes.dashboardId, dashboardId)
      ))
      .limit(1);

    if (existingTheme.length === 0) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    // Deactivate all themes for this dashboard
    await db
      .update(themes)
      .set({ isActive: false })
      .where(eq(themes.dashboardId, dashboardId));

    // Activate the selected theme
    const activatedTheme = await db
      .update(themes)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(themes.id, themeId))
      .returning();

    console.log('Activated theme:', activatedTheme[0]);
    return NextResponse.json({ theme: activatedTheme[0] });
  } catch (error) {
    console.error("Error activating theme:", error);
    return NextResponse.json(
      { error: "Failed to activate theme" },
      { status: 500 }
    );
  }
}