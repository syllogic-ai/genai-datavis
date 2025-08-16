import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";  
import { dashboards } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dashboardId } = await params;

    if (!dashboardId) {
      return NextResponse.json({ error: "Dashboard ID is required" }, { status: 400 });
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

    // Update dashboard to public
    await db
      .update(dashboards)
      .set({ 
        isPublic: true,
        updatedAt: new Date()
      })
      .where(eq(dashboards.id, dashboardId));

    return NextResponse.json({ 
      success: true, 
      message: "Dashboard published successfully",
      isPublic: true
    });

  } catch (error) {
    console.error("Error publishing dashboard:", error);
    return NextResponse.json(
      { error: "Failed to publish dashboard" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dashboardId } = await params;

    if (!dashboardId) {
      return NextResponse.json({ error: "Dashboard ID is required" }, { status: 400 });
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

    // Update dashboard to private
    await db
      .update(dashboards)
      .set({ 
        isPublic: false,
        updatedAt: new Date()
      })
      .where(eq(dashboards.id, dashboardId));

    return NextResponse.json({ 
      success: true, 
      message: "Dashboard made private successfully",
      isPublic: false
    });

  } catch (error) {
    console.error("Error unpublishing dashboard:", error);
    return NextResponse.json(
      { error: "Failed to unpublish dashboard" },
      { status: 500 }
    );
  }
}