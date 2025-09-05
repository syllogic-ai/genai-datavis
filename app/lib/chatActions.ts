"use server";

import db from '@/db';
import { chats, messages, tasks, files } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { supabase } from './supabase';
import { chatEvents, CHAT_EVENTS } from './events';
import { v4 as uuidv4 } from 'uuid';
import { widgets } from '@/db/schema';

/**
 * Create a new chat session with initial message
 */
export async function createChat(
  userId: string,
  dashboardId: string,
  initialMessageContent: string
) {
  const chatId = uuidv4();
  const messageId = uuidv4();
  const newChat = {
    id: chatId,
    userId,
    dashboardId,
    title: "New Widget Chat",
    lastMessageAt: new Date(),
    messageCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const initialMessage = {
    id: messageId,
    chatId,
    role: 'user',
    content: initialMessageContent,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const insertedChats = await db.insert(chats).values(newChat).returning();
    if (insertedChats.length === 0) {
      throw new Error('Failed to create new chat.');
    }
    
    await db.insert(messages).values(initialMessage);
    
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
    messageCount: 0,
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
 * Add a new message to a chat
 */
export async function addMessage(
  chatId: string,
  userId: string,
  messageData: {
    role: string;
    content: string;
    messageType?: string;
    taskGroupId?: string;
  }
) {
  const messageId = uuidv4();
  const timestamp = new Date();
  
  const newMessage = {
    id: messageId,
    chatId,
    role: messageData.role,
    content: messageData.content,
    messageType: messageData.messageType,
    taskGroupId: messageData.taskGroupId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    // First verify the chat belongs to the user
    const chatExists = await db.select()
      .from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .limit(1);

    if (!chatExists || chatExists.length === 0) {
      throw new Error(`Chat ${chatId} not found`);
    }

    // Insert the message
    const insertedMessage = await db.insert(messages).values(newMessage).returning();
    
    // Update chat metadata (increment message count)
    const currentChat = chatExists[0];
    await db.update(chats)
      .set({ 
        lastMessageAt: timestamp,
        messageCount: (currentChat.messageCount || 0) + 1,
        updatedAt: timestamp
      })
      .where(eq(chats.id, chatId));

    return insertedMessage[0];
  } catch (error) {
    console.error('Error adding message:', error);
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

/**
 * Get all messages for a chat
 */
export async function getChatMessages(chatId: string, userId: string) {
  try {
    // First verify the chat belongs to the user
    const chatExists = await db.select()
      .from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .limit(1);

    if (!chatExists || chatExists.length === 0) {
      throw new Error(`Chat ${chatId} not found`);
    }

    const chatMessages = await db.select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    return chatMessages;
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
}

/**
 * Create a new task using Supabase for real-time updates
 */
export async function createTask(
  chatId: string,
  dashboardId: string,
  taskData: {
    taskGroupId: string;
    title: string;
    description?: string;
    order: number;
    status?: string;
  }
) {
  const taskId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const newTask = {
    id: taskId,
    chat_id: chatId,
    dashboard_id: dashboardId,
    task_group_id: taskData.taskGroupId,
    title: taskData.title,
    description: taskData.description,
    status: taskData.status || 'pending',
    order: taskData.order,
    created_at: timestamp,
    updated_at: timestamp,
  };

  try {
    // Use Supabase client for inserts to trigger real-time events
    const { data: result, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase task creation error:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Update task status using Supabase for real-time updates
 */
export async function updateTaskStatus(
  taskId: string,
  status: string,
  startedAt?: Date,
  completedAt?: Date
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (startedAt) updateData.started_at = startedAt.toISOString();
  if (completedAt) updateData.completed_at = completedAt.toISOString();

  try {
    // Use Supabase client for updates to trigger real-time events
    const { data: result, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase task update error:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

/**
 * Get tasks for a chat grouped by taskGroupId
 */
export async function getChatTasks(chatId: string) {
  try {
    const chatTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.chatId, chatId))
      .orderBy(tasks.taskGroupId, tasks.order);

    return chatTasks;
  } catch (error) {
    console.error('Error getting chat tasks:', error);
    throw error;
  }
}

/**
 * Get tasks for a specific task group (linked to a message)
 */
export async function getTasksByGroupId(taskGroupId: string) {
  try {
    const groupTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.taskGroupId, taskGroupId))
      .orderBy(tasks.order);

    return groupTasks;
  } catch (error) {
    console.error('Error getting tasks by group ID:', error);
    throw error;
  }
}