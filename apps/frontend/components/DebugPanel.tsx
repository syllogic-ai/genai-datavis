"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BugPlay, ChevronDown, ChevronUp } from "lucide-react";
import { API_URL } from "@/app/lib/env";

export function DebugPanel({ sessionId = "default" }: { sessionId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [backendHistory, setBackendHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBackendHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/conversation_history?session_id=${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }
      
      const data = await response.json();
      setBackendHistory(data);
    } catch (err) {
      console.error("Error fetching backend history:", err);
      setError(err instanceof Error ? err.message : "Failed to load backend conversation history");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="border border-amber-300 rounded-lg bg-amber-50 shadow-sm"
      >
        <div className="flex items-center justify-between p-3 border-b border-amber-300">
          <div className="flex items-center gap-2">
            <BugPlay className="h-5 w-5 text-amber-700" />
            <h2 className="text-base font-medium text-amber-900">Debug: Backend Conversation History</h2>
            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              dev tool
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchBackendHistory}
              disabled={isLoading}
              className="text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              {isLoading ? "Loading..." : "Fetch Backend History"}
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-amber-700" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-700" />
                )}
                <span className="sr-only">Toggle debug panel</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {backendHistory ? (
              <ScrollArea className="h-[300px] rounded-md border p-4 bg-white">
                <div className="space-y-4">
                  <div className="text-sm font-medium">Conversation History from Backend:</div>
                  
                  <div className="space-y-2">
                    {backendHistory.conversation_history?.map((entry: any, index: number) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-md text-sm ${
                          entry.role === 'user' 
                            ? 'bg-amber-100 border-l-4 border-amber-500' 
                            : 'bg-gray-100 border-l-4 border-gray-500'
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold">
                            {entry.role === 'user' ? 'User' : 'System'}
                          </span>
                          {entry.timestamp && (
                            <span className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line">{entry.content}</p>
                      </div>
                    ))}

                    {(!backendHistory.conversation_history || backendHistory.conversation_history.length === 0) && (
                      <div className="p-3 bg-gray-100 rounded-md text-sm">
                        No conversation history found in backend
                      </div>
                    )}
                  </div>

                  {backendHistory.analysis_history && backendHistory.analysis_history.length > 0 && (
                    <div className="mt-6">
                      <div className="text-sm font-medium mb-2">Analysis History:</div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <pre className="text-xs overflow-auto max-h-[150px]">
                          {JSON.stringify(backendHistory.analysis_history, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : !isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Click "Fetch Backend History" to see the conversation history maintained on the server
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                Loading...
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
} 