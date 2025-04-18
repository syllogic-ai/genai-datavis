"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUser } from "@clerk/nextjs";
import * as z from "zod";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartBlock } from "@/components/blocks/ChartBlock";
import { ConversationHistory } from "@/components/ConversationHistory";
import { useChatRealtime } from "@/app/lib/hooks/useChatRealtime";

import { API_URL } from "@/app/lib/env";
import { updateChatConversation, appendChatMessage, getChat, getChartById } from "@/app/lib/actions";
import { ChatMessage } from "@/app/lib/types";
import type { ChartSpec } from "@/types/chart-types";
import { SiteHeader } from "@/components/dashboard/SiteHeader";
import { chatEvents, CHAT_EVENTS } from "@/app/lib/events";

// Zod schema for input
const formSchema = z.object({
  message: z.string().min(1, {
    message: "Please enter a message.",
  }),
});

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

  // Initialize form with RHF + Zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

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

  // A function to handle the analyze request
  async function analyzeData(prompt: string) {
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
          session_id: chatId, // or some session key
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

      // Build system message from insights
      const systemMessage: ChatMessage = {
        role: "system",
        content:
          typeof result.insights === "string"
            ? result.insights
            : result.insights?.join("\n") ?? "Analysis completed.",
      };
      
      // Add to local state
      const updatedMessages = [...messages, systemMessage];
      setMessages(updatedMessages);
      
      // Append the system message to the database
      await appendChatMessage(chatId, systemMessage, user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error analyzing file");
      console.error("Error analyzing file:", err);
    } finally {
      setAnalyzing(false);
    }
  }

  // Form submit
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    setIsChatLoading(true);
    setError(null);

    // Add user message to chat
    const userMessage: ChatMessage = { role: "user", content: values.message };
    
    // Add to local state 
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Append the user message to the database conversation
      await appendChatMessage(chatId, userMessage, user.id);
      
      await analyzeData(values.message);
      // Reset form
      form.reset({ message: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

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
            <div className="p-4 ">
              <div className="max-w-2xl mx-auto">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="relative rounded-xl border border-gray-300/20 overflow-hidden">
                    <Textarea
                      {...form.register("message")}
                      placeholder="Ask a question about your data..."
                      className="min-h-24 py-4 pb-14 resize-none rounded-xl"
                      disabled={isChatLoading || analyzing}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          form.handleSubmit(onSubmit)();
                        }
                      }}
                    />
                    <div className="absolute bottom-3 right-3">
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-full group"
                        disabled={isChatLoading || analyzing}
                      >
                        {isChatLoading || analyzing ? (
                          <span className="mx-1">...</span>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            className="w-5 h-5 group-hover:translate-x-0.5 transition-all duration-300"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5L21 12m0 0-7.5 7.5M21 12H3"
                            />
                          </svg>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
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
