import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateDashboard } from '@/app/lib/actions';

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