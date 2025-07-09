import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { colorPalettes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { paletteId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if palette exists and belongs to user
    const existing = await db
      .select()
      .from(colorPalettes)
      .where(and(
        eq(colorPalettes.id, params.paletteId),
        eq(colorPalettes.userId, userId)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Palette not found" }, { status: 404 });
    }

    // Unset all other defaults for this user
    await db
      .update(colorPalettes)
      .set({ isDefault: false })
      .where(eq(colorPalettes.userId, userId));

    // Set this palette as default
    const updated = await db
      .update(colorPalettes)
      .set({ 
        isDefault: true,
        updatedAt: new Date()
      })
      .where(eq(colorPalettes.id, params.paletteId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Failed to set default palette:", error);
    return NextResponse.json(
      { error: "Failed to set default palette" },
      { status: 500 }
    );
  }
}