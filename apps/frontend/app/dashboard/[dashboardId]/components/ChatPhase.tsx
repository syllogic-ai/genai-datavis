"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { FileRecord } from "../hooks/useSetupState";
import { ChatInput } from "@/components/dashboard/ChatInput";


interface ChatPhaseProps {
  dashboardId: string;
  files: FileRecord[];
  onFirstMessage: () => void;
  onBack: () => void;
}

export function ChatPhase({ dashboardId, files, onFirstMessage, onBack }: ChatPhaseProps) {
  const [hasTyped, setHasTyped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    selectedItems: any[];
    message: string;
    widgetType: string;
  }) => {
    if (!data.message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setHasTyped(true);
    
    try {
      // For the progressive flow, we'll simulate processing the message
      // In a real implementation, this would call the analyze API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Mark as having sent first message to transition to full dashboard
      onFirstMessage();
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-1rem)] flex items-center justify-center p-6 bg-transparent">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl mx-auto text-center flex flex-col items-center"
      >
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-start mb-16"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:bg-transparent hover:text-foreground cursor-pointer bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Files
          </Button>
        </motion.div>

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            How can we help you today?
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Ask me anything about your data and I&apos;ll create visualizations for you
          </p>
          
          {/* Data Source Indicator */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              {files.length} file{files.length === 1 ? '' : 's'} connected
            </Badge>
          </div>
        </motion.div>

        {/* Centered Chat Input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative bg-sidebar w-fit rounded-2xl"
        >
          {/* <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-sm p-8 border">
            <div className="space-y-4">
              <Textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (!hasTyped && e.target.value.length > 0) {
                    setHasTyped(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your data..."
                className="border-none shadow-none bg-transparent text-lg placeholder:text-gray-400 resize-none min-h-[120px] focus:ring-0"
                autoFocus
                disabled={isSubmitting}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!message.trim() || isSubmitting}
                  size="lg"
                  className="px-8 py-3 text-base font-medium"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </div>
                  ) : (
                    'Send Message'
                  )}
                </Button>
              </div>
            </div>
          </form> */}

          <ChatInput 
            availableItems={[]}
            onSubmit={handleSubmit}
            messagePlaceholder="Ask me anything about your data..."
            className="border-none shadow-none bg-transparent text-lg placeholder:text-gray-400 resize-none min-h-[120px] focus:ring-0"
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
            showTagSelector={false}
            showWidgetDropdown={false}
          />

          {/* Subtle animation hint */}
          {!hasTyped && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute -bottom-12 left-1/2 transform -translate-x-1/2"
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                />
                <span>Start typing to begin...</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
          <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        </div>
      </motion.div>
    </div>
  );
}