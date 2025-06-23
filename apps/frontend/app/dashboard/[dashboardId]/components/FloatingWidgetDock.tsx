"use client";

import { useState } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconFileText,
  IconChartBar,
  IconDashboard,
  IconTable,
} from "@tabler/icons-react";
import { WidgetTypeConfig } from "@/types/enhanced-dashboard-types";
import { WidgetCreateModal } from "./WidgetCreateModal";

interface FloatingWidgetDockProps {
  onAddWidget: (type: string) => void;
  fileId: string | null;
}

export function FloatingWidgetDock({ onAddWidget, fileId }: FloatingWidgetDockProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState<string | null>(null);

  const widgetItems: WidgetTypeConfig[] = [
    {
      type: "text",
      title: "Text Block",
      icon: <IconFileText className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      defaultLayout: { w: 12, h: 2 }, // Full width
      defaultConfig: {
        content: "",
      },
    },
    {
      type: "chart", 
      title: "Chart",
      icon: <IconChartBar className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      defaultLayout: { w: 3, h: 3 },
      defaultConfig: {
        chartType: "bar",
        title: "New Chart",
        description: "",
      },
    },
    {
      type: "kpi",
      title: "KPI Card",
      icon: <IconDashboard className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      defaultLayout: { w: 2, h: 2 },
      defaultConfig: {
        title: "KPI",
        value: 0,
        change: 0,
        changeDirection: "flat",
      },
    },
    {
      type: "table",
      title: "Table",
      icon: <IconTable className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      defaultLayout: { w: 4, h: 3 },
      defaultConfig: {
        title: "Data Table",
        showHeader: true,
        sortable: true,
        filterable: true,
      },
    },
  ];

  const handleWidgetClick = (widgetType: string) => {
    if (widgetType === "text") {
      // For text blocks, use the existing onAddWidget function directly
      onAddWidget(widgetType);
    } else {
      // For other widget types, open the modal
      setSelectedWidgetType(widgetType);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWidgetType(null);
  };

  const dockItems = widgetItems.map(widget => ({
    title: widget.title,
    icon: widget.icon,
    onClick: () => handleWidgetClick(widget.type),
  }));

  return (
    <>
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      <WidgetCreateModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        fileId={fileId}
        widgetType={selectedWidgetType}
      />
    </>
  );
}