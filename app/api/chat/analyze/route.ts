import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    const { message, dashboardId, contextWidgetIds, targetWidgetType, targetChartSubType, chatId } = body;
    
    if (!message || !dashboardId) {
      return NextResponse.json(
        { error: 'Missing required fields: message and dashboardId are required' },
        { status: 400 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { error: 'Missing required field: chatId' },
        { status: 400 }
      );
    }

    // Return error since backend is no longer available
    return NextResponse.json(
      { error: 'Backend service is not available. This feature requires a separate backend service.' },
      { status: 503 }
    );

  } catch (error) {
    console.error('Error in chat analyze endpoint:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}