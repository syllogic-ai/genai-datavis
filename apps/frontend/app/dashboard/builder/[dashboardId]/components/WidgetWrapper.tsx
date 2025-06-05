"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconTrash } from "@tabler/icons-react";

interface WidgetWrapperProps {
  children: React.ReactNode;
  onDelete: (id: string) => void;
  id: string;
  widgetType?: string;
}

export function WidgetWrapper({ children, onDelete, id, widgetType }: WidgetWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this widget?")) {
      onDelete(id);
    }
  };

  return (
    <div 
      className={`relative group ${
        widgetType === 'text' 
          ? 'h-auto w-full min-h-[60px]' 
          : 'h-full w-full'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleDelete}
            className={`absolute z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors ${
              widgetType === 'text' 
                ? '-top-2 -right-2' 
                : '-top-2 -right-2'
            }`}
          >
            <IconTrash className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}