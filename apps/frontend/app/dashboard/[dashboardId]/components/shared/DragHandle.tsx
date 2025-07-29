"use client";

import { motion, AnimatePresence } from "motion/react";
import { IconGripVertical } from "@tabler/icons-react";

interface DragHandleProps {
  isVisible: boolean;
  className?: string;
}

export function DragHandle({ isVisible, className = "" }: DragHandleProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`absolute -top-2 -left-2 w-7 h-7 md:w-6 md:h-6 bg-background border border-primary/20 z-40 hover:bg-secondary text-primary rounded-md flex items-center justify-center shadow-md transition-colors cursor-move touch-manipulation ${className}`}
          style={{ zIndex: 30 }}
          title="Drag to reorder"
        >
          <IconGripVertical className="w-4 h-4 md:w-3 md:h-3 text-primary/70" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}