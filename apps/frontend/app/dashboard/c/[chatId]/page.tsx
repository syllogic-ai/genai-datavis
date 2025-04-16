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
import { updateChatConversation } from "@/app/lib/actions";
import { supabase, supabaseAdmin } from "@/app/lib/supabase";
import { ChatMessage } from "@/app/lib/types";

// Zod schema for input
const formSchema = z.object({
  message: z.string().min(1, {
    message: "Please enter a message.",
  }),
});

export default function ChatPage() {
  // Grab chatId from the route
  const params = useParams();
  const chatId = params.chatId as string; // e.g. "1234-5678-..."
  
  // Get user from Clerk
  const { user, isLoaded, isSignedIn } = useUser();

  // States - define all state unconditionally (React hooks rule)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [visualization, setVisualization] = useState<any>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time updates on the chat - MUST be called unconditionally
  const { conversation, isLoading: isConversationLoading, error: conversationError } = useChatRealtime(chatId, {
    onUpdate: (updatedConversation) => {
      setMessages(updatedConversation);
    },
  });

  // Initialize form with RHF + Zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  // Set initial messages from the conversation when first loaded
  useEffect(() => {
    if (conversation && conversation.length > 0) {
      setMessages(conversation);
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
    if (!user) return;
    
    setAnalyzing(true);
    setError(null);

    try {
      // Example: call your /analyze or /chat endpoint
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          // file_url or other data you retrieved from your DB
          file_url: "some-file-url-from-db",
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
      
      // Add to local state and update in database
      const updatedMessages = [...messages, systemMessage];
      setMessages(updatedMessages);
      
      await updateChatConversation(chatId, updatedMessages, user.id);
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
    
    // Add to local state and update in database
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      await updateChatConversation(chatId, updatedMessages, user.id);
      
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
      <div className="flex-1 overflow-auto">
        {/* Chat messages */}
        <div className="flex items-center justify-center pt-4">
          <div className="w-full md:w-1/2 max-w-2xl">
            <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-15rem)] pr-4">
              <div className="space-y-4 p-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      message.role === "user" ? "bg-blue-100 ml-12" : "bg-gray-100 mr-12"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Visualization (if any) */}
        {visualization && (
          <div className="flex justify-center p-4">
            <ChartBlock spec={visualization} />
          </div>
        )}

        {/* Debug / Additional UI */}
        {messages.length > 0 && (
          <div className="mx-auto max-w-4xl px-4 pb-4">
            {/* DebugPanel removed */}
          </div>
        )}

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

      {/* Chat input */}
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
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
    </div>
  );
}
