"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagItem, TagSelector } from "@/components/ui/tags/tag-selector";
import { Textarea } from "@/components/ui/textarea";
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
  const [selectedItems, setSelectedItems] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  // Default button icon if none is provided
  const defaultButtonIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className="w-5 h-5 group-hover:translate-x-0.5 transition-all duration-300"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0-7.5 7.5M21 12H3"
      />
    </svg>
  );

  // Default loading indicator
  const defaultLoadingIndicator = <span className="mx-1">...</span>;

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-background">
      <Card className="h-fit w-[500px] flex flex-col gap-0">
        <CardHeader className="ml-2 pb-0 mb-0">
          <TagSelector
            availableItems={sampleItems}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            triggerLabel="Add Context"
            searchPlaceholder="Search widgets..."
            emptyStateMessage="No widgets found"
          />
        </CardHeader>
        <CardContent className="py-0 my-0">
        <Textarea
           className="placeholder:text-primary/60 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
           placeholder="Ask a question about your data..."
           />
        </CardContent>
        <CardFooter className="w-full flex justify-between">
          <div className="flex max-w-xs h-fit py-1">
          <Select>
            <SelectTrigger className="h-fit py-1 text-xs border bg-secondary hover:bg-primary/3">
              <SelectValue placeholder="Widget" />
            </SelectTrigger>
            <SelectContent className="h-fit py-1 text-xs border bg-secondary hover:bg-secondary">
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="line">Line</SelectItem>
            </SelectContent>
          </Select>
          </div>
          <Button
            type="submit"
            size="icon"
            className="rounded-full group"
            disabled={isLoading || isDisabled}
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => {
                setIsLoading(false);
              }, 1000);
            }}
          >
            {isLoading ? defaultLoadingIndicator : defaultButtonIcon}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
