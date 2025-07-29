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
          className={`w-8 h-8 bg-background border border-primary/20 z-40 hover:bg-secondary text-primary rounded-md flex items-center justify-center shadow-md transition-colors cursor-move touch-manipulation ${className}`}
          style={{ zIndex: 30 }}
          title="Drag to reorder"
        >
          <IconGripVertical className="w-5 h-5 text-primary/70" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}