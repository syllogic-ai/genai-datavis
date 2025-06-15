import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateWidget, deleteWidget } from '@/app/lib/actions';

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

    if (!widgetId) {
      return NextResponse.json(
        { error: 'Missing widgetId' }, 
        { status: 400 }
      );
    }

    // Update widget
    const result = await updateWidget(widgetId, userId, body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json(
      { error: 'Failed to update widget' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgetId } = await params;

    if (!widgetId) {
      return NextResponse.json(
        { error: 'Missing widgetId' }, 
        { status: 400 }
      );
    }

    // Delete widget
    const result = await deleteWidget(widgetId, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json(
      { error: 'Failed to delete widget' }, 
      { status: 500 }
    );
  }
}