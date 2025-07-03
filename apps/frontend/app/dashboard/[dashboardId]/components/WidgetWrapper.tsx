"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconTrash } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
        {/* Delete button */}
        {(!isDragging && isHovered && !showDeleteDialog) && (
          <motion.button
            key={`delete-${id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleDelete}
            className="absolute -top-4 -left-4 w-8 h-8 bg-background border border-primary/10 z-40 hover:bg-secondary text-primary rounded-full flex items-center justify-center shadow-lg transition-colors"
            style={{ zIndex: 30 }}
          >
            <IconTrash className="w-4 h-4 text-primary" />
          </motion.button>
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