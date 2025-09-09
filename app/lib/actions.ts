"use server";

import { withRLS } from '@/lib/db-with-rls';
import { files, chats, messages, tasks, dashboards, widgets } from '../../db/schema'; // Import Drizzle schemas
import { eq, and, desc, isNull } from 'drizzle-orm'; // Import eq, and, desc, and isNull operators
import { v4 as uuidv4 } from 'uuid'; // Assuming you might need UUIDs
import { createClient } from '@supabase/supabase-js';
import PostHogClient from '@/lib/posthog';
const posthog = PostHogClient();

// Create server-side supabase client 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[actions.ts] Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { ChatMessage, normalizeMessages } from './types';
import { generateSanitizedFilename } from './utils';

// Utility function to migrate existing files to use sanitized filenames
export async function migrateExistingFiles(userId?: string) {
  try {
    return await withRLS(async (db) => {
      // Get all files that don't have sanitized filenames
      const filesToMigrate = userId 
        ? await db.select().from(files).where(and(isNull(files.sanitizedFilename), eq(files.userId, userId)))
        : await db.select().from(files).where(isNull(files.sanitizedFilename));

      console.log(`Found ${filesToMigrate.length} files to migrate`);

      for (const file of filesToMigrate) {
        if (file.originalFilename) {
          const sanitizedFilename = generateSanitizedFilename(file.originalFilename);
          
          // Update the database record
          await db.update(files)
            .set({ sanitizedFilename: sanitizedFilename })
            .where(eq(files.id, file.id));
          
          console.log(`Migrated file ${file.id}: ${file.originalFilename} -> ${sanitizedFilename}`);
        }
      }

      console.log('Migration completed successfully');
      return filesToMigrate.length;
    });
  } catch (error) {
    console.error('Error migrating existing files:', error);
    throw error;
  }
}

// Create a new file in the database using Drizzle
export async function createFile(fileId: string, fileType: string, originalFilename: string, sanitizedFilename: string | null, storagePath: string, userId: string, mimeType?: string, size?: number) {
  try {
    const result = await withRLS(async (db) => {
      return db.insert(files).values({
        id: fileId,
        userId: userId,
        fileType: fileType,
        originalFilename: originalFilename,
        sanitizedFilename: sanitizedFilename,
        storagePath: storagePath,
        mimeType: mimeType || null,
        size: size || null,
        status: 'pending',
      }).returning();
    });

    if (!result || result.length === 0) {
      throw new Error("Failed to create file record in database.");
    }
    
    // Track file creation in PostHog
    posthog.capture({
      distinctId: userId,
      event: 'file_created',
      properties: {
        fileId,
        fileType,
        originalFilename,
        mimeType,
        size
      }
    });
    
    return result[0];
  } catch (error) {
    console.error('Error creating file record:', error);
    throw error;
  }
}

// Update the file status in the database using Drizzle
export async function updateFileStatus(fileId: string, status: string) {
 try {
    return await withRLS(async (db) => {
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
    });
  } catch (error) {
    console.error('Error updating file status:', error);
    throw error; // Re-throw the error
  }
}

