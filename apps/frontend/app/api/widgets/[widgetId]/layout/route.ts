import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateWidgetLayout } from '@/app/lib/actions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { widgetId } = await params;
    const { layout, dashboardId } = body;

    if (!widgetId || !layout || !dashboardId) {
      return NextResponse.json(
        { error: 'Missing required fields: layout, dashboardId' }, 
        { status: 400 }
      );
    }

    // Update widget layout
    const result = await updateWidgetLayout(widgetId, dashboardId, layout, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating widget layout:', error);
    return NextResponse.json(
      { error: 'Failed to update widget layout' }, 
      { status: 500 }
    );
  }
}