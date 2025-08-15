import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from 'uuid';
import { updateChatConversation } from '@/app/lib/chatActions';
import db from '@/db';
import { chats, jobs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Client } from '@upstash/qstash';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const QSTASH_DESTINATION_URL = process.env.QSTASH_URL || BACKEND_URL;

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
    let conversationHistory: any[] = [];
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
      chat_id: chatId,
      request_id: requestId,
      user_id: userId, // Include the Clerk user ID for job ownership
      conversation_history: [...conversationHistory, newUserMessage], // Include full conversation
    };

    console.log('Publishing to QStash:', {
      url: `${QSTASH_DESTINATION_URL}/analyze`,
      payload: backendPayload
    });

    const qstashToken = process.env.QSTASH_TOKEN;
    if (!qstashToken) {
      return NextResponse.json(
        { error: 'QStash token not configured' },
        { status: 500 }
      );
    }

    // Create job record immediately before publishing to QStash
    try {
      await db.insert(jobs).values({
        id: requestId,
        userId: userId,
        dashboardId: dashboardId,
        status: 'pending',
        progress: 0,
      });
      console.log(`Created job record ${requestId} for user ${userId}`);
    } catch (error) {
      console.error('Error creating job record:', error);
      return NextResponse.json(
        { error: 'Failed to create job record' },
        { status: 500 }
      );
    }

    const qstashClient = new Client({ token: qstashToken });

    const publishResult = await qstashClient.publishJSON({
      url: `${process.env.NEXT_PUBLIC_API_URL}/analyze`,
      body: backendPayload,
    });

    console.log('QStash publish result:', publishResult);

    // Return the successful response
    return NextResponse.json({
      success: true,
      message: 'Analysis request enqueued successfully',
      requestId,
      chatId,
      taskId: requestId, // Use requestId as taskId since backend uses request_id as job_id
      qstashMessageId: publishResult.messageId,
      queueName: 'qstash'
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