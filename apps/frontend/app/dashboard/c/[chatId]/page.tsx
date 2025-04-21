"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartBlock } from "@/components/blocks/ChartBlock";
import { ConversationHistory } from "@/components/ConversationHistory";
import { useChatRealtime } from "@/app/lib/hooks/useChatRealtime";
import { ChatInput } from "@/components/ui/chat-input";

import { API_URL } from "@/app/lib/env";
import { updateChatConversation, appendChatMessage, getChat, getChartById } from "@/app/lib/actions";
import { ChatMessage } from "@/app/lib/types";
import type { ChartSpec } from "@/types/chart-types";
import { SiteHeader } from "@/components/dashboard/SiteHeader";
import { chatEvents, CHAT_EVENTS } from "@/app/lib/events";

// Custom hook for chat title updates
function useChatTitle(chatId: string, userId: string | undefined) {
  const [title, setTitle] = useState<string>("New Chat");
  
  useEffect(() => {
    if (!chatId || !userId) return;
    
    const fetchChatTitle = async () => {
      try {
        const chatData = await getChat(chatId, userId);
        if (chatData && chatData.title) {
          setTitle(chatData.title);
        }
      } catch (err) {
        console.error("Error fetching chat title:", err);
      }
    };
    
    // Fetch the title initially
    fetchChatTitle();
    
    // Listen for rename events
    const handleChatRenamed = (data: {chatId: string, newTitle: string}) => {
      if (data.chatId === chatId) {
        setTitle(data.newTitle);
      }
    };
    
    // Subscribe to rename events
    chatEvents.on(CHAT_EVENTS.CHAT_RENAMED, handleChatRenamed);
    
    // Cleanup: unsubscribe when component unmounts
    return () => {
      chatEvents.off(CHAT_EVENTS.CHAT_RENAMED, handleChatRenamed);
    };
  }, [chatId, userId]);
  
  return title;
}

