import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateDashboard, getDashboard } from '@/app/lib/actions';
import db from '@/db';
import { dashboards, widgets, chats, messages, tasks, files } from '@/db/schema';
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
    const { name, description, icon, setupCompleted, width } = body;

    // Validate that at least one field is being updated
    if (!name && !description && !icon && setupCompleted === undefined && !width) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' }, 
        { status: 400 }
      );
    }

    // Prepare updates object
    const updates: { name?: string; description?: string; icon?: string; setupCompleted?: boolean; width?: string } = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon) updates.icon = icon;
    if (setupCompleted !== undefined) updates.setupCompleted = setupCompleted;
    if (width) updates.width = width;

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
  console.log('[DELETE API] Starting delete request');
  try {
    const { userId } = await auth();
    console.log('[DELETE API] Auth successful, userId:', userId);
    
    if (!userId) {
      console.log('[DELETE API] No userId found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await context.params;
    console.log('[DELETE API] Dashboard ID:', dashboardId);
    
    // Verify dashboard ownership
    console.log('[DELETE API] Checking dashboard ownership');
    const dashboard = await db.select()
      .from(dashboards)
      .where(and(
        eq(dashboards.id, dashboardId),
        eq(dashboards.userId, userId)
      ))
      .limit(1);

    console.log('[DELETE API] Dashboard query result:', dashboard);
    if (!dashboard.length) {
      console.log('[DELETE API] Dashboard not found or not owned by user');
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Perform cascading delete in transaction
    console.log('[DELETE API] Starting database transaction');
    await db.transaction(async (tx) => {
      // 1. Delete all widgets associated with the dashboard
      console.log('[DELETE API] Deleting widgets');
      await tx.delete(widgets)
        .where(eq(widgets.dashboardId, dashboardId));
      console.log('[DELETE API] Widgets deleted successfully');

      // 2. Delete all tasks associated with the dashboard
      console.log('[DELETE API] Deleting tasks');
      await tx.delete(tasks)
        .where(eq(tasks.dashboardId, dashboardId));
      console.log('[DELETE API] Tasks deleted successfully');

      // 3. Delete all messages associated with dashboard chats
      console.log('[DELETE API] Getting chat IDs for message deletion');
      const dashboardChats = await tx.select({ id: chats.id })
        .from(chats)
        .where(eq(chats.dashboardId, dashboardId));
      
      console.log('[DELETE API] Found chats:', dashboardChats.length);
      for (const chat of dashboardChats) {
        await tx.delete(messages)
          .where(eq(messages.chatId, chat.id));
      }
      console.log('[DELETE API] Messages deleted successfully');

      // 4. Delete all chats associated with the dashboard
      // Note: LLM usage records are preserved for analytics (no foreign key constraints)
      console.log('[DELETE API] Deleting chats');
      await tx.delete(chats)
        .where(eq(chats.dashboardId, dashboardId));
      console.log('[DELETE API] Chats deleted successfully');

      // 5. Delete all files associated with the dashboard
      // Note: In a real implementation, you would also delete the actual files from storage
      console.log('[DELETE API] Getting files for dashboard');
      const dashboardFiles = await tx.select()
        .from(files)
        .where(eq(files.dashboardId, dashboardId));
      
      console.log('[DELETE API] Found files:', dashboardFiles.length);
      for (const file of dashboardFiles) {
        // TODO: Delete actual file from storage system
        if (file.storagePath) {
          console.log(`[DELETE API] Would delete file from storage: ${file.storagePath}`);
        }
      }
      
      console.log('[DELETE API] Deleting file records');
      await tx.delete(files)
        .where(eq(files.dashboardId, dashboardId));
      console.log('[DELETE API] File records deleted successfully');

      // 6. Finally delete the dashboard itself
      console.log('[DELETE API] Deleting dashboard');
      await tx.delete(dashboards)
        .where(eq(dashboards.id, dashboardId));
      console.log('[DELETE API] Dashboard deleted successfully');
    });
    console.log('[DELETE API] Transaction completed successfully');

    // Invalidate all related cache entries
    try {
      console.log('[DELETE API] Invalidating cache entries');
      await dashboardCache.invalidateDashboardList(userId);
      await dashboardCache.invalidateAllDashboardData(dashboardId, userId);
      console.log(`[DELETE API] Dashboard cache invalidated after deletion for user ${userId}`);
    } catch (cacheError) {
      console.warn('[DELETE API] Failed to invalidate dashboard cache:', cacheError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[DELETE API] Error deleting dashboard:', error);
    console.error('[DELETE API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[DELETE API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to delete dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 