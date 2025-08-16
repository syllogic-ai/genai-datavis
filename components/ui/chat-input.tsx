"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Zod schema for input validation
const formSchema = z.object({
  message: z.string().min(1, {
    message: "Please enter a message.",
  }),
});

export type ChatInputProps = {
  onSendMessage: (message: string) => Promise<void> | void;
  placeholder?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  buttonIcon?: React.ReactNode;
  loadingIndicator?: React.ReactNode;
  className?: string;
};

export function ChatInput({
  onSendMessage,
  placeholder = "Ask a question about your data...",
  isLoading = false,
  isDisabled = false,
  className = "",
  buttonIcon,
  loadingIndicator,
}: ChatInputProps) {
  // Initialize form with RHF + Zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSendMessage(values.message);
    // Reset form after submission
    form.reset({ message: "" });
  };

  // Default button icon if none is provided
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

  // Default loading indicator
  const defaultLoadingIndicator = <span className="mx-1">...</span>;

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative rounded-xl border border-gray-300/20 overflow-hidden">
          <Textarea
            {...form.register("message")}
            placeholder={placeholder}
            className="min-h-24 py-4 pb-14 resize-none rounded-xl"
            disabled={isLoading || isDisabled}
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
              disabled={isLoading || isDisabled}
            >
              {isLoading
                ? loadingIndicator || defaultLoadingIndicator
                : buttonIcon || defaultButtonIcon}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 