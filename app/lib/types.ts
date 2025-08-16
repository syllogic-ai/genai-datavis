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
  
  return messages
    .filter(msg => {
      // Filter out chart role messages
      if (msg.role === "chart") {
        return false;
      }
      
      // Filter out messages that are just UUIDs (likely widget IDs)
      const content = msg.content || msg.message || "";
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof content === "string" && uuidRegex.test(content.trim())) {
        return false;
      }
      
      // Filter out messages with chart configuration data (internal system messages)
      if (typeof content === "object" && content !== null) {
        // Check if it's a chart configuration object
        if (content.chartType || content.xAxisConfig || content.yAxisConfig || content.chartConfig) {
          return false;
        }
      }
      
      // Filter out empty or undefined content
      if (!content || (typeof content === "string" && content.trim() === "")) {
        return false;
      }
      
      return true;
    })
    .map(msg => {
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
      
      // If message format is unknown but passed filtering, return system message
      return {
        role: msg.role || "system",
        content: "System message"
      };
    });
} 