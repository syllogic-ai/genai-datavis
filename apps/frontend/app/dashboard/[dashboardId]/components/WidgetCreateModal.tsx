"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Plus, X } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartBlock } from "@/components/blocks/ChartBlock";
import { ChatInput } from "@/components/ui/chat-input";
import { ChartMessage as ChartMessageComponent } from "@/components/dashboard/ChartMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ChatMessage, ChartMessage } from "@/app/lib/types";
import type { ChartSpec } from "@/types/chart-types";

interface WidgetCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
}

const visual: ChartSpec = {
  data: [
    { total_cost: 0.001564, api_request: "/agentic_flow/master_query" },
    { total_cost: 0.000162, api_request: "/visualize/type" },
    { total_cost: 0.002064, api_request: "/visualize/config" },
    { total_cost: 0.000392, api_request: "/agentic_flow/feedback_query" },
    { total_cost: 0.000886, api_request: "/agentic_flow/response_query" },
  ],
  title: "Total Cost of Unique API Requests",
  lineType: "monotone",
  chartType: "bar",
  chartConfig: { total_cost: { color: "#4f46e5", label: "Total Cost" } },
  description:
    "This chart displays the summed total cost for each unique API request, providing insights into the cost distribution across different requests.",
  xAxisConfig: { dataKey: "api_request" },
};

export function WidgetCreateModal({
  isOpen,
  onClose,
  fileName,
}: WidgetCreateModalProps) {
  // States - similar to the chat page
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visualization, setVisualization] = useState<ChartSpec | null>(visual);
  const [chartMessages, setChartMessages] = useState<ChartMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Handle sending a message (placeholder - no API calls as requested)
  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;

    setIsChatLoading(true);
    setError(null);

    // Add user message to local state
    const userMessage: ChatMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate processing
    setTimeout(() => {
      const systemMessage: ChatMessage = {
        role: "system",
        content:
          "This is a placeholder response. API integration will be added later.",
      };
      setMessages((prev) => [...prev, systemMessage]);
      setIsChatLoading(false);
    }, 1000);
  };

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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setVisualization(null);
      setChartMessages([]);
      setError(null);
      setIsChatLoading(false);
      setAnalyzing(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[75vw] h-[80vh] p-0 gap-0 ">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-base font-semibold">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Chat</span>
            <ChevronRight className="w-4 h-4" />
            <span>Widget Creation</span>
          </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Main content container with side-by-side layout */}
          <div className="flex h-full">
            {/* Chat column - messages and input */}
            <div
              className={`flex flex-col transition-all duration-300 ease-in-out ${
                visualization ? "w-1/2" : "w-full"
              }`}
            >
              {/* Chat messages */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea
                  ref={scrollAreaRef}
                  className="h-[calc(90vh-12rem)] w-full"
                >
                  <div className="space-y-4 p-6">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <p className="text-lg font-medium">
                          Start a conversation to create your widget
                        </p>
                        <p className="text-sm mt-2 opacity-80">
                          Ask questions about your data to generate
                          visualizations
                        </p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div
                          key={index}
                          className={`px-4 py-3 ${
                            message.role === "user"
                              ? "bg-secondary text-primary ml-12 rounded-xl shadow-sm border border-gray-300/20"
                              : message.role === "system"
                              ? "bg-muted/50 rounded-lg"
                              : ""
                          }`}
                        >
                          {message.role === "chart" ? (
                            <ChartMessageComponent
                              message={
                                chartMessages.find(
                                  (chart) => chart.id === message.content
                                ) || {
                                  id: message.content,
                                  title: "Chart",
                                  type: "unknown",
                                  description: "Chart not found",
                                  icon: "",
                                }
                              }
                              fileId=""
                              setVisualization={setVisualization}
                            />
                          ) : (
                            <p className="whitespace-pre-line">
                              {message.content}
                            </p>
                          )}
                        </div>
                      ))
                    )}

                    {/* Loading indicator */}
                    {(isChatLoading || analyzing) && (
                      <div className="px-4 py-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">
                            {analyzing ? "Analyzing data..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat input - made more prominent */}
              <div className="p-6">
                <div className="w-full">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    isLoading={isChatLoading || analyzing}
                    isDisabled={isChatLoading || analyzing}
                    placeholder="Ask a question about your data to create a widget..."
                  />
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="px-6 pb-4">
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                    {error}
                  </div>
                </div>
              )}
            </div>

            {/* Visualization column - right side */}
            <div
              className={`transition-all duration-300 ease-in-out border-l ${
                visualization
                  ? "w-1/2 opacity-100"
                  : "w-0 opacity-0 overflow-hidden"
              }`}
            >
              {visualization && (
                <div className="h-full flex flex-col">
                  {/* Chart display */}
                  <div className="flex-1 p-6 overflow-auto">
                    <ChartBlock spec={visualization} />
                  </div>
                </div>
              )}
            </div>
          </div>
         
        </div>
      </DialogContent>
    </Dialog>
  );
}
