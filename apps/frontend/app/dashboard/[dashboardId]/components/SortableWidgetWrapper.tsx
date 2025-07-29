"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { DragHandle } from "./shared/DragHandle";

interface SortableWidgetWrapperProps {
  children: React.ReactNode;
  onDelete: (id: string) => void;
  id: string;
  widgetType: string;
  isDragging: boolean;
}

export function SortableWidgetWrapper({ 
  children, 
  onDelete, 
  id, 
  widgetType, 
  isDragging
}: SortableWidgetWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout={!isDragging}
      className={`relative w-full group mb-2 ${
        isSortableDragging ? 'z-50' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence>
        {/* Drag handle with drag listeners - positioned in middle for text blocks, top for others */}
        <div
          {...attributes}
          {...listeners}
          className={`absolute z-40 ${
            widgetType === 'text' 
              ? 'top-1/2 -translate-y-1/2 -left-2' 
              : 'top-2 -left-2'
          }`}
        >
          <DragHandle 
            isVisible={!isDragging && isHovered && !showDeleteDialog}
          />
        </div>
        
        {/* Delete button */}
        {(!isDragging && isHovered && !showDeleteDialog) && (
          <motion.button
            key={`delete-${id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleDelete}
            className="absolute -top-4 -right-4 w-9 h-9 md:w-8 md:h-8 bg-background border border-primary/10 z-40 hover:bg-secondary text-primary rounded-full flex items-center justify-center shadow-lg transition-colors touch-manipulation"
            style={{ zIndex: 30 }}
          >
            <IconTrash className="w-4 h-4 text-primary" />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Content wrapper with natural height - no borders for text blocks */}
      <div className={`w-full bg-transparent rounded-lg transition-all ${
        isSortableDragging ? 'opacity-50 scale-[0.98] shadow-lg' : ''
      }`}>
        {children}
      </div>

      {/* Delete confirmation dialog */}
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
    </motion.div>
  );
}