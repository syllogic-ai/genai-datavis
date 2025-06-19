"use client";

import * as React from "react";
import { Command, Home, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  dashboards?: Dashboard[];
  currentChatId?: string;
  onDashboardCreated?: (dashboard: Dashboard) => void;
}

export function AppSidebar({
  dashboards = [],
  currentChatId,
  onDashboardCreated,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Extract active dashboard ID from pathname
  const activeChatId =
    currentChatId ||
    (pathname?.includes("/dashboard/")
      ? pathname.split("/dashboard/")[1]
      : undefined);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">GenAI DataVis</span>
                  <span className="truncate text-xs">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain
          dashboards={dashboards}
          currentDashboardId={activeChatId}
          onDashboardCreated={onDashboardCreated}
        />
      </SidebarContent>
      
      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <div className="h-8 w-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || "U"}
                  </span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.fullName || user.firstName || "User"}
                  </span>
                  <span className="truncate text-xs">
                    {user.emailAddresses[0]?.emailAddress || ""}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
