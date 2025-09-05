import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { addMessage } from '@/app/lib/chatActions';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, content, messageType = 'chat', taskGroupId } = body;

    if (!chatId || !content) {
      return NextResponse.json(
        { error: 'Chat ID and content are required' }, 
        { status: 400 }
      );
    }

    const message = await addMessage(chatId, userId, {
      role: 'user',
      content,
      messageType,
      taskGroupId,
    });

    return NextResponse.json({ 
      success: true, 
      message 
    });

  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}