"use client";

import * as React from "react";
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  Command,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  Home,
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
import { Dashboard } from "@/db/schema";
import { DashboardCreateEditPopover } from "./DashboardCreateEditPopover";
import Link from "next/link";
import { HomeIcon } from "@heroicons/react/20/solid";
import { HomeModernIcon } from "@heroicons/react/24/outline";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  dashboards?: Dashboard[];
  currentChatId?: string;
  onDashboardCreated?: (dashboard: Dashboard) => void;
}

export function AppSidebar({
  dashboards,
  currentChatId,
  onDashboardCreated,
  ...props
}: AppSidebarProps) {
  // If currentChatId is not provided, try to extract it from the pathname
  const pathname = usePathname();
  const activeChatId =
    currentChatId ||
    (pathname?.includes("/dashboard/")
      ? pathname.split("/dashboard/")[1]
      : undefined);

  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      className="bg-sidebar-background"
    >
      <SidebarHeader className="bg-sidebar-background text-muted">
        <SidebarMenu>
          <SidebarMenuItem className="mb-8">
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                <span className="font-bold">Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar-background hide-scrollbar">
        <NavMain
          items={[]}
          dashboards={dashboards}
          currentDashboardId={activeChatId}
        />
      </SidebarContent>
      <SidebarFooter className="bg-sidebar-background">
        {/* Add upgrade or usage button here */}
      </SidebarFooter>
    </Sidebar>
  );
}
