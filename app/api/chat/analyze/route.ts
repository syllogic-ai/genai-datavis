import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from 'uuid';
import { getDashboardFiles } from '@/app/lib/actions';

// Helper function to generate thread UUID
function thread_uuid(): string {
  return uuidv4();
}

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
    const { message, dashboardId, contextWidgetIds, chatId } = body;
    
    if (!message || !dashboardId) {
      return NextResponse.json(
        { error: 'Missing required fields: message and dashboardId are required' },
        { status: 400 }
      );
    }

    // Get API URL from environment
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
    
    if (!API_URL) {
      return NextResponse.json(
        { error: 'Backend API URL not configured' },
        { status: 500 }
      );
    }

    // Generate thread UUID
    const thread_id = thread_uuid();

    // Fetch file_ids using dashboardId
    let file_ids: string[] = [];
    try {
      const dashboardFiles = await getDashboardFiles(dashboardId, userId);
      if (dashboardFiles && Array.isArray(dashboardFiles)) {
        file_ids = dashboardFiles.map(file => file.id);
      }
    } catch (error) {
      console.warn('Could not fetch dashboard files:', error);
      // Continue with empty file_ids array
    }

    // Prepare context_widget_ids
    const context_widget_ids = contextWidgetIds && Array.isArray(contextWidgetIds) ? contextWidgetIds : [];

    // Prepare input data for the assistant
    const inputData = {
      user_prompt: message,
      dashboard_id: dashboardId,
      file_ids,
      context_widget_ids,
      thread_id,
      user_id: userId,
      chat_id: chatId
    };

    // Get assistant ID from environment variable
    const assistantId = process.env.LANGGRAPH_ASSISTANT_ID;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'LANGGRAPH_ASSISTANT_ID environment variable not configured' },
        { status: 500 }
      );
    }

    // Prepare LangGraph API request body
    const langGraphRequest = {
      assistant_id: assistantId,
      input: inputData
    };

    console.log('Sending request to backend:', langGraphRequest);
    console.log('Backend API URL:', `${API_URL}/threads/${thread_id}/runs`);

    // Prepare headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add LANGSMITH_API_KEY if available
    const langsmithApiKey = process.env.LANGSMITH_API_KEY;
    if (langsmithApiKey) {
      headers['Authorization'] = `Bearer ${langsmithApiKey}`;
      headers['X-API-Key'] = langsmithApiKey;
    }

    console.log('Request headers:', { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : undefined, 'X-API-Key': headers['X-API-Key'] ? '[REDACTED]' : undefined });

    // Step 1: Create thread first
    const threadCreateRequest = {
      thread_id: thread_id
    };

    console.log('Creating thread:', threadCreateRequest);
    console.log('Thread creation URL:', `${API_URL}/threads`);

    const threadResponse = await fetch(`${API_URL}/threads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(threadCreateRequest),
    });

    if (!threadResponse.ok) {
      const threadErrorText = await threadResponse.text();
      console.error('Thread creation error response:', {
        status: threadResponse.status,
        statusText: threadResponse.statusText,
        body: threadErrorText
      });
      
      return NextResponse.json(
        { 
          error: `Failed to create thread: ${threadResponse.status} ${threadResponse.statusText}`,
          details: threadErrorText
        },
        { status: threadResponse.status }
      );
    }

    const threadResult = await threadResponse.json();
    console.log('Thread created successfully:', threadResult);

    // Step 2: Send request to backend (using the correct LangGraph endpoint)
    const backendResponse = await fetch(`${API_URL}/threads/${thread_id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(langGraphRequest),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        body: errorText
      });
      
      return NextResponse.json(
        { 
          error: `Backend error: ${backendResponse.status} ${backendResponse.statusText}`,
          details: errorText
        },
        { status: backendResponse.status }
      );
    }

    const backendResult = await backendResponse.json();
    console.log('Backend response:', backendResult);

    return NextResponse.json({
      success: true,
      thread_id,
      result: backendResult
    });

  } catch (error) {
    console.error('Error in chat analyze endpoint:', error);
    
    // Check if it's a connection error
    const isConnectionError = error instanceof Error && 
      (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed') ||
        (
          error.cause &&
          typeof error.cause === 'object' &&
          error.cause !== null &&
          'code' in error.cause &&
          (error.cause as { code?: string }).code === 'ECONNREFUSED'
        )
      );
    
    if (isConnectionError) {
      return NextResponse.json(
        { 
          error: 'Backend service unavailable',
          details: `Cannot connect to backend API at ${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL}. Please ensure the backend server is running.`,
          backend_url: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}