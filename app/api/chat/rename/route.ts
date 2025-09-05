import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { renameChat } from '@/app/lib/chatActions';
import { OpenAI } from 'openai';

// Initialize OpenAI client only when needed
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

export async function POST(request: NextRequest) {
  try {
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
    const { chatId, firstMessage } = body;
    
    if (!chatId || !firstMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId and firstMessage are required' },
        { status: 400 }
      );
    }

    // Generate a title based on the first message
    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates concise, descriptive titles for chat conversations. Based on the user's first message, create a short title (2-6 words) that captures the main intent. Focus on the key subject or action they want to accomplish."
          },
          {
            role: "user",
            content: `Generate a short title for a chat that starts with this message: "${firstMessage}"`
          }
        ],
        max_tokens: 20,
        temperature: 0.7,
      });

      const generatedTitle = completion.choices[0]?.message?.content?.trim() || 'New Chat';
      
      // Update the chat title
      const updatedChat = await renameChat(chatId, userId, generatedTitle);
      
      return NextResponse.json({
        success: true,
        title: generatedTitle,
        chat: updatedChat
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // Fallback to a simple title based on the message
      const fallbackTitle = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
      const updatedChat = await renameChat(chatId, userId, fallbackTitle);
      
      return NextResponse.json({
        success: true,
        title: fallbackTitle,
        chat: updatedChat
      });
    }

  } catch (error) {
    console.error('Error in chat rename endpoint:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}