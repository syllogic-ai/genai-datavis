import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWidgetInDashboard, getDashboardWidgets } from '@/app/lib/actions';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { widget, dashboardId, layout, sizeClass } = body;

    if (!widget || !dashboardId || !layout || !sizeClass) {
      return NextResponse.json(
        { error: 'Missing required fields: widget, dashboardId, layout, sizeClass' }, 
        { status: 400 }
      );
    }

    // Create widget in dashboard
    const result = await createWidgetInDashboard(
      widget,
      dashboardId,
      layout,
      sizeClass,
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating widget:', error);
    return NextResponse.json(
      { error: 'Failed to create widget' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('dashboardId');

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Missing dashboardId parameter' }, 
        { status: 400 }
      );
    }

    const widgets = await getDashboardWidgets(dashboardId, userId);

    return NextResponse.json(widgets);
  } catch (error) {
    console.error('Error fetching widgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widgets' }, 
      { status: 500 }
    );
  }
}