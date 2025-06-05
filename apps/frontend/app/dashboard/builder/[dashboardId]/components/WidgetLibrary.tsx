"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Table, 
  GripVertical,
  ChevronUp,
  ChevronDown 
} from "lucide-react";
import { WIDGET_LIBRARY, WidgetLibraryItem } from "@/types/dashboard-types";

const iconMap = {
  FileText,
  BarChart3,
  TrendingUp,
  Table,
};

interface WidgetLibraryProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface DraggableWidgetItemProps {
  item: WidgetLibraryItem;
}

function DraggableWidgetItem({ item }: DraggableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `widget-${item.type}`,
    data: {
      type: "widget-library",
      widgetType: item.type,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const IconComponent = iconMap[item.icon as keyof typeof iconMap];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        group relative flex flex-col items-center p-4 bg-white dark:bg-gray-800 
        rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm
        hover:border-blue-300 hover:shadow-md transition-all duration-200
        cursor-grab active:cursor-grabbing select-none
        ${isDragging ? "opacity-50 scale-95" : ""}
      `}
    >
      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-2">
        <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      
      <h3 className="text-sm font-medium text-gray-900 dark:text-white text-center">
        {item.name}
      </h3>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 leading-tight">
        {item.description}
      </p>

      {/* Drag indicator */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

export function WidgetLibrary({ isOpen, onToggle }: WidgetLibraryProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div 
      className={`
        fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50
        transition-all duration-300 ease-in-out
        ${isOpen ? "translate-y-0" : "translate-y-[calc(100%-4rem)]"}
      `}
      style={{
        transform: `translate(${position.x - 50}%, ${position.y}px) ${isOpen ? "translateY(0)" : "translateY(calc(100% - 4rem))"}`,
      }}
    >
      {/* Glass morphism container */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl">
        
        {/* Handle bar */}
        <div 
          className="flex items-center justify-center p-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-t-2xl border-b border-gray-200/30 dark:border-gray-700/30"
          onClick={onToggle}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
        `}>
          <div className="p-6">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Widget Library
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag widgets to your dashboard
              </p>
            </div>

            {/* Widget Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-[320px] max-w-[800px]">
              {WIDGET_LIBRARY.map((item) => (
                <DraggableWidgetItem key={item.type} item={item} />
              ))}
            </div>

            {/* Instructions */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                💡 Drag widgets from here to empty grid cells to add them to your dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}