"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DashboardWidget } from "./widget-context-selector";
import { ChatInput } from "./ChatInput";
import { TagItem } from "@/components/ui/tags/tag-selector";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useChatRealtime } from "@/app/lib/hooks/useChatRealtime";
import { v4 as uuidv4 } from 'uuid';

export interface ChatSidebarProps {
  dashboardId: string;
  chatId: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: string;
  contextWidgetIds?: string[];
  targetWidgetType?: string;
}

export function ChatSidebar({
  dashboardId,
  chatId,
  isOpen,
  onToggle,
  className,
}: ChatSidebarProps) {
  // State management
  const [isLoading, setIsLoading] = React.useState(false);
  const [widgetsLoading, setWidgetsLoading] = React.useState(false);
  const [availableWidgets, setAvailableWidgets] = React.useState<DashboardWidget[]>([]);
  
  // Use real-time chat hook for conversation
  const { conversation, isLoading: chatLoading, error: chatError } = useChatRealtime(chatId);
  
  // Convert real-time conversation to our local format
  const chatHistory = React.useMemo(() => {
    return conversation.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      message: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
      contextWidgetIds: undefined, // This info isn't stored in the normalized format
      targetWidgetType: undefined
    }));
  }, [conversation]);


  // Fetch available widgets for the dashboard
  React.useEffect(() => {
    const fetchWidgets = async () => {
      if (!dashboardId) return;
      
      setWidgetsLoading(true);
      try {
        // TODO: Replace with actual API call using Drizzle ORM
        // const response = await fetch(`/api/dashboards/${dashboardId}/widgets`);
        // const widgets = await response.json();
        
        // Mock data for now - using fixed date to prevent infinite re-renders
        const mockDate = new Date('2024-01-01');
        const mockWidgets: DashboardWidget[] = [
          {
            id: "widget-1",
            title: "Sales Overview",
            type: "line-chart",
            dashboardId,
            createdAt: mockDate,
          },
          {
            id: "widget-2", 
            title: "Revenue Table",
            type: "table",
            dashboardId,
            createdAt: mockDate,
          },
          {
            id: "widget-3",
            title: "Key Metrics",
            type: "kpi-card",
            dashboardId,
            createdAt: mockDate,
          },
        ];
        
        setAvailableWidgets(mockWidgets);
      } catch (error) {
        console.error("Failed to fetch widgets:", error);
      } finally {
        setWidgetsLoading(false);
      }
    };

    if (isOpen && dashboardId) {
      fetchWidgets();
    }
  }, [isOpen, dashboardId]);

  // Transform widgets to TagItems for ChatInput
  const widgetTagItems: TagItem[] = React.useMemo(() => {
    return availableWidgets.map(widget => ({
      id: widget.id,
      label: widget.title,
      category: "Widget"
    }));
  }, [availableWidgets]);

  // Handle message submission from ChatInput
  const handleChatSubmit = async (data: {
    selectedItems: TagItem[];
    message: string;
    widgetType: string;
  }) => {
    if (!data.message.trim() || isLoading) return;
    
    // Debug logging
    console.log('Chat submit triggered:', {
      message: data.message,
      widgetType: data.widgetType,
      selectedItems: data.selectedItems,
      isLoading
    });

    const newMessage: ChatMessage = {
      role: 'user',
      message: data.message,
      timestamp: new Date().toISOString(),
      contextWidgetIds: data.selectedItems.map(item => item.id),
      targetWidgetType: data.widgetType,
    };

    // Don't add to local state - the conversation will be updated by the backend
    // and we'll receive it via real-time subscriptions
    setIsLoading(true);

    try {
      const analyzeRequest = {
        message: newMessage.message,
        dashboardId,
        contextWidgetIds: newMessage.contextWidgetIds?.length > 0 ? newMessage.contextWidgetIds : undefined,
        targetWidgetType: newMessage.targetWidgetType || undefined,
        chatId
      };

      console.log('Sending analyze request:', analyzeRequest);

      const response = await fetch('/api/chat/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText}` };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Analyze response:', result);
      
      if (result.success) {
        console.log(`Message sent successfully. Task ID: ${result.taskId}`);
        // The conversation will be updated by the backend via real-time subscriptions
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error("Failed to analyze message:", error);
      
      // Show user-friendly error message
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ 
        width: isOpen ? "400px" : 0, 
        opacity: isOpen ? 1 : 0 
      }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className={cn(
        "bg-transparent border-l overflow-hidden rounded-br-lg",
        "flex flex-col relative",
        "h-full", // Full height to match parent container
        className
      )}
      style={{ minWidth: isOpen ? "400px" : "0px" }}
    >
        {/* Header */}
        <div className="flex items-center justify-between py-2 px-4 border-b shrink-0 relative z-10 bg-background">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">New widget</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat History - with bottom padding for fixed input */}
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4 pb-32"> {/* Extra bottom padding for fixed input */}
              {chatLoading && chatHistory.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  Loading conversation...
                </div>
              ) : chatError ? (
                <div className="text-center text-red-500">
                  Error loading conversation: {chatError.message}
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  Start a conversation by describing the widget you want to create.
                </div>
              ) : (
                chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg max-w-[85%] break-words",
                      msg.role === 'user'
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="mr-auto bg-muted p-3 rounded-lg max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="text-sm">Processing your request...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Chat Input at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t z-20">
          <ChatInput
            availableItems={widgetTagItems}
            onSubmit={handleChatSubmit}
            isLoading={isLoading}
            triggerLabel="Add Widget Context"
            searchPlaceholder="Search dashboard widgets..."
            emptyStateMessage="No widgets found in this dashboard"
            messagePlaceholder="Describe the widget you want to create..."
            widgetOptions={[
              { value: "line-chart", label: "Line Chart" },
              { value: "bar-chart", label: "Bar Chart" },
              { value: "table", label: "Table" },
              { value: "kpi-card", label: "KPI Card" },
              { value: "pie-chart", label: "Pie Chart" },
            ]}
            className="w-full"
          />
        </div>
        
      </motion.div>
  );
}