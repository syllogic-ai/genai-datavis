/**
 * Type for standard chat messages with content field
 */
export type ChatMessage = {
  role: "user" | "system";
  content: string;
  timestamp?: string;
};

/**
 * Type for chat realtime hook options
 */
export type ChatRealtimeOptions = {
  onUpdate?: (conversation: ChatMessage[]) => void;
};

/**
 * Normalize any message format to standard ChatMessage format
 * This handles both {role, content} and {role, message} formats
 */
export function normalizeMessages(messages: any[]): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  
  return messages.map(msg => {
    // If the message is already in the right format, return it
    if (msg.content) {
      return {
        role: msg.role,
        content: msg.content
      };
    }
    
    // If the message has 'message' field instead of 'content', normalize it
    if (msg.message) {
      return {
        role: msg.role,
        content: msg.message
      };
    }
    
    // If message format is unknown, return empty content
    return {
      role: msg.role || "system",
      content: "Unknown message format"
    };
  });
} 