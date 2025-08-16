"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DashboardWidget } from "./widget-context-selector";
import { ChatInput } from "./ChatInput";
import { TagItem } from "@/components/ui/tags/tag-selector";
import { cn } from "@/lib/utils";
import { X, Plus, MessageSquare, Clock, History } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChatRealtime } from "@/app/lib/hooks/useChatRealtime";
import { v4 as uuidv4 } from 'uuid';
import { Widget } from "@/types/enhanced-dashboard-types";
import { Chat } from "@/db/schema";
import { getDashboardChats } from "@/app/lib/actions";
import { createEmptyChat } from "@/app/lib/chatActions";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { chatEvents, CHAT_EVENTS } from "@/app/lib/events";
import Link from "next/link";
import { useDashboardJobCompletion } from "@/app/lib/hooks/useDashboardJobCompletion";

export interface ChatSidebarProps {
  dashboardId: string;
  chatId: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  dashboardWidgets?: Widget[]; // Add dashboard widgets prop
  onWidgetsRefresh?: () => Promise<void>; // Add widget refresh callback
  onJobStart?: (jobId: string) => void; // New callback for job tracking
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: string;
  contextWidgetIds?: string[];
  targetWidgetType?: string;
  isPending?: boolean; // Add flag for messages waiting for backend confirmation
  tempId?: string; // Temporary ID for pending messages
  widget_ids?: string[]; // Support for multiple widgets
  chart_id?: string; // Backward compatibility
}

