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

export interface ChatSidebarProps {
  dashboardId: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  contextWidgetIds?: string[];
  targetWidgetType?: string;
}

export function ChatSidebar({
  dashboardId,
  isOpen,
  onToggle,
  className,
}: ChatSidebarProps) {
  // State management
  const [isLoading, setIsLoading] = React.useState(false);
  const [widgetsLoading, setWidgetsLoading] = React.useState(false);
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [availableWidgets, setAvailableWidgets] = React.useState<DashboardWidget[]>([]);


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
    if (!data.message.trim() || !data.widgetType || isLoading) return;

    const newMessage: ChatMessage = {
      role: 'user',
      message: data.message,
      timestamp: new Date().toISOString(),
      contextWidgetIds: data.selectedItems.map(item => item.id),
      targetWidgetType: data.widgetType,
    };

    setChatHistory(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const analyzeRequest = {
        message: newMessage.message,
        dashboardId,
        contextWidgetIds: newMessage.contextWidgetIds || [],
        targetWidgetType: newMessage.targetWidgetType,
      };

      // TODO: Replace with actual API call
      // const response = await fetch('/api/analyze', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(analyzeRequest),
      // });

      // Mock response for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        message: `Creating a ${data.widgetType?.replace('-', ' ')} widget based on your request...`,
        timestamp: new Date().toISOString(),
      };

      setChatHistory(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Failed to analyze message:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        message: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setChatHistory(prev => [...prev, errorMessage]);
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
        "flex flex-col",
        "h-full", // Full height to match parent container
        className
      )}
      style={{ minWidth: isOpen ? "400px" : "0px" }}
    >
        {/* Header */}
        <div className="flex items-center justify-between py-2 px-4 border-b shrink-0">
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

        

        {/* Chat History */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {chatHistory.length === 0 ? (
              ""
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
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <div className="p-4 shrink-0">
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