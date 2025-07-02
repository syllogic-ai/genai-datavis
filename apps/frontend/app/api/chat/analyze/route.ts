import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from 'uuid';
import { updateChatConversation } from '@/app/lib/chatActions';
import db from '@/db';
import { chats } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

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

    // Get current chat conversation history
    let conversationHistory = [];
    try {
      const currentChat = await db.select()
        .from(chats)
        .where(and(
          eq(chats.id, chatId),
          eq(chats.userId, userId)
        ))
        .limit(1);

      if (currentChat && currentChat.length > 0) {
        conversationHistory = currentChat[0].conversation || [];
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      // Continue without history if fetch fails
    }

    // Add the new user message to conversation history
    const newUserMessage = {
      role: 'user',
      message,
      timestamp: new Date().toISOString(),
      contextWidgetIds,
      targetWidgetType,
      targetChartSubType,
    };

    // Update chat conversation with the new user message
    try {
      await updateChatConversation(chatId, userId, newUserMessage);
    } catch (error) {
      console.error('Error updating chat conversation:', error);
      // Continue even if conversation update fails
    }

    // Generate unique request ID for tracking
    const requestId = uuidv4();

    // Prepare the payload for the backend
    const backendPayload = {
      message,
      dashboardId,
      contextWidgetIds: contextWidgetIds || undefined,
      targetWidgetType: targetWidgetType || undefined,
      targetChartSubType: targetChartSubType || undefined,
      chat_id: chatId,
      request_id: requestId,
      conversation_history: [...conversationHistory, newUserMessage] // Include full conversation
    };

    console.log('Sending to backend:', {
      url: `${BACKEND_URL}/chat/analyze`,
      payload: backendPayload
    });

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/chat/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendPayload)
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.text();
      console.error('Backend error:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        error: errorData
      });
      
      return NextResponse.json(
        { 
          error: 'Backend service error',
          details: errorData,
          status: backendResponse.status
        },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();

    console.log('Backend response:', result);

    // If this is the first message in the chat (only contains the user message we just added), trigger auto-rename
    if (conversationHistory.length === 0) {
      try {
        // Don't await this - let it run in background
        fetch('/api/chat/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chatId, 
            firstMessage: message 
          }),
        }).catch(error => {
          console.error('Error auto-renaming chat:', error);
        });
      } catch (error) {
        console.error('Error initiating chat rename:', error);
      }
    }

    // Return the successful response
    return NextResponse.json({
      success: true,
      message: result.message || 'Analysis request enqueued successfully',
      requestId,
      chatId,
      taskId: result.task_id,
      queueName: result.queue_name
    });

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