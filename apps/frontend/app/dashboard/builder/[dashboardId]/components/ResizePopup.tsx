"use client";

import React from "react";

interface ResizePopupProps {
  isVisible: boolean;
  position: { x: number; y: number };
  currentSize: string;
  onSizeSelect: (size: string) => void;
  widgetType?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const sizeOptions = [
  { label: "XS", value: "xs", dimensions: "2×1", description: "Rectangular vertical" },
  { label: "S", value: "s", dimensions: "2×2", description: "Square small" },
  { label: "M", value: "m", dimensions: "4×2", description: "Rectangular horizontal" },
  { label: "L", value: "l", dimensions: "4×4", description: "Square large" },
  { label: "XL", value: "xl", dimensions: "6×4", description: "Extra large" },
];

export function ResizePopup({ isVisible, position, currentSize, onSizeSelect, widgetType, onMouseEnter, onMouseLeave }: ResizePopupProps) {
  if (!isVisible) return null;
  
  // For text widgets, only show height options since width is always full
  const textSizeOptions = [
    { label: "XS", value: "text-xs", dimensions: "12×1", description: "Extra small text block" },
    { label: "S", value: "text-s", dimensions: "12×2", description: "Small text block" },
    { label: "M", value: "text-m", dimensions: "12×3", description: "Medium text block" },
    { label: "L", value: "text-l", dimensions: "12×4", description: "Large text block" },
    { label: "XL", value: "text-xl", dimensions: "12×5", description: "Extra large text block" },
  ];
  
  const optionsToShow = widgetType === 'text' ? textSizeOptions : sizeOptions;

  // Calculate better positioning to stay within viewport
  const popupWidth = 280; // Approximate popup width
  const popupHeight = 80; // Approximate popup height
  const margin = 10;

  const left = Math.max(margin, Math.min(position.x - popupWidth / 2, window.innerWidth - popupWidth - margin));
  const top = Math.max(margin, position.y - popupHeight - 20); // Position above widget

  return (
    <div
      className="fixed pointer-events-auto"
      style={{
        left: left,
        top: top,
        zIndex: 9999, // Very high z-index to appear above everything
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-3 backdrop-blur-sm">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center font-medium">
          Resize Widget
        </div>
        <div className="flex items-center gap-2">
          {optionsToShow.map((option) => (
            <button
              key={option.value}
              onClick={() => onSizeSelect(option.value)}
              className={`
                px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 min-w-[40px]
                hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105
                ${currentSize === option.value
                  ? "bg-blue-500 text-white shadow-md ring-2 ring-blue-300"
                  : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                }
              `}
              title={`${option.dimensions} - ${option.description}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {/* Arrow pointing to widget - only show if there's space */}
        {position.y > popupHeight + 40 && (
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2"
            style={{ left: `${Math.min(Math.max(20, position.x - left), popupWidth - 20)}px` }}
          >
            <div className="w-4 h-4 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45 -mt-2"></div>
          </div>
        )}
      </div>
    </div>
  );
}