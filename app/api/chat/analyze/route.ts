import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { v4 as uuidv4 } from 'uuid';
import { getDashboardFiles } from '@/app/lib/actions';
import { addMessage } from '@/app/lib/chatActions';
import { Client } from '@langchain/langgraph-sdk';


export async function POST(request: NextRequest) {
  // Get the current user
  const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
  
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

  try {
    console.log('Chat analyze endpoint called with message:', message);

    // Get API URL from environment
    const API_URL = process.env.API_URL;
    
    if (!API_URL) {
      return NextResponse.json(
        { error: 'Backend API URL not configured' },
        { status: 500 }
      );
    }

    // Get assistant ID from environment variable
    const assistantId = process.env.LANGGRAPH_ASSISTANT_ID;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'LANGGRAPH_ASSISTANT_ID environment variable not configured' },
        { status: 500 }
      );
    }

    // Initialize LangGraph client
    const client = new Client({ 
      apiUrl: API_URL,
      apiKey: process.env.LANGSMITH_API_KEY 
    });

    // Generate request ID
    const request_id = "req_" + uuidv4();

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
      user_id: userId,
      chat_id: chatId,
      request_id: request_id
    };

    console.log('Sending request to LangGraph:', { assistantId, inputData });

    try {
      // Step 1: List available assistants to debug
      console.log('Listing available assistants...');
      const assistants = await client.assistants.search({
        metadata: null,
        offset: 0,
        limit: 10,
      });
      console.log('Available assistants:', assistants.map(a => ({ id: a.assistant_id, name: a.name || 'unnamed' })));

      // Check if the specified assistant exists
      const targetAssistant = assistants.find(a => a.assistant_id === assistantId);
      if (!targetAssistant) {
        console.error(`Assistant '${assistantId}' not found. Available assistants:`, assistants.map(a => a.assistant_id));
        
        // If no assistants exist, suggest using the first available one
        if (assistants.length > 0) {
          const firstAssistant = assistants[0];
          console.log(`Using first available assistant: ${firstAssistant.assistant_id}`);
          
          // Update the assistant ID to use the first available one
          const actualAssistantId = firstAssistant.assistant_id;
          
          // Step 2: Create thread using LangGraph SDK
          const thread = await client.threads.create();
          console.log('Thread created successfully:', thread);

          // Step 3: Create a background run using LangGraph SDK with the available assistant
          const backgroundRun = await client.runs.create(
            thread.thread_id,
            actualAssistantId,
            {
              input: inputData,
            }
          );

          console.log('Background run created:', backgroundRun);

          return NextResponse.json({
            success: true,
            thread_id: thread.thread_id,
            run_id: backgroundRun.run_id,
            assistant_id_used: actualAssistantId,
            assistant_id_requested: assistantId,
            status: backgroundRun.status,
            message: 'Background run initiated successfully'
          });
        } else {
          return NextResponse.json(
            { 
              error: 'No assistants available',
              details: 'No assistants found on the LangGraph server. Please check your server configuration and ensure assistants are deployed.',
              available_assistants: []
            },
            { status: 404 }
          );
        }
      }

      // Step 2: Create thread using LangGraph SDK
      const thread = await client.threads.create();
      console.log('Thread created successfully:', thread);

      // Step 3: Create a background run using LangGraph SDK
      const backgroundRun = await client.runs.create(
        thread.thread_id,
        assistantId,
        {
          input: inputData,
        }
      );

      console.log('Background run created:', backgroundRun);

      return NextResponse.json({
        success: true,
        thread_id: thread.thread_id,
        run_id: backgroundRun.run_id,
        status: backgroundRun.status,
        message: 'Background run initiated successfully'
      });

    } catch (sdkError) {
      console.error('LangGraph SDK error:', sdkError);
      
      // Enhanced error logging
      if (sdkError instanceof Error) {
        console.error('Error name:', sdkError.name);
        console.error('Error message:', sdkError.message);
        console.error('Error stack:', sdkError.stack);
      }
      
      // Add system message about backend unavailability
      if (chatId) {
        try {
          console.log('🔄 Adding system error message to chat:', chatId);
          await addMessage(chatId, userId, {
            role: 'system',
            content: 'Something went wrong with the analysis service, please try again later.',
            messageType: 'chat'
          });
          console.log('✅ System error message added successfully');
        } catch (msgError) {
          console.error('❌ Failed to add system message:', msgError);
        }
      }
      
      return NextResponse.json(
        { 
          error: 'LangGraph SDK error',
          details: sdkError instanceof Error ? sdkError.message : 'Unknown SDK error',
          assistant_id: assistantId,
          api_url: API_URL
        },
        { status: 500 }
      );
    }

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
      // Add system message about backend unavailability instead of throwing error
      if (chatId) {
        try {
          console.log('🔄 Adding system error message to chat:', chatId);
          await addMessage(chatId, userId, {
            role: 'system',
            content: 'Something went wrong, please try again later.',
            messageType: 'chat'
          });
          console.log('✅ System error message added successfully');
        } catch (msgError) {
          console.error('❌ Failed to add system message:', msgError);
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Backend service unavailable',
          details: `Cannot connect to backend API at ${process.env.API_URL}. Please ensure the backend server is running.`,
          backend_url: process.env.API_URL
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