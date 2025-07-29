import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { themes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/themes/[themeId] - Get a specific theme
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ themeId: string }> }
) {
  try {
    const { userId } = await auth();
    const { themeId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const theme = await db.select().from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.userId, userId)))
      .limit(1);

    if (!theme[0]) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    return NextResponse.json({ theme: theme[0] });
  } catch (error) {
    console.error("Error fetching theme:", error);
    return NextResponse.json(
      { error: "Failed to fetch theme" },
      { status: 500 }
    );
  }
}

// PUT /api/themes/[themeId] - Update a theme
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ themeId: string }> }
) {
  try {
    const { userId } = await auth();
    const { themeId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, styles, isDefault } = body;

    // Verify the theme belongs to the user
    const existingTheme = await db.select().from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.userId, userId)))
      .limit(1);

    if (!existingTheme[0]) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    const updatedTheme = await db.update(themes)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(styles && { styles }),
        ...(isDefault !== undefined && { isDefault }),
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

// DELETE /api/themes/[themeId] - Delete a theme
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ themeId: string }> }
) {
  try {
    const { userId } = await auth();
    const { themeId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the theme belongs to the user and is not a default theme
    const existingTheme = await db.select().from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.userId, userId)))
      .limit(1);

    if (!existingTheme[0]) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    if (existingTheme[0].isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default themes" },
        { status: 403 }
      );
    }

    await db.delete(themes).where(eq(themes.id, themeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting theme:", error);
    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 }
    );
  }
}