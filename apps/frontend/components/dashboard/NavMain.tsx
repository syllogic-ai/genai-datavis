"use client";

import {
  ChevronRight,
  PlusCircleIcon,
  LayoutDashboard,
  type LucideIcon,
  PlusIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Dashboard } from "@/db/schema";
import Link from "next/link";
import { IconRenderer } from "./DashboardIconRenderer";
import { DashboardCreateEditPopover } from "./DashboardCreateEditPopover";

// Dashboard with active state for navigation
interface DashboardWithState extends Dashboard {
  isActive?: boolean;
}

export function NavMain({
  items = [],
  dashboards = [],
  currentDashboardId,
  onDashboardCreated,
}: {
  items?: {
    title: string;
    url: string;
  }[];
  dashboards?: Dashboard[];
  currentDashboardId?: string;
  onDashboardCreated?: (dashboard: Dashboard) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardsWithState, setDashboardsWithState] = useState<DashboardWithState[]>([]);
  const [hoveredDashboard, setHoveredDashboard] = useState<string | null>(null);

  // Memoize the active dashboard ID to prevent unnecessary re-renders
  const activeDashboardId = useMemo(() => {
    return (
      currentDashboardId ||
      (pathname?.includes("/dashboard/")
        ? pathname.split("/dashboard/")[1]
        : undefined)
    );
  }, [currentDashboardId, pathname]);

  // Update dashboard state when dashboards or active dashboard changes
  useEffect(() => {
    const dashboardsWithActiveState = dashboards.map((dashboard) => ({
      ...dashboard,
      isActive: dashboard.id === activeDashboardId,
    }));
    setDashboardsWithState(dashboardsWithActiveState);
  }, [dashboards, activeDashboardId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Add any global search functionality here if needed
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex w-full font-semibold justify-between">
        <p>Dashboards</p>
        <DashboardCreateEditPopover
          onDashboardCreated={onDashboardCreated}
          trigger={
            <Button className="gap-2 h-6 w-6 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" variant="ghost" size="icon">
              <PlusIcon className="h-4 w-4" />
            </Button>
          }
        />
      </SidebarGroupLabel>

      <SidebarMenu>
        {/* Dashboard navigation items */}
        {dashboardsWithState.length > 0 && (
          <SidebarMenu className="text-muted font-semibold">
            {dashboardsWithState.map((dashboard) => (
              <SidebarMenuItem 
                key={dashboard.id}
                onMouseEnter={() => setHoveredDashboard(dashboard.id)}
                onMouseLeave={() => setHoveredDashboard(null)}
              >
                <SidebarMenuButton 
                  asChild 
                  tooltip={dashboard.name} 
                  className={`${
                    dashboard.isActive ? 'bg-sidebar-foreground/5 hover:bg-sidebar-foreground/25' : ''
                  }`}
                >
                  <Link href={`/dashboard/${dashboard.id}`} className="flex items-center gap-2">
                    <IconRenderer
                      className="size-4 text-sidebar-foreground"
                      icon={dashboard.icon}
                    />
                    <span className="truncate">{dashboard.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}

        {/* Show message when no dashboards */}
        {dashboardsWithState.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <span className="text-muted-foreground/40 text-sm">
                No dashboards yet
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
