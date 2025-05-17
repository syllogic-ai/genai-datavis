"use client";

import * as React from "react";
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/dashboard/NavMain";
import { Chat } from "@/db/schema";
import { SidebarChatList } from "./SidebarChatList";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  chats?: Chat[];
  currentChatId?: string;
}

export function AppSidebar({
  chats,
  currentChatId,
  ...props
}: AppSidebarProps) {
  // If currentChatId is not provided, try to extract it from the pathname
  const pathname = usePathname();
  const activeChatId =
    currentChatId ||
    (pathname?.includes("/dashboard/c/")
      ? pathname.split("/dashboard/c/")[1]
      : undefined);

  return (
    <Sidebar collapsible="offcanvas" {...props} className="bg-sidebar-background">
      <SidebarHeader className="bg-sidebar-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">GenAI DataVis</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar-background hide-scrollbar">
        <NavMain items={[]} chats={chats} currentChatId={activeChatId} />
      </SidebarContent>
      <SidebarFooter className="bg-sidebar-background">
        {/* Add upgrade or usage button here */}

      </SidebarFooter>
      
     
    </Sidebar>
  );
}
