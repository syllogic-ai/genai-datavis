"use server";

import db from '@/db';
import { chats, files } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { supabase } from './supabase';
import { chatEvents, CHAT_EVENTS } from './events';

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
 * Delete a chat and associated files
 */
export async function deleteChat(chatId: string, userId: string) {
  try {
    // 1. Get the chat to see if there are associated files
    const chatResult = await db.select().from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ));
    
    if (!chatResult || chatResult.length === 0) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }

    const chatData = chatResult[0];
    const fileId = chatData.fileId;
    
    // 2. Delete the chat itself first (this removes the reference to the file)
    const result = await db.delete(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .returning();
      
    if (!result || result.length === 0) {
      throw new Error(`Failed to delete chat ${chatId}`);
    }
    
    // 3. If there's a fileId, delete the file after the chat is deleted
    if (fileId) {
      const fileResult = await db.select().from(files)
        .where(eq(files.id, fileId));
      
      if (fileResult && fileResult.length > 0) {
        const fileData = fileResult[0];
        
        // Delete file from Supabase storage
        if (fileData.storagePath) {
          // Extract bucket and file path from the storage path
          // Assuming format is bucket/path/to/file
          const [bucket, ...pathParts] = fileData.storagePath.split('/');
          const path = pathParts.join('/');
          
          if (bucket && path) {
            const { error } = await supabase.storage
              .from(bucket)
              .remove([path]);
              
            if (error) {
              console.error('Error deleting file from storage:', error);
            }
          }
        }
        
        // Delete file from database
        await db.delete(files)
          .where(eq(files.id, fileId));
      }
    }
    
    return result[0];
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
} 