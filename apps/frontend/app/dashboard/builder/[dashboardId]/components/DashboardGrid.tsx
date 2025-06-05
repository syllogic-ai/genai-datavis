"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Widget as WidgetType } from "@/types/enhanced-dashboard-types";
import { Dashboard } from "@/types/dashboard-types";
import { Widget } from "./Widget";

interface DashboardGridProps {
  dashboard: Dashboard;
  onDeleteWidget: (widgetId: string) => void;
  onResizeWidget: (widgetId: string, newSize: { width: number; height: number }) => void;
  onUpdateWidget: (widgetId: string, updates: Partial<WidgetType>) => void;
}

interface GridCellProps {
  x: number;
  y: number;
  isOccupied: boolean;
  widget?: WidgetType;
  onDeleteWidget: (widgetId: string) => void;
  onResizeWidget: (widgetId: string, newSize: { width: number; height: number }) => void;
  onUpdateWidget: (widgetId: string, updates: Partial<WidgetType>) => void;
}

function GridCell({ 
  x, 
  y, 
  isOccupied, 
  widget, 
  onDeleteWidget, 
  onResizeWidget, 
  onUpdateWidget 
}: GridCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${x}-${y}`,
    data: {
      type: "grid-cell",
      position: { x, y },
    },
    disabled: isOccupied,
  });

  if (widget) {
    return (
      <div
        ref={setNodeRef}
        className="relative"
        style={{
          gridColumn: `${x + 1} / span ${widget.size.width}`,
          gridRow: `${y + 1} / span ${widget.size.height}`,
        }}
      >
        <SortableWidget
          widget={widget}
          onDelete={onDeleteWidget}
          onResize={onResizeWidget}
          onUpdate={onUpdateWidget}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 border-dashed transition-all duration-200 rounded-lg
        ${
          isOver
            ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
        }
        ${isOccupied ? "opacity-30" : ""}
      `}
      style={{
        gridColumn: `${x + 1}`,
        gridRow: `${y + 1}`,
        minHeight: "100px",
      }}
    >
      {isOver && (
        <div className="flex items-center justify-center h-full">
          <div className="text-blue-500 dark:text-blue-400 text-sm font-medium">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
}

interface SortableWidgetProps {
  widget: WidgetType;
  onDelete: (widgetId: string) => void;
  onResize: (widgetId: string, newSize: { width: number; height: number }) => void;
  onUpdate: (widgetId: string, updates: Partial<WidgetType>) => void;
}

function SortableWidget({ widget, onDelete, onResize, onUpdate }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    data: {
      type: "widget",
      widget,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <Widget
        widget={widget}
        onDelete={onDelete}
        onResize={onResize}
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

export function DashboardGrid({ 
  dashboard, 
  onDeleteWidget, 
  onResizeWidget, 
  onUpdateWidget 
}: DashboardGridProps) {
  const { columns, rows, gap } = dashboard.layout;

  // Create a map of occupied positions
  const occupiedPositions = new Set<string>();
  dashboard.widgets.forEach(widget => {
    for (let x = widget.position.x; x < widget.position.x + widget.size.width; x++) {
      for (let y = widget.position.y; y < widget.position.y + widget.size.height; y++) {
        occupiedPositions.add(`${x}-${y}`);
      }
    }
  });

  // Create grid cells
  const gridCells = [];
  
  // First, add all widgets
  dashboard.widgets.forEach(widget => {
    gridCells.push(
      <GridCell
        key={widget.id}
        x={widget.position.x}
        y={widget.position.y}
        isOccupied={true}
        widget={widget}
        onDeleteWidget={onDeleteWidget}
        onResizeWidget={onResizeWidget}
        onUpdateWidget={onUpdateWidget}
      />
    );
  });

  // Then, add empty cells for drop zones
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const positionKey = `${x}-${y}`;
      if (!occupiedPositions.has(positionKey)) {
        gridCells.push(
          <GridCell
            key={positionKey}
            x={x}
            y={y}
            isOccupied={false}
            onDeleteWidget={onDeleteWidget}
            onResizeWidget={onResizeWidget}
            onUpdateWidget={onUpdateWidget}
          />
        );
      }
    }
  }

  return (
    <div className="w-full h-full p-4">
      <div
        className="grid w-full h-full auto-rows-fr"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: `${gap}px`,
          minHeight: "600px",
        }}
      >
        {gridCells}
      </div>

      {/* Empty state */}
      {dashboard.widgets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Start Building Your Dashboard
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Drag widgets from the library below to create your custom dashboard.
              You can resize, move, and configure each widget to fit your needs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}