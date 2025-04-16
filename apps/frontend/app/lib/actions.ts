"use server";

import db from '@/db';
import { files, chats } from '../../db/schema'; // Import Drizzle schemas
import { eq } from 'drizzle-orm'; // Import eq operator
import { v4 as uuidv4 } from 'uuid'; // Assuming you might need UUIDs
import { supabase, supabaseAdmin } from './supabase';
import { ChatMessage, normalizeMessages } from './types';

// Create a new file in the database using Drizzle
export async function createFile(fileId: string, fileType: string, originalFilename: string, storagePath: string, userId: string) {
  try {
    const result = await db.insert(files).values({
      id: fileId,
      userId: userId,
      fileType: fileType,
      originalFilename: originalFilename,
      storagePath: storagePath,
      status: 'pending', // Assuming 'pending' is the desired initial status based on original code
    }).returning(); // Optional: return the inserted record

    // Check if the insert was successful (Drizzle returns an array)
    if (!result || result.length === 0) {
      throw new Error("Failed to create file record in database.");
    }
    
    return result[0]; // Return the first (and likely only) inserted record
  } catch (error) {
    console.error('Error creating file record:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Update the file status in the database using Drizzle
export async function updateFileStatus(fileId: string, status: string) {
 try {
    const result = await db.update(files).set({
      status: status,
    }).where(eq(files.id, fileId))
    .returning(); // Optional: return the updated record(s)

    // Check if the update affected any rows
     if (!result || result.length === 0) {
      console.warn(`File with ID ${fileId} not found for status update.`);
      // Depending on requirements, you might throw an error here or return null/undefined
      return null; 
    }

    return result[0]; // Return the first updated record
  } catch (error) {
    console.error('Error updating file status:', error);
    throw error; // Re-throw the error
  }
}

// Create a new chat in the database using Drizzle
export async function createChat(chatId: string, userId: string, fileId: string) {
  try {
    const result = await db.insert(chats).values({
      id: chatId,
      userId: userId,
      fileId: fileId,
      conversation: [], // Initialize with an empty conversation array
      // usage field is omitted, assuming it's nullable or has a default in the DB/schema
    }).returning(); // Optional: return the inserted record

    if (!result || result.length === 0) {
      throw new Error("Failed to create chat record in database.");
    }

    return result[0]; // Return the inserted chat record
  } catch (error) {
    console.error('Error creating chat record:', error);
    throw error; // Re-throw the error
  }
} 


export async function getChats(userId: string) {
  const result = await db.select().from(chats).where(eq(chats.userId, userId));
  return result;
}

/**
 * Update the conversation in a chat
 */
export async function updateChatConversation(
  chatId: string,
  conversation: ChatMessage[] | any[],
  userId: string
) {
  // We'll store messages in their original format in the database
  // But ensure they have consistent properties
  const processedConversation = conversation.map(msg => {
    // Process any format of message to ensure it has proper structure
    // Keep both 'content' and 'message' fields depending on what was originally there
    const processedMsg: any = {
      role: msg.role
    };
    
    if ('content' in msg) {
      processedMsg.content = msg.content;
    }
    
    if ('message' in msg) {
      processedMsg.message = msg.message;
    }
    
    // Ensure at least one of content or message exists
    if (!('content' in processedMsg) && !('message' in processedMsg)) {
      processedMsg.content = "Unknown message content";
    }
    
    return processedMsg;
  });

  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('chats')
    .update({ conversation: processedConversation })
    .eq('id', chatId)
    .eq('user_id', userId) // Keep the user_id check for security
    .select();

  if (error) throw error;
  return data;
}

/**
 * Get a chat by ID
 */
export async function getChat(chatId: string, userId: string) {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('chats')
    .select('*, files(*)')
    .eq('id', chatId)
    .eq('user_id', userId) // Keep the user_id check for security
    .single();

  if (error) throw error;
  return data;
}