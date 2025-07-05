"use client";

import * as React from "react";
import { Command, Home, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
import { useDashboardContext } from "./DashboardUserContext";
import Link from "next/link";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentChatId?: string;
}

export function AppSidebar({
  currentChatId,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { dashboards, currentDashboardWidgets, addDashboard, updateDashboard, deleteDashboard } = useDashboardContext();
  
  // Extract active dashboard ID from pathname
  const activeChatId =
    currentChatId ||
    (pathname?.includes("/dashboard/")
      ? pathname.split("/dashboard/")[1]
      : undefined);

  const handleDashboardCreated = (dashboard: Dashboard) => {
    addDashboard(dashboard);
    // Navigate to the new dashboard
    router.push(`/dashboard/${dashboard.id}`);
  };

  const handleDashboardUpdated = (dashboard: Dashboard) => {
    updateDashboard(dashboard);
  };

  const handleDashboardDeleted = (dashboardId: string) => {
    deleteDashboard(dashboardId);
  };

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
          currentDashboardWidgets={currentDashboardWidgets}
          onDashboardCreated={handleDashboardCreated}
          onDashboardUpdated={handleDashboardUpdated}
          onDashboardDeleted={handleDashboardDeleted}
        />
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          {user && (
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
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
