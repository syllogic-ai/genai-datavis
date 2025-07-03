import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateDashboard, getDashboard } from '@/app/lib/actions';
import db from '@/db';
import { dashboards, widgets, chats, files } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { dashboardCache } from '@/lib/redis';

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
    
    // Get dashboard
    const dashboard = await getDashboard(dashboardId, userId);
    
    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    const body = await request.json();
    const { name, description, icon } = body;

    // Validate that at least one field is being updated
    if (!name && !description && !icon) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' }, 
        { status: 400 }
      );
    }

    // Prepare updates object
    const updates: { name?: string; description?: string; icon?: string } = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon) updates.icon = icon;

    // Update dashboard
    const result = await updateDashboard(dashboardId, userId, updates);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    
    // Verify dashboard ownership
    const dashboard = await db.select()
      .from(dashboards)
      .where(and(
        eq(dashboards.id, dashboardId),
        eq(dashboards.userId, userId)
      ))
      .limit(1);

    if (!dashboard.length) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Perform cascading delete in transaction
    await db.transaction(async (tx) => {
      // 1. Delete all widgets associated with the dashboard
      await tx.delete(widgets)
        .where(eq(widgets.dashboardId, dashboardId));

      // 2. Delete all chats associated with the dashboard
      await tx.delete(chats)
        .where(eq(chats.dashboardId, dashboardId));

      // 3. Delete all files associated with the dashboard
      // Note: In a real implementation, you would also delete the actual files from storage
      const dashboardFiles = await tx.select()
        .from(files)
        .where(eq(files.dashboardId, dashboardId));
      
      for (const file of dashboardFiles) {
        // TODO: Delete actual file from storage system
        if (file.storagePath) {
          console.log(`Would delete file from storage: ${file.storagePath}`);
        }
      }
      
      await tx.delete(files)
        .where(eq(files.dashboardId, dashboardId));

      // 4. Finally delete the dashboard itself
      await tx.delete(dashboards)
        .where(eq(dashboards.id, dashboardId));
    });

    // Invalidate dashboard list cache
    try {
      await dashboardCache.invalidateDashboardList(userId);
      console.log(`[API] Dashboard list cache invalidated after deletion for user ${userId}`);
    } catch (cacheError) {
      console.warn('Failed to invalidate dashboard list cache:', cacheError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' }, 
      { status: 500 }
    );
  }
} 