import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDashboardWidgets } from '@/app/lib/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await params;

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Missing dashboardId' }, 
        { status: 400 }
      );
    }

    const widgets = await getDashboardWidgets(dashboardId, userId);

    return NextResponse.json(widgets);
  } catch (error) {
    console.error('Error fetching dashboard widgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard widgets' }, 
      { status: 500 }
    );
  }
}