export function ChatSidebar({
  dashboardId,
  chatId,
  isOpen,
  onToggle,
  className,
  dashboardWidgets = [],
  onWidgetsRefresh,
  onJobStart,
}: ChatSidebarProps) {
  // State management
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingMessages, setPendingMessages] = React.useState<ChatMessage[]>([]);
  const [currentJobId, setCurrentJobId] = React.useState<string | null>(null);
  const [dashboardChats, setDashboardChats] = React.useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = React.useState(false);
  const [showChatList, setShowChatList] = React.useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = React.useState(false);
  
  // Scroll management
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Job monitoring is now handled by the parent component (ChatPhase)
  // This component only tracks the currentJobId for UI purposes
  
  // Hooks
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Convert dashboard widgets to TagItem format
  const availableWidgetItems = React.useMemo((): TagItem[] => {
    return dashboardWidgets.map(widget => ({
      id: widget.id,
      label: widget.config?.title || `${widget.type.charAt(0).toUpperCase() + widget.type.slice(1)} Widget`,
      type: widget.type,
    }));
  }, [dashboardWidgets]);
  
  // Use real-time chat hook for conversation
  const { conversation, isLoading: chatLoading, error: chatError } = useChatRealtime(chatId);
  
  // Clear pending messages when chatId changes
  React.useEffect(() => {
    setPendingMessages([]);
    setCurrentJobId(null);
  }, [chatId]);
  
  // Convert real-time conversation to our local format and merge with pending messages
  const chatHistory = React.useMemo(() => {
    const realTimeMessages = conversation.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      message: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
      contextWidgetIds: undefined, // This info isn't stored in the normalized format
      targetWidgetType: undefined,
      isPending: false,
      widget_ids: msg.widget_ids, // Include multiple widgets
      chart_id: msg.chart_id // Include chart ID for backward compatibility
    }));
    
    // Filter out pending messages that are now confirmed in the real-time conversation
    const filteredPendingMessages = pendingMessages.filter(pending => {
      // Simple deduplication by timestamp and content for now
      return !realTimeMessages.some(real => 
        real.message === pending.message && 
        Math.abs(new Date(real.timestamp).getTime() - new Date(pending.timestamp).getTime()) < 5000 // 5 second window
      );
    });
    
    // Combine and sort by timestamp
    return [...realTimeMessages, ...filteredPendingMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [conversation, pendingMessages]);
  
  // Auto-scroll to bottom function
  const scrollToBottom = React.useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior,
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);
  
  // Scroll to bottom when chat history changes (new messages or chat switch)
  React.useEffect(() => {
    if (chatHistory.length > 0) {
      // Use instant scroll when switching chats, smooth scroll for new messages
      const behavior = pendingMessages.length > 0 ? 'smooth' : 'instant';
      scrollToBottom(behavior);
    }
  }, [chatHistory, scrollToBottom, pendingMessages.length]);
  
  // Scroll to bottom when sidebar opens
  React.useEffect(() => {
    if (isOpen && chatHistory.length > 0) {
      // Small delay to ensure the sidebar is fully rendered
      setTimeout(() => scrollToBottom('instant'), 100);
    }
  }, [isOpen, chatHistory.length, scrollToBottom]);
  
  // Scroll to bottom when loading state changes (shows processing message)
  React.useEffect(() => {
    if (isLoading) {
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  }, [isLoading, scrollToBottom]);


  // Load chats for current dashboard
  const loadDashboardChats = React.useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingChats(true);
    try {
      const chats = await getDashboardChats(user.id, dashboardId);
      setDashboardChats(chats);
    } catch (error) {
      console.error('Error loading dashboard chats:', error);
      setDashboardChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, [user?.id, dashboardId]);

  // Create new chat
  const handleCreateNewChat = React.useCallback(async () => {
    if (!user?.id) return;
    
    // Check if there's already a "New Chat" (empty chat)
    const existingNewChat = dashboardChats.find(chat => 
      chat.title === "New Chat" || chat.title === "New chat"
    );
    
    if (existingNewChat) {
      // Navigate to the existing new chat instead of creating another one
      router.push(`/dashboard/${dashboardId}?chat=${existingNewChat.id}`);
      setShowHistoryPopover(false);
      return;
    }
    
    try {
      const newChat = await createEmptyChat(user.id, dashboardId);
      setDashboardChats(prev => [newChat, ...prev]);
      
      // Emit event for other components
      chatEvents.emit(CHAT_EVENTS.CHAT_CREATED, newChat);
      
      // Navigate to the new chat
      router.push(`/dashboard/${dashboardId}?chat=${newChat.id}`);
      
      // Hide popover after creating new chat
      setShowHistoryPopover(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  }, [user?.id, dashboardId, router, dashboardChats]);

  // Load chats when sidebar opens
  React.useEffect(() => {
    if (isOpen) {
      loadDashboardChats();
    }
  }, [isOpen, loadDashboardChats]);

  // Listen for chat events to update the list
  React.useEffect(() => {
    const handleChatRenamed = (data: { chatId: string; newTitle: string }) => {
      setDashboardChats(prev => 
        prev.map(chat => 
          chat.id === data.chatId ? { ...chat, title: data.newTitle } : chat
        )
      );
    };

    const handleChatCreated = (data: Chat) => {
      if (data.dashboardId === dashboardId) {
        setDashboardChats(prev => {
          const exists = prev.some(chat => chat.id === data.id);
          return exists ? prev : [data, ...prev];
        });
      }
    };

    chatEvents.on(CHAT_EVENTS.CHAT_RENAMED, handleChatRenamed);
    chatEvents.on(CHAT_EVENTS.CHAT_CREATED, handleChatCreated);

    return () => {
      chatEvents.off(CHAT_EVENTS.CHAT_RENAMED, handleChatRenamed);
      chatEvents.off(CHAT_EVENTS.CHAT_CREATED, handleChatCreated);
    };
  }, [dashboardId]);

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

    const tempId = uuidv4();
    const newMessage: ChatMessage = {
      role: 'user',
      message: data.message,
      timestamp: new Date().toISOString(),
      contextWidgetIds: data.selectedItems?.length ? data.selectedItems.map(item => item.id) : undefined,
      targetWidgetType: data.widgetType,
      isPending: true,
      tempId
    };

    // Immediately add user message to pending state for instant display
    setPendingMessages(prev => [...prev, newMessage]);
    setIsLoading(true);
    
    // Scroll to bottom to show the new user message
    setTimeout(() => scrollToBottom('smooth'), 100);

    try {
      const analyzeRequest = {
        message: newMessage.message,
        dashboardId,
        contextWidgetIds: newMessage.contextWidgetIds && newMessage.contextWidgetIds.length > 0 ? newMessage.contextWidgetIds : undefined,
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
        
        // Track the job for monitoring
        if (result.taskId) {
          setCurrentJobId(result.taskId);
          
          // Notify parent component about job start
          if (onJobStart) {
            onJobStart(result.taskId);
          }
        }
        
        // Remove the pending message since it's now being processed
        // Real-time subscriptions will handle the confirmed message
        setTimeout(() => {
          setPendingMessages(prev => prev.filter(msg => msg.tempId !== tempId));
        }, 1000); // Small delay to ensure smooth transition
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error("Failed to analyze message:", error);
      
      // Remove the pending message on error
      setPendingMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      
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
      transition={{ 
        type: "tween", 
        duration: 0.3, 
        ease: [0.4, 0.0, 0.2, 1] // Custom cubic-bezier for smooth animation
      }}
      className={cn(
        "bg-transparent border-l overflow-hidden rounded-br-lg",
        "flex flex-col relative",
        "h-full flex-shrink-0", // Prevent shrinking and maintain height
        className
      )}
      style={{ 
        minWidth: isOpen ? "400px" : "0px",
        maxWidth: isOpen ? "400px" : "0px"
      }}
    >
        {/* Header */}
        <div className="border-b shrink-0 relative z-10 bg-background">
          {/* Main header */}
          <div className="flex items-center justify-between py-2 px-4">
            {/* Left side - Chat name */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {dashboardChats.find(chat => chat.id === chatId)?.title || "New Chat"}
              </div>
            </div>
            
            {/* Right side - Three buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Plus button - Create new chat */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateNewChat}
                title="Create New Chat"
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              {/* History button - Show past chats */}
              <Popover open={showHistoryPopover} onOpenChange={setShowHistoryPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Chat History"
                    className="h-8 w-8"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Chat History</h4>
                    {isLoadingChats ? (
                      <div className="text-center text-muted-foreground py-4">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        Loading chats...
                      </div>
                    ) : dashboardChats.length > 0 ? (
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {dashboardChats.map((chat) => {
                          const isActive = chatId === chat.id;
                          return (
                            <Link 
                              key={chat.id} 
                              href={`/dashboard/${dashboardId}?chat=${chat.id}`}
                              onClick={() => setShowHistoryPopover(false)}
                            >
                              <div
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors",
                                  isActive 
                                    ? "bg-primary text-primary-foreground" 
                                    : "hover:bg-muted"
                                )}
                              >
                                <MessageSquare className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{chat.title}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-4 text-sm">
                        No chats yet. Click + to create one!
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* X button - Close chat sidebar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                title="Close Chat"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </div>

        {/* Chat History - with bottom padding for fixed input */}
        <div className="flex-1 overflow-hidden relative bg-background">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="p-4 space-y-4 pb-56"> {/* Further increased bottom padding for chat input to ensure all messages are visible */}
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
                chatHistory
                  .filter(msg => {
                    // Additional validation before rendering - should already be filtered by normalizeMessages but double-check
                    if (!msg.message || typeof msg.message !== 'string' || msg.message.trim() === '') return false;
                    // Check if message is just a UUID
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(msg.message.trim())) return false;
                    return true;
                  })
                  .map((msg, index) => (
                  <div
                    key={(msg as any).tempId || index}
                    className={cn(
                      "p-3 rounded-lg max-w-[85%] break-words transition-opacity",
                      msg.role === 'user'
                        ? "ml-auto bg-primary text-primary-foreground"
                        : msg.role === 'system'
                        ? "mr-auto bg-muted/50 text-muted-foreground border"
                        : "mr-auto bg-muted",
                      msg.isPending && "opacity-70" // Show pending messages with reduced opacity
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        
                        {/* Show widget creation info */}
                        {(msg.widget_ids || msg.chart_id) && (
                          <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-xs">
                            {msg.widget_ids && msg.widget_ids.length > 1 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-green-700 dark:text-green-300">
                                  ✅ Created {msg.widget_ids.length} widgets
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-green-700 dark:text-green-300">
                                  ✅ Widget created
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                          {msg.isPending && (
                            <div className="flex items-center gap-1">
                              <div className="animate-spin h-2 w-2 border border-current border-t-transparent rounded-full" />
                              <span className="text-xs opacity-70">Sending...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
              
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} className="h-1 w-full" />
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Chat Input at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t z-20">
          <ChatInput
            availableItems={availableWidgetItems}
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