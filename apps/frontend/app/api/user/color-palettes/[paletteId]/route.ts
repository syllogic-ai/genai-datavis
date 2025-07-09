import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { colorPalettes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { paletteId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, chartColors, brandColors, isDefault } = body;

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

    // If setting as default, unset other defaults
    if (isDefault && !existing[0].isDefault) {
      await db
        .update(colorPalettes)
        .set({ isDefault: false })
        .where(eq(colorPalettes.userId, userId));
    }

    // Update palette
    const updated = await db
      .update(colorPalettes)
      .set({
        name: name || existing[0].name,
        description: description !== undefined ? description : existing[0].description,
        chartColors: chartColors || existing[0].chartColors,
        brandColors: brandColors !== undefined ? brandColors : existing[0].brandColors,
        isDefault: isDefault !== undefined ? isDefault : existing[0].isDefault,
        updatedAt: new Date()
      })
      .where(eq(colorPalettes.id, params.paletteId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Failed to update color palette:", error);
    return NextResponse.json(
      { error: "Failed to update palette" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Don't allow deleting the default palette
    if (existing[0].isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default palette" },
        { status: 400 }
      );
    }

    // Delete palette
    await db
      .delete(colorPalettes)
      .where(eq(colorPalettes.id, params.paletteId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete color palette:", error);
    return NextResponse.json(
      { error: "Failed to delete palette" },
      { status: 500 }
    );
  }
}