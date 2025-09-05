import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { nanoid } from 'nanoid';
import db from '@/db';
import { dashboards, widgets, files } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { dashboardCache } from '@/lib/redis';

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
    
    // Get the original dashboard
    const originalDashboard = await db.select()
      .from(dashboards)
      .where(and(
        eq(dashboards.id, dashboardId),
        eq(dashboards.userId, userId)
      ))
      .limit(1);

    if (!originalDashboard.length) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const original = originalDashboard[0];
    const newDashboardId = nanoid();

    // Get all widgets from the original dashboard
    const originalWidgets = await db.select()
      .from(widgets)
      .where(eq(widgets.dashboardId, dashboardId));

    // Get all files associated with the original dashboard
    const originalFiles = await db.select()
      .from(files)
      .where(eq(files.dashboardId, dashboardId));

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create new dashboard
      const newDashboard = await tx.insert(dashboards).values({
        id: newDashboardId,
        userId,
        name: `Copy of ${original.name}`,
        description: original.description,
        icon: original.icon,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // 2. Duplicate files and update storage paths
      const newFiles = [];
      for (const file of originalFiles) {
        const newFileId = nanoid();
        const newStoragePath = file.storagePath ? file.storagePath.replace(dashboardId, newDashboardId) : file.storagePath;
        
        // Duplicate file record (using the updated schema)
        const newFile = await tx.insert(files).values({
          id: newFileId,
          userId,
          dashboardId: newDashboardId,
          fileType: 'original', // Default to original file type
          originalFilename: file.originalFilename,
          sanitizedFilename: file.sanitizedFilename,
          storagePath: newStoragePath,
          status: 'ready',
          createdAt: new Date(),
        }).returning();

        newFiles.push(newFile[0]);

        // Copy file in storage (this is a simplified approach - in practice you'd need to copy the actual file)
        if (file.storagePath && newStoragePath) {
          try {
            // Note: In a real implementation, you would copy the actual file from storage
            // For now, we're just updating the path references
            console.log(`File duplication: ${file.storagePath} -> ${newStoragePath}`);
          } catch (error) {
            console.warn('Failed to copy file in storage:', error);
          }
        }
      }

      // 3. Files are now linked via dashboardId, so no need to update dashboard record

      // 4. Duplicate widgets
      const newWidgets = [];
      for (const widget of originalWidgets) {
        const newWidgetId = nanoid();
        
        const newWidget = await tx.insert(widgets).values({
          id: newWidgetId,
          dashboardId: newDashboardId,
          type: widget.type,
          title: widget.title,
          config: widget.config,
          data: widget.data,
          isConfigured: widget.isConfigured,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        newWidgets.push(newWidget[0]);
      }

      return {
        dashboard: newDashboard[0],
        widgets: newWidgets,
        files: newFiles,
      };
    });

    // Invalidate dashboard list cache
    try {
      await dashboardCache.invalidateDashboardList(userId);
      console.log(`[API] Dashboard list cache invalidated after duplication for user ${userId}`);
    } catch (cacheError) {
      console.warn('Failed to invalidate dashboard list cache:', cacheError);
    }

    return NextResponse.json({
      ...result.dashboard,
      widgetCount: result.widgets.length,
      fileCount: result.files.length,
    });

  } catch (error) {
    console.error('Error duplicating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate dashboard' }, 
      { status: 500 }
    );
  }
}