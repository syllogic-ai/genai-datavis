"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { IconTrash } from "@tabler/icons-react";
import { getGridSizeFromDimensions } from "../utils/gridUtils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WidgetWrapperProps {
  children: React.ReactNode;
  onDelete: (id: string) => void;
  id: string;
  widgetType?: string;
  layout?: { w: number; h: number; x: number; y: number };
  onResize?: (id: string, newSize: { w: number; h: number }) => void;
  onShowPopup: (widgetId: string, position: { x: number; y: number }, currentSize: string, widgetType: string) => void;
  onHidePopup: () => void;
  isPopupActive: boolean;
  isDragging: boolean;
}

export function WidgetWrapper({ 
  children, 
  onDelete, 
  id, 
  widgetType, 
  layout, 
  onResize,
  onShowPopup,
  onHidePopup,
  isPopupActive,
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

  const currentSize = layout ? getGridSizeFromDimensions(layout.w, layout.h, widgetType) : 'chart-s';

  const handleMouseEnter = () => {
    if (!isDragging) {
      setIsHovered(true);
      if (containerRef.current && widgetType) {
        const rect = containerRef.current.getBoundingClientRect();
        onShowPopup(id, {
          x: rect.left + rect.width / 2,
          y: rect.bottom // Use bottom instead of top for below positioning
        }, currentSize, widgetType);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHidePopup();
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
        {(!isDragging && isHovered) && (
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

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
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