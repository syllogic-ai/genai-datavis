"use client";

import { ChatInput } from "@/components/dashboard/ChatInput";
import { TagItem } from "@/components/ui/tags/tag-selector";
import { ChartArea } from "lucide-react";
import { useState } from "react";

const sampleItems = [
  { id: "1", label: "Sales metrics", icon: ChartArea, category: "File" },
  { id: "2", label: "Sales German market", icon: ChartArea, category: "File" },
  { id: "3", label: "Sales French market", icon: ChartArea, category: "File" },
  { id: "4", label: "Sales Italian market", icon: ChartArea, category: "File" },
  { id: "5", label: "Sales Spanish market", icon: ChartArea, category: "File" },
  {
    id: "6",
    label: "Sales Portuguese market",
    icon: ChartArea,
    category: "File",
  },
  { id: "7", label: "Sales Dutch market", icon: ChartArea, category: "File" },
  { id: "8", label: "Sales Belgian market", icon: ChartArea, category: "File" },
  {
    id: "9",
    label: "Sales Luxembourg market",
    icon: ChartArea,
    category: "File",
  },
];

export default function TestPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (data: {
    selectedItems: TagItem[];
    message: string;
    widgetType: string;
  }) => {
    console.log("Form submitted:", data);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-background">
      <ChatInput
        availableItems={sampleItems}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
