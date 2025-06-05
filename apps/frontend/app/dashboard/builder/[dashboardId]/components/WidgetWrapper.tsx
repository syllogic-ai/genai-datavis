"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { IconTrash } from "@tabler/icons-react";
import { ResizePopup } from "./ResizePopup";
import { getGridSizeFromDimensions, getDimensionsFromSize } from "../utils/gridUtils";

interface WidgetWrapperProps {
  children: React.ReactNode;
  onDelete: (id: string) => void;
  id: string;
  widgetType?: string;
  layout?: { w: number; h: number; x: number; y: number };
  onResize?: (id: string, newSize: { w: number; h: number }) => void;
}

export function WidgetWrapper({ children, onDelete, id, widgetType, layout, onResize }: WidgetWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showResizePopup, setShowResizePopup] = useState(false);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Clear timeout on cleanup
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this widget?")) {
      onDelete(id);
    }
  };

  const currentSize = layout ? getGridSizeFromDimensions(layout.w, layout.h) : 'm';

  const handleSizeSelect = (size: string) => {
    if (onResize && layout) {
      const newDimensions = getDimensionsFromSize(size);
      onResize(id, newDimensions);
    }
    setShowResizePopup(false);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    setIsHovered(true);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setShowResizePopup(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    
    // Only hide popup after a delay if popup is not being hovered
    if (!isPopupHovered) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowResizePopup(false);
      }, 300); // 300ms delay
    }
  };

  const handlePopupMouseEnter = () => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsPopupHovered(true);
  };

  const handlePopupMouseLeave = () => {
    setIsPopupHovered(false);
    
    // Hide popup after a delay if widget is also not being hovered
    if (!isHovered) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowResizePopup(false);
      }, 300); // 300ms delay
    }
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="relative h-full w-full group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <AnimatePresence>
          {/* Delete button */}
          {(isHovered || showResizePopup) && (
            <motion.button
              key={`delete-${id}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleDelete}
              className="absolute -top-2 -right-2 z-20 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              style={{ zIndex: 30 }}
            >
              <IconTrash className="w-3 h-3" />
            </motion.button>
          )}

          {/* Size indicator overlay */}
          {(isHovered || showResizePopup) && (
            <motion.div
              key={`size-indicator-${id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-2 left-2 z-20 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-md shadow-lg backdrop-blur-sm"
            >
              {currentSize.toUpperCase()}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Content wrapper - full size with no padding conflicts */}
        <div className="h-full w-full overflow-hidden">
          {children}
        </div>
      </div>

      {/* Resize popup rendered as portal to appear outside widget boundaries */}
      {isMounted && typeof window !== 'undefined' && createPortal(
        <ResizePopup
          isVisible={showResizePopup}
          position={popupPosition}
          currentSize={currentSize}
          onSizeSelect={handleSizeSelect}
          widgetType={widgetType}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />,
        document.body
      )}
    </>
  );
}