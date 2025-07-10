import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { themes, dashboards } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// PUT /api/dashboard/[dashboardId]/themes/[themeId]
export async function PUT(
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

    const body = await request.json();
    const { name, description, styles, presetId } = body;

    // Update theme
    const updatedTheme = await db
      .update(themes)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(styles !== undefined && { styles }),
        ...(presetId !== undefined && { presetId }),
        updatedAt: new Date(),
      })
      .where(eq(themes.id, themeId))
      .returning();

    return NextResponse.json({ theme: updatedTheme[0] });
  } catch (error) {
    console.error("Error updating theme:", error);
    return NextResponse.json(
      { error: "Failed to update theme" },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboard/[dashboardId]/themes/[themeId]
export async function DELETE(
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

    // Don't delete if it's the only active theme
    if (existingTheme[0].isActive) {
      const otherThemes = await db
        .select()
        .from(themes)
        .where(and(
          eq(themes.dashboardId, params.dashboardId),
          eq(themes.isActive, false)
        ))
        .limit(1);

      if (otherThemes.length === 0) {
        return NextResponse.json(
          { error: "Cannot delete the only active theme" },
          { status: 400 }
        );
      }
    }

    // Delete theme
    await db.delete(themes).where(eq(themes.id, params.themeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting theme:", error);
    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 }
    );
  }
}