// Create a new chat in the database using Drizzle
export async function createChat(chatId: string, userId: string, dashboardId: string, initialMessageContent?: string) {
  try {
    const chatResult = await withRLS(async (db) => {
      const result = await db.insert(chats).values({
        id: chatId,
        userId: userId,
        dashboardId: dashboardId,
        messageCount: initialMessageContent ? 1 : 0,
        lastMessageAt: initialMessageContent ? new Date() : null,
        updatedAt: new Date(),
      }).returning();

      // Create initial message if provided
      if (initialMessageContent) {
        const messageId = uuidv4();
        await db.insert(messages).values({
          id: messageId,
          chatId: chatId,
          role: 'user',
          content: initialMessageContent,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      return result;
    });

    if (!chatResult || chatResult.length === 0) {
      throw new Error("Failed to create chat record in database.");
    }

    // Track chat creation in PostHog
    posthog.capture({
      distinctId: userId,
      event: 'chat_created',
      properties: {
        chatId,
        dashboardId,
        hasInitialMessage: !!initialMessageContent
      }
    });

    return chatResult[0];
  } catch (error) {
    console.error('Error creating chat record:', error);
    throw error;
  }
} 


export async function getChats(userId: string) {
  return await withRLS(async (db) => {
    return db.select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));
  });
}

export async function getDashboardChats(userId: string, dashboardId: string) {
  return await withRLS(async (db) => {
    return db.select()
      .from(chats)
      .where(and(
        eq(chats.userId, userId),
        eq(chats.dashboardId, dashboardId)
      ))
      .orderBy(desc(chats.updatedAt));
  });
}

/**
 * Get a single dashboard by ID
 */
export async function getDashboard(dashboardId: string, userId: string) {
  try {
    return await withRLS(async (db) => {
      const result = await db.select()
        .from(dashboards)
        .where(and(
          eq(dashboards.id, dashboardId),
          eq(dashboards.userId, userId)
        ))
        .limit(1);
      
      return result[0] || null;
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    throw error;
  }
}

/**
 * Replace all messages in a chat (batch update)
 */
export async function updateChatConversation(
  chatId: string,
  conversation: ChatMessage[] | any[],
  userId: string
) {
  try {
    return await withRLS(async (db) => {
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

      // Delete existing messages
      await db.delete(messages).where(eq(messages.chatId, chatId));

      // Insert new messages
      if (conversation.length > 0) {
        const messagesToInsert = conversation.map((msg, index) => ({
          id: uuidv4(),
          chatId: chatId,
          role: msg.role,
          content: msg.content || msg.message || "Unknown message content",
          createdAt: new Date(msg.timestamp || new Date()),
          updatedAt: new Date(),
        }));

        await db.insert(messages).values(messagesToInsert);
      }

      // Update chat metadata
      const result = await db.update(chats)
        .set({ 
          messageCount: conversation.length,
          lastMessageAt: conversation.length > 0 ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(chats.id, chatId))
        .returning();

      return result;
    });
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
    return await withRLS(async (db) => {
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

      // Get the dashboard details using Drizzle
      if (chatData.dashboardId) {
        const dashboardResult = await db.select().from(dashboards)
          .where(eq(dashboards.id, chatData.dashboardId));
        
        if (dashboardResult && dashboardResult.length > 0) {
          const dashboardData = dashboardResult[0];
          
          // Return a combined object with chat data and dashboard details
          return { 
            ...chatData, 
            dashboard: dashboardData
          };
        }
      }

      // Return just the chat data if no dashboard is found
      return chatData;
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    throw error;
  }
}

/**
 * Append a single message to a chat
 */
export async function appendChatMessage(
  chatId: string,
  message: ChatMessage | any,
  userId: string
) {
  const messageId = uuidv4();
  const timestamp = new Date();
  
  const newMessage = {
    id: messageId,
    chatId: chatId,
    role: message.role,
    content: message.content || message.message || "Unknown message content",
    messageType: message.messageType,
    taskGroupId: message.taskGroupId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    return await withRLS(async (db) => {
      // First verify the chat belongs to the user
      const chatExists = await db.select()
        .from(chats)
        .where(and(
          eq(chats.id, chatId),
          eq(chats.userId, userId)
        ))
        .limit(1);

      if (!chatExists || chatExists.length === 0) {
        throw new Error(`Chat with ID ${chatId} not found`);
      }

      // Insert the message
      const insertedMessage = await db.insert(messages).values(newMessage).returning();
      
      // Update chat metadata
      const currentChat = chatExists[0];
      await db.update(chats)
        .set({ 
          lastMessageAt: timestamp,
          messageCount: (currentChat.messageCount || 0) + 1,
          updatedAt: timestamp
        })
        .where(eq(chats.id, chatId));

      return insertedMessage[0];
    });
  } catch (error) {
    console.error('Error appending chat message:', error);
    throw error;
  }
}

/**
 * Get all messages for a chat
 */
export async function getChatMessages(chatId: string, userId: string) {
  try {
    return await withRLS(async (db) => {
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
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
}

/**
 * Get all dashboards for a user
 */
export async function getDashboards(userId: string) {
  try {
    return await withRLS(async (db) => {
      return db.select()
        .from(dashboards)
        .where(eq(dashboards.userId, userId))
        .orderBy(desc(dashboards.updatedAt));
    });
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
    const result = await withRLS(async (db) => {
      return db.insert(dashboards).values({
        id: dashboardId,
        userId: userId,
        name: name,
        description: description || null,
        icon: icon || "DocumentTextIcon",
        updatedAt: new Date(),
      }).returning();
    });

    if (!result || result.length === 0) {
      throw new Error("Failed to create dashboard record in database.");
    }

    // Track dashboard creation in PostHog
    posthog.capture({
      distinctId: userId,
      event: 'dashboard_created',
      properties: {
        dashboardId,
        name,
        description,
        icon
      }
    });

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
    setupCompleted?: boolean;
  }
) {
  try {
    return await withRLS(async (db) => {
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
    });
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
    return await withRLS(async (db) => {
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

      // Get widgets with all necessary fields
      const result = await db.select({
        id: widgets.id,
        title: widgets.title,
        type: widgets.type,
        config: widgets.config,
        data: widgets.data,
        summary: widgets.summary,
        order: widgets.order,
        createdAt: widgets.createdAt,
        updatedAt: widgets.updatedAt,
      })
        .from(widgets)
        .where(and(
          eq(widgets.dashboardId, dashboardId),
          eq(widgets.isConfigured, true)
        ))
        .orderBy(desc(widgets.createdAt));

      // Transform the result to match expected Widget interface format
      return result.map((widget: any) => ({
        id: widget.id,
        title: widget.title,
        type: widget.type || 'chart',
        config: widget.config || {},
        data: widget.data,
        summary: widget.summary,
        order: widget.order,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt,
      }));
    });
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
    return await withRLS(async (db) => {
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
      }).returning();

      if (!result || result.length === 0) {
        throw new Error("Failed to create widget record in database.");
      }

      return { widget: result[0] };
    });
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
    return await withRLS(async (db) => {
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

      // Update the widget (layout functionality removed)
      const result = await db.update(widgets)
        .set({
          updatedAt: new Date(),
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
    });
  } catch (error) {
    console.error('Error updating widget layout:', error);
    throw error;
  }
}

/**
 * Update dashboard file association
 */
export async function updateDashboardFile(dashboardId: string, fileId: string, userId: string) {
  try {
    return await withRLS(async (db) => {
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

      // Update the file to link it to the dashboard
      const result = await db.update(files)
        .set({
          dashboardId: dashboardId,
        })
        .where(eq(files.id, fileId))
        .returning();

      if (!result || result.length === 0) {
        throw new Error("Failed to update dashboard file association.");
      }

      return result[0];
    });
  } catch (error) {
    console.error('Error updating dashboard file association:', error);
    throw error;
  }
}

/**
 * Get files for a dashboard
 */
export async function getDashboardFiles(dashboardId: string, userId: string) {
  try {
    return await withRLS(async (db) => {
      // First verify the dashboard belongs to the user
      const dashboardResult = await db.select({ id: dashboards.id })
        .from(dashboards)
        .where(and(
          eq(dashboards.id, dashboardId),
          eq(dashboards.userId, userId)
        ));

      if (!dashboardResult || dashboardResult.length === 0) {
        // Return null to indicate dashboard not found, let caller handle
        return null;
      }

      // Get all files linked to this dashboard
      const fileResult = await db.select()
        .from(files)
        .where(and(
          eq(files.dashboardId, dashboardId),
          eq(files.userId, userId)
        ))
        .orderBy(desc(files.createdAt));
      
      // Auto-migrate files that don't have sanitized filenames
      const filesToMigrate = fileResult.filter((file: any) => !file.sanitizedFilename);
      if (filesToMigrate.length > 0) {
        console.log(`Auto-migrating ${filesToMigrate.length} files in dashboard ${dashboardId}`);
        for (const file of filesToMigrate) {
          if (file.originalFilename) {
            const sanitizedFilename = generateSanitizedFilename(file.originalFilename);
            await db.update(files)
              .set({ sanitizedFilename: sanitizedFilename })
              .where(eq(files.id, file.id));
            file.sanitizedFilename = sanitizedFilename;
          }
        }
      }
        
      return fileResult;
    });
  } catch (error) {
    console.error('Error getting dashboard files:', error);
    throw error;
  }
}

/**
 * Get all files for a user
 */
export async function getUserFiles(userId: string) {
  try {
    return await withRLS(async (db) => {
      return db.select()
        .from(files)
        .where(eq(files.userId, userId))
        .orderBy(desc(files.createdAt));
    });
  } catch (error) {
    console.error('Error fetching user files:', error);
    throw error;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string, userId: string) {
  try {
    console.log(`[deleteFile] Starting deletion for fileId: ${fileId}, userId: ${userId}`);
    
    return await withRLS(async (db) => {
      // First verify the file belongs to the user
      const fileResult = await db.select()
        .from(files)
        .where(and(
          eq(files.id, fileId),
          eq(files.userId, userId)
        ));

      if (!fileResult || fileResult.length === 0) {
        console.error(`[deleteFile] File not found: fileId=${fileId}, userId=${userId}`);
        throw new Error(`File with ID ${fileId} not found or doesn't belong to user`);
      }

      const file = fileResult[0];
      console.log(`[deleteFile] Found file:`, {
        id: file.id,
        originalFilename: file.originalFilename,
        storagePath: file.storagePath,
        userId: file.userId
      });

      // Delete the file from Supabase storage
      if (file.storagePath) {
        console.log(`[deleteFile] Original storagePath: ${file.storagePath}`);
        
        try {
          let bucketName = 'user-files'; // Default to new private bucket
          let filePath = file.storagePath;
          
          // Handle different storage path formats
          if (file.storagePath.includes('/')) {
            const pathParts = file.storagePath.split('/');
            
            // If it starts with bucket name: "user-files/user_id/dashboard_id/file.csv"
            if (pathParts[0] === 'user-files') {
              bucketName = pathParts[0];
              filePath = pathParts.slice(1).join('/');
            }
            // Legacy test-bucket format: "test-bucket/dashboards/id/file.csv"
            else if (pathParts[0] === 'test-bucket') {
              bucketName = pathParts[0];
              filePath = pathParts.slice(1).join('/');
            }
            // Old format: "test-bucket/file.csv" or just "dashboards/id/file.csv"
            else if (pathParts.length === 2 && pathParts[0] === 'test-bucket') {
              bucketName = pathParts[0];
              filePath = pathParts[1];
            }
            // If it's just a path without bucket: "user_id/dashboard_id/file.csv" or "dashboards/id/file.csv"
            else {
              filePath = file.storagePath;
            }
          }
          
          console.log(`[deleteFile] Attempting to delete from bucket: ${bucketName}, path: ${filePath}`);
          
          const { error: storageError } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
            console.error('Storage error details:', JSON.stringify(storageError, null, 2));
            // Continue with database deletion even if storage fails to avoid orphaned DB records
            console.warn(`[deleteFile] Storage deletion failed for ${file.storagePath}, but continuing with database deletion`);
            console.warn(`[deleteFile] This may leave an orphaned file in storage that can be overwritten on re-upload`);
          } else {
            console.log(`[deleteFile] Successfully deleted file from storage: ${file.storagePath}`);
          }
        } catch (storageErr) {
          console.error('Exception during storage deletion:', storageErr);
          console.warn(`[deleteFile] Storage deletion threw exception for ${file.storagePath}, but continuing with database deletion`);
        }
      }

      // Delete the file record from database
      console.log(`[deleteFile] Deleting database record for fileId: ${fileId}`);
      const result = await db.delete(files)
        .where(and(
          eq(files.id, fileId),
          eq(files.userId, userId)
        ))
        .returning();

      if (!result || result.length === 0) {
        console.error(`[deleteFile] Failed to delete database record for fileId: ${fileId}`);
        throw new Error("Failed to delete file record from database.");
      }

      console.log(`[deleteFile] Successfully deleted file: ${fileId}`);
      return result[0];
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}
