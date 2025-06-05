"use client";

import { useState } from "react";
import { 
  Trash2, 
  Settings, 
  GripVertical, 
  Maximize2, 
  Minimize2,
  Edit3,
  Save,
  X
} from "lucide-react";
import { Widget as WidgetType, WIDGET_SIZES, WidgetSize } from "@/types/dashboard-types";
import { TextBlock } from "./widgets/TextBlock";
import { ChartWidget } from "./widgets/ChartWidget";
import { KPICard } from "./widgets/KPICard";
import { TableWidget } from "./widgets/TableWidget";

interface WidgetProps {
  widget: WidgetType;
  onDelete: (widgetId: string) => void;
  onResize: (widgetId: string, newSize: { width: number; height: number }) => void;
  onUpdate: (widgetId: string, updates: Partial<WidgetType>) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export function Widget({ 
  widget, 
  onDelete, 
  onResize, 
  onUpdate, 
  dragHandleProps, 
  isDragging 
}: WidgetProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showResizeMenu, setShowResizeMenu] = useState(false);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this widget?")) {
      onDelete(widget.id);
    }
  };

  const handleResize = (size: WidgetSize) => {
    const dimensions = WIDGET_SIZES[size];
    onResize(widget.id, dimensions);
    setShowResizeMenu(false);
  };

  const getCurrentSize = (): WidgetSize => {
    const entry = Object.entries(WIDGET_SIZES).find(
      ([_, dimensions]) => 
        dimensions.width === widget.size.width && 
        dimensions.height === widget.size.height
    );
    return (entry?.[0] as WidgetSize) || "1x1";
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case "text":
        return (
          <TextBlock
            widget={widget}
            onUpdate={onUpdate}
            isEditing={isEditing}
            onEditToggle={() => setIsEditing(!isEditing)}
          />
        );
      case "chart":
        return (
          <ChartWidget
            widget={widget}
            onUpdate={onUpdate}
            isEditing={isEditing}
            onEditToggle={() => setIsEditing(!isEditing)}
          />
        );
      case "kpi":
        return (
          <KPICard
            widget={widget}
            onUpdate={onUpdate}
            isEditing={isEditing}
            onEditToggle={() => setIsEditing(!isEditing)}
          />
        );
      case "table":
        return (
          <TableWidget
            widget={widget}
            onUpdate={onUpdate}
            isEditing={isEditing}
            onEditToggle={() => setIsEditing(!isEditing)}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            Unknown widget type: {widget.type}
          </div>
        );
    }
  };

  return (
    <div
      className={`
        relative group h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
        rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden
        ${isDragging ? "ring-2 ring-blue-500 ring-opacity-50" : ""}
        ${isEditing ? "ring-2 ring-green-500 ring-opacity-50" : ""}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowResizeMenu(false);
      }}
    >
      {/* Toolbar */}
      <div
        className={`
          absolute top-2 right-2 z-10 flex items-center gap-1 bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700 rounded-md shadow-sm
          transition-all duration-200
          ${isHovered || isEditing ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        {/* Drag Handle */}
        <button
          {...dragHandleProps}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing"
          title="Drag to move"
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </button>

        {/* Edit Toggle */}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`
            p-1 rounded transition-colors
            ${isEditing 
              ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400" 
              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            }
          `}
          title={isEditing ? "Save changes" : "Edit widget"}
        >
          {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
        </button>

        {/* Resize Menu */}
        <div className="relative">
          <button
            onClick={() => setShowResizeMenu(!showResizeMenu)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
            title="Resize widget"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {showResizeMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[120px] z-20">
              {Object.entries(WIDGET_SIZES).map(([size, dimensions]) => (
                <button
                  key={size}
                  onClick={() => handleResize(size as WidgetSize)}
                  className={`
                    w-full text-left px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                    ${getCurrentSize() === size ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}
                  `}
                >
                  {size} ({dimensions.width}×{dimensions.height})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-gray-500 hover:text-red-600 dark:hover:text-red-400"
          title="Delete widget"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Widget Content */}
      <div className="h-full p-4">
        {renderWidgetContent()}
      </div>

      {/* Edit Mode Indicator */}
      {isEditing && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-md">
          Editing
        </div>
      )}
    </div>
  );
}