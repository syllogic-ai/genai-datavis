import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import db from '@/db';
import { widgets, dashboards } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Widget } from '@/types/enhanced-dashboard-types';
import { dashboardCache, withRedisCache } from '@/lib/redis';

// GET: Load widgets for a dashboard with Redis caching
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    const { searchParams } = new URL(request.url);
    const bustCache = searchParams.get('bustCache') === 'true';

    // Cache-first approach with fallback to database (skip cache if bust requested)
    const cachedWidgets = bustCache ? null : await withRedisCache(
      // Try cache first (unless cache busting)
      async () => {
        const cached = await dashboardCache.getDashboardWidgets(dashboardId, userId);
        if (cached && Array.isArray(cached)) {
          console.log(`[API] Cache HIT - Loaded ${cached.length} widgets for dashboard ${dashboardId}`);
          return { widgets: cached, fromCache: true };
        }
        return null;
      },
      // Fallback to database
      async () => {
        console.log(`[API] ${bustCache ? 'Cache BUST' : 'Cache MISS'} - Loading widgets from database for dashboard ${dashboardId}`);
        
        // If cache busting, invalidate cache first
        if (bustCache) {
          try {
            await dashboardCache.invalidateDashboardWidgets(dashboardId, userId);
            console.log(`[API] Cache invalidated for dashboard ${dashboardId}`);
          } catch (cacheError) {
            console.warn('Failed to invalidate cache during bust:', cacheError);
          }
        }
        
        // Verify dashboard belongs to user
        const dashboard = await db
          .select()
          .from(dashboards)
          .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
          .limit(1);

        if (dashboard.length === 0) {
          throw new Error('Dashboard not found');
        }

        // Load widgets from database
        const dashboardWidgets = await db
          .select()
          .from(widgets)
          .where(eq(widgets.dashboardId, dashboardId));

        // Transform database widgets to frontend Widget format
        const frontendWidgets: Widget[] = dashboardWidgets.map((dbWidget: any) => ({
          id: dbWidget.id,
          type: dbWidget.type as Widget['type'],
          layout: dbWidget.layout,
          order: dbWidget.order,
          config: dbWidget.config,
          data: dbWidget.data,
          sql: dbWidget.sql,
          chatId: dbWidget.chatId,
          isConfigured: dbWidget.isConfigured,
          cacheKey: dbWidget.cacheKey,
          lastDataFetch: dbWidget.lastDataFetch,
        }));

        // Cache the results for future requests (unless this was a cache bust)
        if (!bustCache) {
          await dashboardCache.setDashboardWidgets(dashboardId, userId, frontendWidgets);
        }
        
        console.log(`[API] Loaded ${bustCache ? '(no cache)' : 'and cached'} ${frontendWidgets.length} widgets for dashboard ${dashboardId}`);
        return { widgets: frontendWidgets, fromCache: false };
      }
    );

    // If cache operation failed, fall back to database
    if (!cachedWidgets) {
      // Verify dashboard belongs to user
      const dashboard = await db
        .select()
        .from(dashboards)
        .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
        .limit(1);

      if (dashboard.length === 0) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
      }

      // Load widgets from database as final fallback
      const dashboardWidgets = await db
        .select()
        .from(widgets)
        .where(eq(widgets.dashboardId, dashboardId));

      const frontendWidgets: Widget[] = dashboardWidgets.map((dbWidget: any) => ({
        id: dbWidget.id,
        type: dbWidget.type as Widget['type'],
        layout: dbWidget.layout,
        order: dbWidget.order,
        config: dbWidget.config,
        data: dbWidget.data,
        sql: dbWidget.sql,
        chatId: dbWidget.chatId,
        isConfigured: dbWidget.isConfigured,
        cacheKey: dbWidget.cacheKey,
        lastDataFetch: dbWidget.lastDataFetch,
      }));

      console.log(`[API] Fallback - Loaded ${frontendWidgets.length} widgets for dashboard ${dashboardId}`);
      return NextResponse.json({ widgets: frontendWidgets });
    }

    return NextResponse.json(cachedWidgets);
  } catch (error) {
    console.error('Error loading widgets:', error);
    if (error instanceof Error && error.message === 'Dashboard not found') {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }
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
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    const body = await request.json();

    console.log(`[API] Saving widgets for dashboard ${dashboardId}:`, {
      creates: body.creates?.length || 0,
      updates: body.updates?.length || 0,
      deletes: body.deletes?.length || 0
    });

    // Verify dashboard belongs to user
    const dashboard = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
      .limit(1);

    if (dashboard.length === 0) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Handle batch operations
    const { creates = [], updates = [], deletes = [] } = body;
    const promises: Promise<any>[] = [];

    // Batch create
    if (creates.length > 0) {
      const widgetsToCreate = creates.map((widget: Widget) => ({
        id: widget.id,
        dashboardId,
        title: widget.config.title || widget.type,
        type: widget.type,
        config: widget.config,
        data: widget.data,
        sql: widget.sql,
        layout: widget.layout,
        order: widget.order,
        chatId: widget.chatId || null,
        isConfigured: widget.isConfigured || false,
        cacheKey: widget.cacheKey || null,
        lastDataFetch: widget.lastDataFetch || null,
        updatedAt: new Date(),
      }));

      console.log(`[API] Creating ${creates.length} widgets:`, creates.map((w: Widget) => ({ id: w.id, type: w.type })));
      promises.push(db.insert(widgets).values(widgetsToCreate));
    }

    // Batch update
    if (updates.length > 0) {
      console.log(`[API] Updating ${updates.length} widgets:`, updates.map((w: Widget) => ({ id: w.id, type: w.type })));
      updates.forEach((widget: Widget) => {
        promises.push(
          db
            .update(widgets)
            .set({
              title: widget.config.title || widget.type,
              type: widget.type,
              config: widget.config,
              data: widget.data,
              order: widget.order,
              isConfigured: widget.isConfigured || false,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(widgets.id, widget.id),
                eq(widgets.dashboardId, dashboardId)
              )
            )
        );
      });
    }

    // Batch delete
    if (deletes.length > 0) {
      console.log(`[API] Deleting ${deletes.length} widgets:`, deletes);
      promises.push(
        db
          .delete(widgets)
          .where(
            and(
              inArray(widgets.id, deletes),
              eq(widgets.dashboardId, dashboardId)
            )
          )
      );
    }

    // Execute all operations
    await Promise.all(promises);

    // Invalidate cache after successful widget updates
    try {
      await dashboardCache.invalidateDashboardWidgets(dashboardId, userId);
      console.log(`[API] Cache invalidated for dashboard ${dashboardId} widgets`);
    } catch (cacheError) {
      console.warn('Failed to invalidate widget cache:', cacheError);
    }

    console.log(`[API] Successfully saved widgets for dashboard ${dashboardId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving widgets:', error);
    return NextResponse.json(
      { error: 'Failed to save widgets' },
      { status: 500 }
    );
  }
}