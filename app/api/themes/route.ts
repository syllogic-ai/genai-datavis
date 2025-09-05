import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/db";
import { themes, Theme } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET /api/themes - Get all themes for the current user
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userThemes = await db.select().from(themes)
      .where(eq(themes.userId, userId))
      .orderBy(themes.createdAt);

    return NextResponse.json({ themes: userThemes });
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}

// POST /api/themes - Create a new theme
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, styles, isDefault = false } = body;

    if (!name || !styles) {
      return NextResponse.json(
        { error: "Name and styles are required" },
        { status: 400 }
      );
    }

    const themeId = nanoid();
    
    const newTheme = await db.insert(themes).values({
      id: themeId,
      userId,
      name,
      description,
      isDefault,
      styles,
    }).returning();

    return NextResponse.json({ theme: newTheme[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating theme:", error);
    return NextResponse.json(
      { error: "Failed to create theme" },
      { status: 500 }
    );
  }
}