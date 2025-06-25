"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  disabled: boolean;
  loading?: boolean;
  placeholder?: string;
  validationMessage?: string;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSendMessage,
  disabled,
  loading = false,
  placeholder = "Ask a question about your data...",
  validationMessage,
  className,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const canSubmit = value.trim() && !disabled && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSendMessage(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
      e.preventDefault();
      onSendMessage(value.trim());
    }
  };

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className={cn("sticky bottom-0 bg-background border-t", className)}>
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Select a widget type to enable chat" : placeholder}
              disabled={disabled || loading}
              className={cn(
                "min-h-[44px] max-h-[120px] resize-none border-2 transition-all",
                "focus:border-primary focus:ring-1 focus:ring-primary",
                disabled && "cursor-not-allowed opacity-50"
              )}
              rows={1}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!canSubmit}
            className={cn(
              "h-11 w-11 rounded-full shrink-0 transition-all",
              "hover:scale-105 active:scale-95",
              canSubmit ? "bg-primary hover:bg-primary/90" : "bg-muted"
            )}
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Validation Message */}
        {validationMessage && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <div className="h-1 w-1 bg-muted-foreground rounded-full" />
            {validationMessage}
          </div>
        )}
        
        {/* Helper Text */}
        {!disabled && !validationMessage && (
          <div className="mt-2 text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </div>
        )}
      </form>
    </div>
  );
}