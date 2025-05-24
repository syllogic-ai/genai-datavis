"use server";

import db from '@/db';
import { files, chats, charts } from '../../db/schema'; // Import Drizzle schemas
import { eq, and, desc } from 'drizzle-orm'; // Import eq, and, and desc operators
import { v4 as uuidv4 } from 'uuid'; // Assuming you might need UUIDs
import { supabase } from './supabase';
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
      updatedAt: new Date(), // Set updatedAt to current time
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
  const result = await db.select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
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

  try {
    const result = await db.update(chats)
      .set({ 
        conversation: processedConversation,
        updatedAt: new Date() // Update the timestamp
      })
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Failed to update conversation for chat ${chatId}`);
    }

    return result;
  } catch (error) {
    console.error('Error updating chat conversation:', error);
    throw error;
  }
}

/**
 * Get a chat by ID
 */
export async function getChat(chatId: string, userId: string) {
  try {
    // Get the chat using Drizzle
    const chatResult = await db.select().from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ));
    
    if (!chatResult || chatResult.length === 0) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }

    const chatData = chatResult[0];

    // If there's a fileId, get the file details using Drizzle
    if (chatData.fileId) {
      const fileResult = await db.select().from(files)
        .where(eq(files.id, chatData.fileId));
      
      if (fileResult && fileResult.length > 0) {
        const fileData = fileResult[0];
        
        // Look for the original file to get the original filename
        let originalFilename = fileData.originalFilename;
        if (fileData.fileType !== "original") {
          // If this isn't the original file, look for an original file with the same ID prefix
          const originalFileResult = await db.select().from(files)
            .where(and(
              eq(files.userId, userId),
              eq(files.fileType, "original")
            ));
            
          // If original file found, use its filename
          if (originalFileResult && originalFileResult.length > 0) {
            originalFilename = originalFileResult[0].originalFilename;
          }
        }
        
        // Return a combined object with chat data and file details
        return { 
          ...chatData, 
          files: {
            ...fileData,
            // Ensure the storage_path is available for the frontend
            storage_path: fileData.storagePath,
            originalFilename
          }
        };
      }
    }

    // Return just the chat data if no file is found
    return chatData;
  } catch (error) {
    console.error('Error fetching chat:', error);
    throw error;
  }
}

/**
 * Append a single message to the conversation in a chat
 */
export async function appendChatMessage(
  chatId: string,
  message: ChatMessage | any,
  userId: string
) {
  // Process the message to ensure it has proper structure
  const processedMsg: any = {
    role: message.role,
    timestamp: new Date().toISOString(), // Add timestamp
  };
  
  if ('content' in message) {
    processedMsg.content = message.content;
  }
  
  if ('message' in message) {
    processedMsg.message = message.message;
  }
  
  // Ensure at least one of content or message exists
  if (!('content' in processedMsg) && !('message' in processedMsg)) {
    processedMsg.content = "Unknown message content";
  }

  try {
    // First get the current conversation
    const chatResult = await db.select({ conversation: chats.conversation })
      .from(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ));
    
    if (!chatResult || chatResult.length === 0) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }

    // Append the new message to the existing conversation
    const currentConversation = chatResult[0].conversation || [];
    const updatedConversation = [...currentConversation, processedMsg];
    
    // Update the chat with the new conversation
    const result = await db.update(chats)
      .set({ 
        conversation: updatedConversation,
        updatedAt: new Date() // Update the timestamp
      })
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Failed to append message to chat ${chatId}`);
    }

    return result;
  } catch (error) {
    console.error('Error appending chat message:', error);
    throw error;
  }
}

/**
 * Get a chart specification by ID
 */
export async function getChartById(chartId: string) {
  try {
    const chartResult = await db.select().from(charts)
      .where(eq(charts.id, chartId));
    
    if (!chartResult || chartResult.length === 0) {
      throw new Error(`Chart with ID ${chartId} not found`);
    }

    return chartResult[0].chartSpecs;
  } catch (error) {
    console.error('Error fetching chart:', error);
    throw error;
  }
}