"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconTrash, IconGripVertical } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DragHandle } from "./shared/DragHandle";

interface WidgetWrapperProps {
  children: React.ReactNode;
  onDelete: (id: string) => void;
  id: string;
  widgetType: string;
  layout: any;
  isDragging: boolean;
}

export function WidgetWrapper({ 
  children, 
  onDelete, 
  id, 
  widgetType, 
  layout, 
  isDragging
}: WidgetWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete(id);
    setShowDeleteDialog(false);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
  };

  // Force close dialog on unmount or when dragging starts
  const handleDialogOpenChange = (open: boolean) => {
    if (!open || isDragging) {
      setShowDeleteDialog(false);
    } else {
      setShowDeleteDialog(open);
    }
  };

  const handleMouseEnter = () => {
    if (!isDragging && !showDeleteDialog) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!showDeleteDialog) {
      setIsHovered(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence>
        {/* Widget controls - centered overlay */}
        {(!isDragging && isHovered && !showDeleteDialog) && (
          <motion.div
            key={`controls-${id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
            style={{ zIndex: 30 }}
          >
            {/* Semi-transparent overlay */}
            <div className="absolute inset-0 bg-background/20 backdrop-blur-sm rounded-lg" />
            
            {/* Controls container */}
            <div className="relative flex items-center gap-3 pointer-events-auto">
              {/* Drag handle */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-10 h-10 bg-background border border-primary/20 hover:bg-secondary text-primary rounded-lg flex items-center justify-center shadow-lg transition-colors cursor-move touch-manipulation"
                title="Drag to reorder"
              >
                <IconGripVertical className="w-5 h-5 text-primary/70" />
              </motion.div>
              
              {/* Delete button */}
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={handleDelete}
                className="w-10 h-10 bg-background border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground text-destructive rounded-lg flex items-center justify-center shadow-lg transition-colors touch-manipulation"
                title="Delete widget"
              >
                <IconTrash className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content wrapper - full size with no padding conflicts */}
      <div className="h-full w-full overflow-hidden">
        {children}
      </div>

      {/* Delete confirmation dialog with proper state management */}
      <Dialog open={showDeleteDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={cancelDelete}>
          <DialogHeader>
            <DialogTitle>Delete widget?</DialogTitle>
            <DialogDescription>
              This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}