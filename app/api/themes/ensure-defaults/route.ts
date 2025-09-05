import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import db from "@/db";
import { themes } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
// Default theme configurations
const DEFAULT_THEMES = [
  {
    name: "Professional Blue",
    description: "Clean and professional theme with blue accents",
    isDefault: true,
    styles: {
      light: {
        "chart-1": "oklch(0.61 0.20 237)",
        "chart-2": "oklch(0.72 0.15 165)",
        "chart-3": "oklch(0.70 0.18 85)",
        "chart-4": "oklch(0.74 0.19 40)",
        "chart-5": "oklch(0.62 0.21 285)",
        "chart-positive": "oklch(0.5682 0.167 135.46)",
        "chart-negative": "oklch(0.4149 0.1695 28.96)",
        "font-sans": "Inter, sans-serif",
        "font-serif": "Source Serif 4, serif",
        "font-mono": "JetBrains Mono, monospace",
        "font-size-base": "16px",
        "font-size-sm": "14px",
        "font-size-lg": "18px",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 84% 4.9%)",
        card: "hsl(0 0% 100%)",
        "card-foreground": "hsl(222.2 84% 4.9%)",
        primary: "hsl(221.2 83.2% 53.3%)",
        "primary-foreground": "hsl(210 40% 98%)",
        secondary: "hsl(210 40% 96.1%)",
        "secondary-foreground": "hsl(222.2 47.4% 11.2%)",
        muted: "hsl(210 40% 96.1%)",
        "muted-foreground": "hsl(215.4 16.3% 46.9%)",
        accent: "hsl(210 40% 96.1%)",
        "accent-foreground": "hsl(222.2 47.4% 11.2%)",
        destructive: "hsl(0 84.2% 60.2%)",
        "destructive-foreground": "hsl(210 40% 98%)",
        border: "hsl(214.3 31.8% 91.4%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(221.2 83.2% 53.3%)",
        radius: "0.5rem",
        spacing: "0.25rem",
        "shadow-color": "hsl(222.2 84% 4.9%)",
        "shadow-opacity": "0.1",
        "shadow-blur": "3px",
        "shadow-spread": "0px",
        "shadow-offset-x": "0",
        "shadow-offset-y": "1px",
        "letter-spacing": "0em"
      },
      dark: {
        "chart-1": "oklch(0.61 0.20 237)",
        "chart-2": "oklch(0.72 0.15 165)",
        "chart-3": "oklch(0.70 0.18 85)",
        "chart-4": "oklch(0.74 0.19 40)",
        "chart-5": "oklch(0.62 0.21 285)",
        "chart-positive": "oklch(0.5682 0.167 135.46)",
        "chart-negative": "oklch(0.4149 0.1695 28.96)",
        "font-sans": "Inter, sans-serif",
        "font-serif": "Source Serif 4, serif",
        "font-mono": "JetBrains Mono, monospace",
        "font-size-base": "16px",
        "font-size-sm": "14px",
        "font-size-lg": "18px",
        background: "hsl(222.2 84% 4.9%)",
        foreground: "hsl(210 40% 98%)",
        card: "hsl(222.2 84% 4.9%)",
        "card-foreground": "hsl(210 40% 98%)",
        primary: "hsl(217.2 91.2% 59.8%)",
        "primary-foreground": "hsl(222.2 47.4% 11.2%)",
        secondary: "hsl(217.2 32.6% 17.5%)",
        "secondary-foreground": "hsl(210 40% 98%)",
        muted: "hsl(217.2 32.6% 17.5%)",
        "muted-foreground": "hsl(215 20.2% 65.1%)",
        accent: "hsl(217.2 32.6% 17.5%)",
        "accent-foreground": "hsl(210 40% 98%)",
        destructive: "hsl(0 62.8% 30.6%)",
        "destructive-foreground": "hsl(210 40% 98%)",
        border: "hsl(217.2 32.6% 17.5%)",
        input: "hsl(217.2 32.6% 17.5%)",
        ring: "hsl(224.3 76.3% 48%)",
        radius: "0.5rem",
        spacing: "0.25rem",
        "shadow-color": "hsl(0 0% 0%)",
        "shadow-opacity": "0.3",
        "shadow-blur": "3px",
        "shadow-spread": "0px",
        "shadow-offset-x": "0",
        "shadow-offset-y": "1px",
        "letter-spacing": "0em"
      }
    }
  }
];

// POST /api/themes/ensure-defaults - Ensure user has default themes
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has any default themes
    const existingThemes = await db.select().from(themes)
      .where(and(eq(themes.userId, userId), eq(themes.isDefault, true)));

    if (existingThemes.length > 0) {
      return NextResponse.json({ 
        message: "User already has default themes",
        themes: existingThemes 
      });
    }

    // Create default themes for the user
    const newThemes = await Promise.all(
      DEFAULT_THEMES.map(async (defaultTheme) => {
        const themeData = {
          id: nanoid(),
          userId,
          name: defaultTheme.name,
          description: defaultTheme.description,
          isDefault: defaultTheme.isDefault,
          styles: defaultTheme.styles,
          presetId: null,
        };

        const [createdTheme] = await db.insert(themes)
          .values(themeData)
          .returning();

        return createdTheme;
      })
    );

    // Set the first theme as active for all user dashboards that don't have a theme
    if (newThemes.length > 0) {
      const { dashboards } = await import("@/db/schema");
      
      await db.update(dashboards)
        .set({
          activeThemeId: newThemes[0].id,
          updatedAt: new Date(),
        })
        .where(and(
          eq(dashboards.userId, userId),
          isNull(dashboards.activeThemeId)
        ));
    }

    return NextResponse.json({ 
      message: "Default themes created successfully",
      themes: newThemes 
    });
  } catch (error) {
    console.error("Error ensuring default themes:", error);
    return NextResponse.json(
      { error: "Failed to ensure default themes" },
      { status: 500 }
    );
  }
}