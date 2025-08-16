'use server';

import { auth } from '@clerk/nextjs/server';
import db from '@/db';
import { widgets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function saveTextWidgetContent(
  widgetId: string,
  dashboardId: string,
  content: string
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('Unauthorized');
    }

    console.log(`[Server Action] Saving text widget ${widgetId} content directly to database`);

    // First get the current config
    const currentWidget = await db
      .select({ config: widgets.config })
      .from(widgets)
      .where(
        and(
          eq(widgets.id, widgetId),
          eq(widgets.dashboardId, dashboardId)
        )
      )
      .limit(1);

    if (currentWidget.length === 0) {
      throw new Error('Widget not found');
    }

    // Update the config with the new content
    const newConfig = {
      ...currentWidget[0].config,
      content: content
    };

    // Update only the config field
    await db
      .update(widgets)
      .set({
        config: newConfig,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(widgets.id, widgetId),
          eq(widgets.dashboardId, dashboardId)
        )
      );

    console.log(`[Server Action] Text widget ${widgetId} content saved successfully`);
    return { success: true };
  } catch (error) {
    console.error(`[Server Action] Error saving text widget ${widgetId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}