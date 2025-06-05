"use client";

import { useState, useRef, useEffect } from "react";
import { Widget } from "@/types/dashboard-types";

interface TextBlockProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function TextBlock({ widget, onUpdate, isEditing, onEditToggle }: TextBlockProps) {
  const [content, setContent] = useState(widget.config.content || "");
  const [fontSize, setFontSize] = useState(widget.config.fontSize || "medium");
  const [alignment, setAlignment] = useState(widget.config.alignment || "left");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onUpdate(widget.id, {
      config: {
        ...widget.config,
        content,
        fontSize,
        alignment,
      },
    });
    onEditToggle();
  };

  const handleCancel = () => {
    setContent(widget.config.content || "");
    setFontSize(widget.config.fontSize || "medium");
    setAlignment(widget.config.alignment || "left");
    onEditToggle();
  };

  const fontSizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
    xlarge: "text-xl",
  };

  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="xlarge">X-Large</option>
          </select>

          <select
            value={alignment}
            onChange={(e) => setAlignment(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>

          <div className="flex gap-1 ml-auto">
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your text here..."
          className={`
            flex-1 w-full resize-none border-none outline-none bg-transparent
            ${fontSizeClasses[fontSize as keyof typeof fontSizeClasses]}
            ${alignmentClasses[alignment as keyof typeof alignmentClasses]}
            text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
          `}
        />
      </div>
    );
  }

  const displayContent = widget.config.content || "Click edit to add text...";

  return (
    <div className="h-full flex items-center justify-center">
      {displayContent ? (
        <div
          className={`
            w-full h-full flex items-center justify-center p-2
            ${fontSizeClasses[widget.config.fontSize as keyof typeof fontSizeClasses] || "text-base"}
            ${alignmentClasses[widget.config.alignment as keyof typeof alignmentClasses] || "text-left"}
            text-gray-900 dark:text-white whitespace-pre-wrap
          `}
        >
          {displayContent}
        </div>
      ) : (
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-2xl mb-2">📝</div>
          <p className="text-sm">Click edit to add text</p>
        </div>
      )}
    </div>
  );
}