"use server";

import db from '../../db'; // Import Drizzle client
import { files, chats } from '../../db/schema'; // Import Drizzle schemas
import { eq } from 'drizzle-orm'; // Import eq operator
import { v4 as uuidv4 } from 'uuid'; // Assuming you might need UUIDs

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