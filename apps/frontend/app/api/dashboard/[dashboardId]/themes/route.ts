import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { themes, dashboards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/dashboard/[dashboardId]/themes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  const { dashboardId } = await params;
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

    // Fetch all themes for the dashboard
    const dashboardThemes = await db
      .select()
      .from(themes)
      .where(eq(themes.dashboardId, dashboardId))
      .orderBy(themes.createdAt);

    return NextResponse.json({ themes: dashboardThemes });
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/[dashboardId]/themes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  const { dashboardId } = await params;
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

    const body = await request.json();
    const { name, description, styles, presetId, isActive } = body;

    // If setting as active, deactivate other themes
    if (isActive) {
      await db
        .update(themes)
        .set({ isActive: false })
        .where(eq(themes.dashboardId, dashboardId));
    }

    // Create new theme
    const newTheme = await db
      .insert(themes)
      .values({
        id: nanoid(),
        dashboardId: dashboardId,
        name: name || "Custom Theme",
        description,
        styles,
        presetId,
        isActive: isActive || false,
      })
      .returning();

    return NextResponse.json({ theme: newTheme[0] });
  } catch (error) {
    console.error("Error creating theme:", error);
    return NextResponse.json(
      { error: "Failed to create theme" },
      { status: 500 }
    );
  }
}