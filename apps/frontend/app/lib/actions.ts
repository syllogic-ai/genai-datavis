"use server";

import db from '@/db';
import { files, chats, dashboards, widgets } from '../../db/schema'; // Import Drizzle schemas
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
 * Get all dashboards for a user
 */
export async function getDashboards(userId: string) {
  try {
    const result = await db.select()
      .from(dashboards)
      .where(eq(dashboards.userId, userId))
      .orderBy(desc(dashboards.updatedAt));
    
    return result;
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    throw error;
  }
}

/**
 * Create a new dashboard
 */
export async function createDashboard(
  dashboardId: string,
  userId: string,
  name: string,
  description?: string | null,
  metadata?: any,
  icon?: string
) {
  try {
    const result = await db.insert(dashboards).values({
      id: dashboardId,
      userId: userId,
      name: name,
      description: description || null,
      icon: icon || "DocumentTextIcon",
      fileId: null, // For now, dashboards don't have a default file
      updatedAt: new Date(),
    }).returning();

    if (!result || result.length === 0) {
      throw new Error("Failed to create dashboard record in database.");
    }

    return result[0];
  } catch (error) {
    console.error('Error creating dashboard:', error);
    throw error;
  }
}

/**
 * Update an existing dashboard
 */
export async function updateDashboard(
  dashboardId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    icon?: string;
  }
) {
  try {
    const result = await db.update(dashboards)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(dashboards.id, dashboardId),
        eq(dashboards.userId, userId)
      ))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Dashboard with ID ${dashboardId} not found or doesn't belong to user`);
    }

    return result[0];
  } catch (error) {
    console.error('Error updating dashboard:', error);
    throw error;
  }
}

/**
 * Get widgets for a specific dashboard (limited fields for navigation)
 */
export async function getDashboardWidgets(dashboardId: string, userId: string) {
  try {
    // First verify the dashboard belongs to the user
    const dashboardResult = await db.select({ id: dashboards.id })
      .from(dashboards)
      .where(and(
        eq(dashboards.id, dashboardId),
        eq(dashboards.userId, userId)
      ));

    if (!dashboardResult || dashboardResult.length === 0) {
      throw new Error(`Dashboard with ID ${dashboardId} not found or doesn't belong to user`);
    }

    // Get widgets with only the fields needed for navigation
    const result = await db.select({
      id: widgets.id,
      title: widgets.title,
      type: widgets.type,
    })
      .from(widgets)
      .where(eq(widgets.dashboardId, dashboardId))
      .orderBy(desc(widgets.createdAt));

    // Transform the result to match expected format
    return result.map(widget => ({
      id: widget.id,
      title: widget.title,
      type: widget.type || 'chart', // Default to 'chart' if no type specified
    }));
  } catch (error) {
    console.error('Error fetching dashboard widgets:', error);
    throw error;
  }
}

/**
 * Create a widget in a dashboard
 */
export async function createWidgetInDashboard(
  widget: any,
  dashboardId: string,
  layout: any,
  sizeClass: string,
  userId: string
) {
  try {
    // First verify the dashboard belongs to the user
    const dashboardResult = await db.select({ id: dashboards.id })
      .from(dashboards)
      .where(and(
        eq(dashboards.id, dashboardId),
        eq(dashboards.userId, userId)
      ));

    if (!dashboardResult || dashboardResult.length === 0) {
      throw new Error(`Dashboard with ID ${dashboardId} not found or doesn't belong to user`);
    }

    const widgetId = uuidv4();
    
    const result = await db.insert(widgets).values({
      id: widgetId,
      dashboardId: dashboardId,
      title: widget.name || widget.title || 'Untitled Widget',
      type: widget.type || widget.chartType || 'chart',
      config: widget.chartSpecs || {},
      data: widget.data || null,
      sql: widget.sql || null,
      layout: {
        i: widgetId,
        x: layout?.x || 0,
        y: layout?.y || 0,
        w: layout?.w || 2,
        h: layout?.h || 2,
      },
    }).returning();

    if (!result || result.length === 0) {
      throw new Error("Failed to create widget record in database.");
    }

    return { widget: result[0] };
  } catch (error) {
    console.error('Error creating widget in dashboard:', error);
    throw error;
  }
}

/**
 * Update widget layout
 */
export async function updateWidgetLayout(
  widgetId: string,
  dashboardId: string,
  layout: any,
  userId: string
) {
  try {
    // First verify the dashboard belongs to the user
    const dashboardResult = await db.select({ id: dashboards.id })
      .from(dashboards)
      .where(and(
        eq(dashboards.id, dashboardId),
        eq(dashboards.userId, userId)
      ));

    if (!dashboardResult || dashboardResult.length === 0) {
      throw new Error(`Dashboard with ID ${dashboardId} not found or doesn't belong to user`);
    }

    // Update the widget layout
    const result = await db.update(widgets)
      .set({
        layout: {
          i: widgetId,
          x: layout.x || 0,
          y: layout.y || 0,
          w: layout.w || 2,
          h: layout.h || 2,
        },
      })
      .where(and(
        eq(widgets.id, widgetId),
        eq(widgets.dashboardId, dashboardId)
      ))
      .returning();

    if (!result || result.length === 0) {
      throw new Error(`Widget with ID ${widgetId} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Error updating widget layout:', error);
    throw error;
  }
}
