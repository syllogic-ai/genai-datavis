/**
 * Type for standard chat messages with content field
 */
export type ChatMessage = {
  role: "user" | "system" | "chart";
  content: string;
  timestamp?: string;
  widget_ids?: string[]; // Support for multiple widgets
  chart_id?: string; // Backward compatibility
};

export type ChartMessage = {
  id: string;
  title: string;
  type: string;
  description: string;
  icon: string;
  timestamp?: string;
};

// Import ChartSpec from the chart-types file
export type { ChartSpec } from "@/types/chart-types";

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