import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db";
import { userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get user preferences
    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (preferences.length === 0) {
      // Return default preferences if none exist
      return NextResponse.json({
        themeColors: {
          primary: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
          secondary: ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee"],
          accent: "#3b82f6",
          background: "#ffffff",
          foreground: "#020817",
          muted: "#f1f5f9",
          border: "#e2e8f0"
        },
        chartDefaults: {
          showLegend: true,
          showGrid: true,
          animation: true
        }
      });
    }

    return NextResponse.json(preferences[0]);
  } catch (error) {
    console.error("Failed to get user preferences:", error);
    return NextResponse.json(
      { error: "Failed to get preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { themeColors, chartDefaults } = body;

    // Check if preferences exist
    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      // Create new preferences
      const newPreferences = await db
        .insert(userPreferences)
        .values({
          id: nanoid(),
          userId,
          chartDefaults: chartDefaults || undefined,
          updatedAt: new Date()
        })
        .returning();

      return NextResponse.json(newPreferences[0]);
    } else {
      // Update existing preferences
      const updateData: any = {
        updatedAt: new Date()
      };

      // Note: themeColors is handled separately via themes table
      
      if (chartDefaults !== undefined) {
        updateData.chartDefaults = chartDefaults;
      }

      const updated = await db
        .update(userPreferences)
        .set(updateData)
        .where(eq(userPreferences.userId, userId))
        .returning();

      return NextResponse.json(updated[0]);
    }
  } catch (error) {
    console.error("Failed to update user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}