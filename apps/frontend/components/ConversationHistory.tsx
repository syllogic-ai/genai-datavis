"use client";

import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Type for chat message
type ChatMessage = {
  role: 'user' | 'system';
  content: string;
};

interface ConversationHistoryProps {
  messages: ChatMessage[];
}

export function ConversationHistory({ messages }: ConversationHistoryProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="border rounded-lg bg-white shadow-sm"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-medium">Conversation History</h2>
            <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {messages.length} messages
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle conversation history</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <ScrollArea className="h-[250px] p-4">
                <div className="space-y-3">
                  {messages
                    .filter(message => {
                      // Filter out invalid messages
                      if (!message.content || typeof message.content !== 'string' || message.content.trim() === '') return false;
                      // Check if message is just a UUID
                      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                      if (uuidRegex.test(message.content.trim())) return false;
                      return true;
                    })
                    .map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-100 ml-8'
                          : 'bg-gray-100 mr-8'
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-1 font-medium">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </div>
                      <p className="whitespace-pre-line text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
} 