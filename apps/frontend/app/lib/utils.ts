import { v4 as uuidv4 } from 'uuid';

// Utility function to generate UUID-based filename
export function generateSanitizedFilename(originalFilename: string): string {
  if (!originalFilename || typeof originalFilename !== 'string') {
    throw new Error('Invalid filename provided');
  }
  
  // Remove path separators and dangerous characters
  const safeName = originalFilename.replace(/[\/\\]/g, '');
  
  if (safeName.length === 0) {
    throw new Error('Filename cannot be empty');
  }
  
  const fileExtension = safeName.split('.').pop() || 'txt';
  const uuid = uuidv4();
  return `file_${uuid}.${fileExtension}`;
}