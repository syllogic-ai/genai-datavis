"use client";

import React from "react";
import { motion } from "motion/react";

interface ResizePopupProps {
  isVisible: boolean;
  position: { x: number; y: number };
  currentSize: string;
  onSizeSelect: (size: string) => void;
  widgetType?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// Chart and Table size options
const chartTableSizeOptions = [
  { label: "S", value: "chart-s", dimensions: "4×2", description: "Small" },
  { label: "M", value: "chart-m", dimensions: "4×4", description: "Medium" },
  { label: "L", value: "chart-l", dimensions: "6×4", description: "Large" },
  { label: "XL", value: "chart-xl", dimensions: "8×4", description: "Extra Large" },
];

// KPI size options (only one option)
const kpiSizeOptions = [
  { label: "Standard", value: "kpi", dimensions: "4×2", description: "Standard KPI size" },
];

// Text size options
const textSizeOptions = [
  { label: "XS", value: "text-xs", dimensions: "12×0.5", description: "Extra small text block" },
  { label: "S", value: "text-s", dimensions: "12×1", description: "Small text block" },
  { label: "M", value: "text-m", dimensions: "12×1.5", description: "Medium text block" },
];

export function ResizePopup({ isVisible, position, currentSize, onSizeSelect, widgetType, onMouseEnter, onMouseLeave }: ResizePopupProps) {
  if (!isVisible) return null;
  
  // Choose options based on widget type
  let optionsToShow;
  if (widgetType === 'text') {
    optionsToShow = textSizeOptions;
  } else if (widgetType === 'kpi') {
    optionsToShow = kpiSizeOptions;
  } else {
    // Charts and tables
    optionsToShow = chartTableSizeOptions;
  }

  // Calculate positioning to appear below the widget
  const popupWidth = 320;
  const popupHeight = 100;
  const margin = 20;

  const left = Math.max(margin, Math.min(position.x - popupWidth / 2, window.innerWidth - popupWidth - margin));
  const top = Math.min(window.innerHeight - popupHeight - margin, position.y - 10); // Position below widget

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed pointer-events-auto"
      style={{
        left: left,
        top: top,
        zIndex: 9999,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Main popup container */}
      <div className="relative">


        {/* Popup body */}
        <div className="bg-primary rounded-lg shadow-2xl border border-gray-100 dark:border-gray-800 p-2 backdrop-blur-xl">


          {/* Size options */}
          <div className="flex items-center gap-1">
            {optionsToShow.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSizeSelect(option.value)}
                className={`
                  relative px-1 py-1 rounded-sm transition-all duration-200 font-medium text-sm min-w-[40px]
                  border-1 backdrop-blur-sm
                  ${currentSize === option.value
                    ? "bg-background text-primary border-primary shadow-lg shadow-primary/25"
                    : "bg-transparent  text-primary-foreground "
                  }
                `}
                title={`${option.dimensions} - ${option.description}`}
              >
                <span className="block font-thin">{option.label}</span>
                {/* <span className="block text-xs opacity-75 mt-0.5">
                  {option.dimensions}
                </span> */}
                

              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}