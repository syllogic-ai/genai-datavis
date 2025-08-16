"use server";

import db from '@/db';
import { chats, files } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { supabase } from './supabase';
import { chatEvents, CHAT_EVENTS } from './events';
import { v4 as uuidv4 } from 'uuid';
import { widgets } from '@/db/schema';

/**
 * Create a new chat session
 */
export async function createChat(
  userId: string,
  dashboardId: string,
  initialMessageContent: string
) {
  const chatId = uuidv4();
  const newChat = {
    id: chatId,
    userId,
    dashboardId,
    title: "New Widget Chat",
    conversation: [
      {
        role: 'user',
        message: initialMessageContent,
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const insertedChats = await db.insert(chats).values(newChat).returning();
    if (insertedChats.length === 0) {
      throw new Error('Failed to create new chat.');
    }
    return insertedChats[0];
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

/**
 * Create a new empty chat session
 */
export async function createEmptyChat(
  userId: string,
  dashboardId: string
) {
  const chatId = uuidv4();
  const newChat = {
    id: chatId,
    userId,
    dashboardId,
    title: "New Chat",
    conversation: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const insertedChats = await db.insert(chats).values(newChat).returning();
    if (insertedChats.length === 0) {
      throw new Error('Failed to create new chat.');
    }
    return insertedChats[0];
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

/**
 * Rename a chat
 */
export async function renameChat(chatId: string, userId: string, newTitle: string) {
  try {
    const result = await db.update(chats)
      .set({ 
        title: newTitle,
        updatedAt: new Date()
      })
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Failed to rename chat ${chatId}`);
    }

    // Emit event on the client side after the chat has been renamed
    // This is handled in the ChatItem component
    
    return result[0];
  } catch (error) {
    console.error('Error renaming chat:', error);
    throw error;
  }
}

/**
 * Update chat conversation with new message
 */
export async function updateChatConversation(
  chatId: string,
  userId: string,
  newMessage: {
    role: string;
    message: string;
    timestamp: string;
    contextWidgetIds?: string[];
    targetWidgetType?: 'chart' | 'table' | 'kpi';
    targetChartSubType?: 'line' | 'area' | 'bar' | 'horizontal-bar' | 'pie';
  }
) {
  try {
    // First get the current conversation
    const currentChat = await db.select()
      .from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .limit(1);

    if (!currentChat || currentChat.length === 0) {
      throw new Error(`Chat ${chatId} not found`);
    }

    const currentConversation = currentChat[0].conversation || [];
    const updatedConversation = [...currentConversation, newMessage];

    // Update the chat with the new conversation
    const result = await db.update(chats)
      .set({ 
        conversation: updatedConversation,
        updatedAt: new Date()
      })
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Failed to update chat ${chatId}`);
    }

    return result[0];
  } catch (error) {
    console.error('Error updating chat conversation:', error);
    throw error;
  }
}

/**
 * Delete a chat from a dashboard
 */
export async function deleteChat(chatId: string, userId: string) {
  try {
    // Delete the chat directly (dashboard-based chats don't need complex file cleanup)
    const result = await db.delete(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .returning();
      
    if (!result || result.length === 0) {
      throw new Error(`Failed to delete chat ${chatId}`);
    }
    
    return result[0];
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
} 