export default function ChatPage() {
  // Grab chatId from the route
  const params = useParams();
  const chatId = params.chatId as string; // e.g. "1234-5678-..."
  
  // Get user from Clerk
  const { user, isLoaded, isSignedIn } = useUser();

  // States - define all state unconditionally (React hooks rule)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [visualization, setVisualization] = useState<ChartSpec | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatDetails, setChatDetails] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Get real-time updated chat title
  const chatTitle = useChatTitle(chatId, user?.id);

  // Subscribe to real-time updates on the chat - MUST be called unconditionally
  const { conversation, isLoading: isConversationLoading, error: conversationError } = useChatRealtime(chatId, {
    onUpdate: async (updatedConversation) => {
      setMessages(updatedConversation);
      
      // Check for chart messages
      const chartMessages = updatedConversation.filter(msg => msg.role === "chart");
      if (chartMessages.length > 0) {
        const latestChartMessage = chartMessages[chartMessages.length - 1];
        // Extract chartId from message content
        const chartId = latestChartMessage.content;
        
        try {
          // Retrieve the chart specification using Drizzle
          const chartSpec = await getChartById(chartId);
          if (chartSpec) {
            setVisualization(chartSpec as ChartSpec);
          }
        } catch (err) {
          console.error("Error fetching chart specification:", err);
          setError(err instanceof Error ? err.message : "Error fetching chart");
        }
      }
    },
  });

  // Fetch the chat details including the associated file
  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChatDetails = async () => {
      try {
        const chatData = await getChat(chatId, user.id);
        setChatDetails(chatData);
      } catch (err) {
        console.error("Error fetching chat details:", err);
        setError(err instanceof Error ? err.message : "Error fetching chat details");
      }
    };

    fetchChatDetails();
  }, [chatId, user]);

  // A function to handle the analyze request
  const analyzeData = useCallback(async (prompt: string) => {
    if (!user || !chatDetails) return;
    
    setAnalyzing(true);
    setError(null);

    try {
      // Get the file URL from chat details
      // The files object now has both storage_path (for Supabase) and storagePath (from Drizzle)
      const fileUrl = chatDetails.files?.storage_path || chatDetails.files?.storagePath;
      
      // Ensure we have a valid file URL
      if (!fileUrl) {
        throw new Error("No file URL found for this chat");
      }

      console.log("Using file URL:", fileUrl); // Log the URL being used

      // Call your /analyze or /chat endpoint
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          file_url: fileUrl, // Use the actual file URL from the database
          is_follow_up: Boolean(analysisResult),
          session_id: chatId, // The session_id is actually the chat_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ?? `Analysis failed with status ${response.status}`
        );
      }

      const result = await response.json();
      setAnalysisResult(result);

      // If there's a new chart, store it
      if (result.visual && result.visual[0]) {
        setVisualization(result.visual[0]);
      }

      // The backend will now handle appending the system message to the chat in Supabase
      // The updated conversation will be picked up through useChatRealtime
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error analyzing file");
      console.error("Error analyzing file:", err);
    } finally {
      setAnalyzing(false);
    }
  }, [user, chatDetails, chatId, analysisResult]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (message: string) => {
    if (!user) return;
    
    setIsChatLoading(true);
    setError(null);

    // Add user message to chat
    const userMessage: ChatMessage = { role: "user", content: message };
    
    // Add to local state 
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Append the user message to the database conversation
      await appendChatMessage(chatId, userMessage, user.id);
      
      // If this is the first message, generate a title for the chat
      if (messages.length === 0) {
        try {
          console.log("First message detected, generating title...");
          console.log("Chat details:", chatDetails);
          
          // Extract column names from file metadata - handle different possible structures
          let columnNames: string[] = [];
          
          if (chatDetails?.files) {
            // Try different possible locations for column data
            if (chatDetails.files.metadata?.columns) {
              columnNames = chatDetails.files.metadata.columns;
            } else if (chatDetails.files.metadata?.schema?.fields) {
              // Extract column names from schema fields if available
              columnNames = chatDetails.files.metadata.schema.fields.map((field: {name: string}) => field.name);
            } else if (chatDetails.files.metadata?.fields) {
              columnNames = chatDetails.files.metadata.fields;
            }
            
            console.log("Extracted column names:", columnNames);
          }
          
          // Call the generate-title endpoint
          console.log(`Calling ${API_URL}/generate-title`);
          const titleResponse = await fetch(`${API_URL}/generate-title`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: message,
              column_names: columnNames,
              chat_id: chatId
            }),
          });
          
          console.log("Title generation response status:", titleResponse.status);
          
          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            console.log("Generated title data:", titleData);
            
            // Emit event to update the title in the UI
            chatEvents.emit(CHAT_EVENTS.CHAT_RENAMED, {
              chatId: chatId,
              newTitle: titleData.title
            });
          } else {
            // Try to get error details
            const errorData = await titleResponse.json().catch(() => ({}));
            console.error("Title generation failed:", titleResponse.status, errorData);
          }
        } catch (titleErr) {
          console.error("Error generating title:", titleErr);
          // Don't fail the whole operation if title generation fails
        }
      }
      
      await analyzeData(message);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  }, [user, messages, chatId, analyzeData, chatDetails]);

  // Set initial messages from the conversation when first loaded
  useEffect(() => {
    if (conversation && conversation.length > 0) {
      setMessages(conversation);
      
      // Find the last message with role "chart"
      const chartMessages = conversation.filter(msg => msg.role === "chart");
      if (chartMessages.length > 0) {
        const latestChartMessage = chartMessages[chartMessages.length - 1];
        // Extract chartId from message content
        const chartId = latestChartMessage.content;
        
        // Retrieve the chart specification
        const loadChartSpec = async () => {
          try {
            const chartSpec = await getChartById(chartId);
            if (chartSpec) {
              setVisualization(chartSpec as ChartSpec);
            }
          } catch (err) {
            console.error("Error fetching chart specification:", err);
            setError(err instanceof Error ? err.message : "Error fetching chart");
          }
        };
        
        loadChartSpec();
      }
    }
  }, [conversation]); // Only depend on conversation changes

  // Handle conversation error
  useEffect(() => {
    if (conversationError) {
      setError(conversationError.message);
    }
  }, [conversationError]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Render loading state while user or conversation is loading
  if (!isLoaded) {
    return <div className="flex items-center justify-center h-screen">Loading user...</div>;
  }
  
  if (!isSignedIn || !user) {
    return <div className="flex items-center justify-center h-screen">Please sign in to access this chat.</div>;
  }

  if (isConversationLoading) {
    return <div className="flex items-center justify-center h-screen">Loading conversation...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-black">
      <SiteHeader 
        chatTitle={chatTitle} 
        fileName={chatDetails?.files?.originalFilename} 
        fileStatus="available"
        filePath={chatDetails?.files?.storage_path || chatDetails?.files?.url || chatDetails?.files?.storagePath}
      />
      <div className="flex-1 overflow-auto">
        {/* Main content container with side-by-side layout */}
        <div className="flex h-full pt-4">
          {/* Chat column - messages and input */}
          <div className={`flex flex-col transition-all duration-300 ease-in-out ${visualization ? 'md:w-1/2' : 'w-full'}`}>
            {/* Chat messages */}
            <div className="flex-1 flex items-start justify-center">
              <div className="w-full max-w-2xl">
                <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-18rem)] pr-4">
                  <div className="space-y-4 p-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`px-4 py-2 rounded-xl shadow-md border border-gray-300/20  ${
                          message.role === "user" ? "bg-neutral-800 text-white ml-12" : "bg-[#f9f9f9ba] mr-12"
                        }`}
                      >
                        <p className="whitespace-pre-line">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Chat input - placed under messages */}
            <div className="p-4">
              <ChatInput 
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading || analyzing}
                isDisabled={isChatLoading || analyzing}
                placeholder="Ask a question about your data..."
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="p-4 flex justify-center">
                <div className="w-full max-w-2xl">
                  <div className="p-3 bg-red-100 text-red-700 rounded">
                    {error}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visualization - right side, appears with smooth transition */}
          <div className={`md:w-1/2 p-4 flex transition-all duration-300 ease-in-out ${visualization ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 overflow-hidden'}`}>
            {visualization && <ChartBlock spec={visualization} />}
          </div>
        </div>
      </div>
    </div>
  );
}
