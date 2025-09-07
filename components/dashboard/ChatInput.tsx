"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagItem, TagSelector } from "@/components/ui/tags/tag-selector";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface ChatInputProps {
  availableItems?: TagItem[];
  onSubmit?: (data: {
    selectedItems: TagItem[];
    message: string;
    widgetType: string;
  }) => void;
  triggerLabel?: string;
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  messagePlaceholder?: string;
  widgetOptions?: { value: string; label: string }[];
  isLoading?: boolean;
  isDisabled?: boolean;
  className?: string;
  showTagSelector?: boolean;
  showWidgetDropdown?: boolean;
}

export function ChatInput({
  availableItems = [],
  onSubmit,
  triggerLabel = "Add Context",
  searchPlaceholder = "Search widgets...",
  emptyStateMessage = "No widgets found",
  messagePlaceholder = "Ask a question about your data...",
  widgetOptions = [
    { value: "bar", label: "Bar" },
    { value: "line", label: "Line" },
  ],
  isLoading = false,
  isDisabled = false,
  className = "",
  showTagSelector = true,
  showWidgetDropdown = true,
}: ChatInputProps) {
  const [selectedItems, setSelectedItems] = useState<TagItem[]>([]);
  const [message, setMessage] = useState("");
  const [widgetType, setWidgetType] = useState("");

  const defaultButtonIcon = (
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
  );

  const defaultLoadingIndicator = <span className="mx-1">...</span>;

  const handleSubmit = () => {
    console.log('ChatInput handleSubmit called:', {
      hasOnSubmit: !!onSubmit,
      message: message.trim(),
      widgetType,
      selectedItems,
      isLoading,
      isDisabled
    });
    
    if (onSubmit && message.trim()) {
      onSubmit({
        selectedItems,
        message,
        widgetType: widgetType || 'chart', // Default to 'chart' if no type selected
      });
      
      // Clear the form after submit
      setMessage('');
      setWidgetType('');
      setSelectedItems([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className={`h-fit w-[500px]  flex flex-col gap-0 ${className}`}>
      {showTagSelector && (
        <CardHeader className="ml-2 pb-0 mb-0 px-2">
          <TagSelector
            availableItems={availableItems}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            triggerLabel={triggerLabel}
            searchPlaceholder={searchPlaceholder}
            emptyStateMessage={emptyStateMessage}
          />
        </CardHeader>
      )}
      <CardContent className="py-0 my-0 px-2">
        <Textarea
          className="placeholder:text-primary/60 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-sidebar! resize-none rows-1"
          placeholder={messagePlaceholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </CardContent>
      <CardFooter className="w-full flex justify-end px-4">
        <Button
          type="submit"
          size="icon"
          className="rounded-lg group h-fit py-1"
          disabled={isLoading || isDisabled || !message.trim()}
          onClick={handleSubmit}
        >
          {isLoading ? defaultLoadingIndicator : defaultButtonIcon}
        </Button>
      </CardFooter>
    </Card>
  );
}