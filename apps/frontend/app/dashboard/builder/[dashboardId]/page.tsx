"use client";

import { useState, useEffect } from "react";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { DashboardGrid } from "./components/DashboardGrid";
import { WidgetLibrary } from "./components/WidgetLibrary";
import { Widget as WidgetComponent } from "./components/Widget";
import { 
  Widget, 
  Dashboard, 
  DraggedWidget, 
  WIDGET_LIBRARY, 
  WIDGET_SIZES 
} from "@/types/dashboard-types";
import { v4 as uuidv4 } from "uuid";

interface DashboardPageProps {
  params: {
    dashboardId: string;
  };
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const [dashboard, setDashboard] = useState<Dashboard>({
    id: params.dashboardId,
    name: "My Dashboard",
    description: "A custom dashboard",
    widgets: [],
    layout: {
      columns: 12,
      rows: 8,
      gap: 16,
    },
    settings: {
      theme: "light",
      gridSnap: true,
      autoSave: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [activeWidget, setActiveWidget] = useState<DraggedWidget | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    if (active.data.current?.type === "widget-library") {
      setActiveWidget({
        type: active.data.current.widgetType,
        isNew: true,
      });
    } else {
      const widget = dashboard.widgets.find(w => w.id === active.id);
      if (widget) {
        setActiveWidget({
          type: widget.type,
          id: widget.id,
          isNew: false,
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !activeWidget) {
      setActiveWidget(null);
      return;
    }

    if (over.data.current?.type === "grid-cell") {
      const position = over.data.current.position;
      
      if (activeWidget.isNew) {
        // Create new widget
        const libraryItem = WIDGET_LIBRARY.find(item => item.type === activeWidget.type);
        if (libraryItem) {
          const newWidget: Widget = {
            id: uuidv4(),
            type: activeWidget.type,
            position,
            size: WIDGET_SIZES[libraryItem.defaultSize],
            config: { ...libraryItem.defaultConfig },
            data: null,
          };

          setDashboard(prev => ({
            ...prev,
            widgets: [...prev.widgets, newWidget],
            updatedAt: new Date(),
          }));
        }
      } else if (activeWidget.id) {
        // Move existing widget
        setDashboard(prev => ({
          ...prev,
          widgets: prev.widgets.map(widget =>
            widget.id === activeWidget.id
              ? { ...widget, position }
              : widget
          ),
          updatedAt: new Date(),
        }));
      }
    }

    setActiveWidget(null);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId),
      updatedAt: new Date(),
    }));
  };

  const handleResizeWidget = (widgetId: string, newSize: { width: number; height: number }) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, size: newSize }
          : widget
      ),
      updatedAt: new Date(),
    }));
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<Widget>) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, ...updates }
          : widget
      ),
      updatedAt: new Date(),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Header */}
        <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboard.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dashboard.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isLibraryOpen ? "Hide" : "Show"} Widgets
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <SortableContext 
            items={dashboard.widgets.map(w => w.id)} 
            strategy={rectSortingStrategy}
          >
            <DashboardGrid
              dashboard={dashboard}
              onDeleteWidget={handleDeleteWidget}
              onResizeWidget={handleResizeWidget}
              onUpdateWidget={handleUpdateWidget}
            />
          </SortableContext>
        </div>

        {/* Floating Widget Library */}
        <WidgetLibrary 
          isOpen={isLibraryOpen} 
          onToggle={() => setIsLibraryOpen(!isLibraryOpen)} 
        />

        {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget ? (
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-4 shadow-lg opacity-75">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {WIDGET_LIBRARY.find(item => item.type === activeWidget.type)?.name}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}