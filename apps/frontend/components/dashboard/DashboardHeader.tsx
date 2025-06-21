"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  ChevronDown,
  Table as TableIcon,
  Download,
  ExternalLink,
  Info,
  Send,
  SquareArrowUpRight,
  Share2,
  Forward,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalClose,
} from "@/components/ui/responsive-modal";
import { CsvDataPreview } from "./CsvDataPreview";
import { FileInfoModal } from "./FileInfoModal";
import { Button } from "../ui/button";

export function DashboardHeader({
  dashboardTitle,
}: {
  dashboardTitle?: string;
}) {
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">
            {dashboardTitle || "New dashboard"}
          </h1>
        </div>
        <Button className="bg-primary h-fit py-1 px-4 text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm font-medium gap-2">
          Publish
          <Forward className="size-4" />
        </Button>
      </div>
    </header>
  );
}
