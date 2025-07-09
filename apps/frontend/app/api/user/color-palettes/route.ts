import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { colorPalettes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all user's color palettes
    const palettes = await db
      .select()
      .from(colorPalettes)
      .where(eq(colorPalettes.userId, userId))
      .orderBy(colorPalettes.isDefault, colorPalettes.createdAt);

    return NextResponse.json({ palettes });
  } catch (error) {
    console.error("Failed to get color palettes:", error);
    return NextResponse.json(
      { error: "Failed to get palettes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, chartColors, brandColors, isDefault } = body;

    if (!name || !chartColors) {
      return NextResponse.json(
        { error: "Name and chart colors are required" },
        { status: 400 }
      );
    }

    // If this is to be the default, unset other defaults
    if (isDefault) {
      await db
        .update(colorPalettes)
        .set({ isDefault: false })
        .where(eq(colorPalettes.userId, userId));
    }

    // Create new palette
    const newPalette = await db
      .insert(colorPalettes)
      .values({
        id: nanoid(),
        userId,
        name,
        description: description || null,
        chartColors,
        brandColors: brandColors || null,
        isDefault: isDefault || false,
      })
      .returning();

    return NextResponse.json(newPalette[0]);
  } catch (error) {
    console.error("Failed to create color palette:", error);
    return NextResponse.json(
      { error: "Failed to create palette" },
      { status: 500 }
    );
  }
}