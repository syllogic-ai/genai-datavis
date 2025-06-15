import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createDashboard, getDashboards } from '@/app/lib/actions';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' }, 
        { status: 400 }
      );
    }

    const dashboardId = nanoid();

    // Create dashboard with correct parameter order
    const result = await createDashboard(
      dashboardId,
      userId,
      name,
      description,
      null, // metadata - not used for now
      icon
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' }, 
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

    const dashboards = await getDashboards(userId);

    return NextResponse.json(dashboards);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' }, 
      { status: 500 }
    );
  }
}