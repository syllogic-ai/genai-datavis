import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import db from '@/db';
import { widgets, dashboards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Widget } from '@/types/enhanced-dashboard-types';

// GET: Load widgets for a dashboard
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;

    // Verify dashboard belongs to user
    const dashboard = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
      .limit(1);

    if (dashboard.length === 0) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Load widgets
    const dashboardWidgets = await db
      .select()
      .from(widgets)
      .where(eq(widgets.dashboardId, dashboardId))
      .orderBy(widgets.createdAt);

    // Transform database widgets to frontend Widget format
    const frontendWidgets: Widget[] = dashboardWidgets.map((dbWidget: any) => ({
      id: dbWidget.id,
      type: dbWidget.type as Widget['type'],
      layout: dbWidget.layout,
      config: dbWidget.config,
      data: dbWidget.data,
      chatId: dbWidget.chatId,
      isConfigured: dbWidget.isConfigured,
    }));

    return NextResponse.json({ widgets: frontendWidgets });
  } catch (error) {
    console.error('Error loading widgets:', error);
    return NextResponse.json(
      { error: 'Failed to load widgets' },
      { status: 500 }
    );
  }
}

// POST: Save widgets for a dashboard
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    const { widgets: widgetsToSave }: { widgets: Widget[] } = await request.json();

    // Verify dashboard belongs to user
    const dashboard = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
      .limit(1);

    if (dashboard.length === 0) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Delete existing widgets
    await db.delete(widgets).where(eq(widgets.dashboardId, dashboardId));

    // Insert new widgets
    if (widgetsToSave.length > 0) {
      const dbWidgets = widgetsToSave.map(widget => ({
        id: widget.id,
        dashboardId,
        title: widget.type, // Use type as title for now
        type: widget.type,
        config: widget.config,
        data: widget.data,
        layout: widget.layout,
        chatId: widget.chatId || null,
        isConfigured: widget.isConfigured || false,
        updatedAt: new Date(),
      }));

      await db.insert(widgets).values(dbWidgets);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving widgets:', error);
    return NextResponse.json(
      { error: 'Failed to save widgets' },
      { status: 500 }
    );
  }
}