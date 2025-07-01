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
import { Widget } from "@/types/enhanced-dashboard-types";
import Link from "next/link";
import { IconRenderer } from "./DashboardIconRenderer";
import { DashboardCreateEditPopover } from "./DashboardCreateEditPopover";

// Dashboard with widget information and active state
interface DashboardWithWidgets extends Dashboard {
  isActive?: boolean;
  widgets: Widget[];
  widgetCount: number;
}

export function NavMain({
  items = [],
  dashboards = [],
  currentDashboardId,
  currentDashboardWidgets = [],
  onDashboardCreated,
  onWidgetUpdate,
}: {
  items?: {
    title: string;
    url: string;
  }[];
  dashboards?: Dashboard[];
  currentDashboardId?: string;
  currentDashboardWidgets?: Widget[];
  onDashboardCreated?: (dashboard: Dashboard) => void;
  onWidgetUpdate?: (dashboardId: string, widgets: Widget[]) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardsWithWidgets, setDashboardsWithWidgets] = useState<DashboardWithWidgets[]>([]);
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

  // Cache widget counts to avoid repeated API calls
  const [widgetCounts, setWidgetCounts] = useState<Record<string, number>>({});
  const [loadedDashboardIds, setLoadedDashboardIds] = useState<Set<string>>(new Set());

  // Load widget count for a specific dashboard (lazy loading)
  const loadWidgetCountForDashboard = useCallback(async (dashboardId: string): Promise<number> => {
    // Return cached count if available
    if (widgetCounts[dashboardId] !== undefined) {
      return widgetCounts[dashboardId];
    }

    // If this is the current dashboard and we have widgets, use them
    if (dashboardId === activeDashboardId && currentDashboardWidgets.length > 0) {
      const count = currentDashboardWidgets.length;
      setWidgetCounts(prev => ({ ...prev, [dashboardId]: count }));
      return count;
    }

    try {
      console.log(`[NavMain] Loading widget count for dashboard ${dashboardId}`);
      const response = await fetch(`/api/dashboards/${dashboardId}/widgets`);
      if (!response.ok) {
        console.warn(`[NavMain] Failed to load widgets for dashboard ${dashboardId}`);
        setWidgetCounts(prev => ({ ...prev, [dashboardId]: 0 }));
        return 0;
      }

      const { widgets } = await response.json();
      const count = widgets?.length || 0;
      console.log(`[NavMain] Loaded ${count} widgets for dashboard ${dashboardId}`);
      
      setWidgetCounts(prev => ({ ...prev, [dashboardId]: count }));
      setLoadedDashboardIds(prev => new Set(prev).add(dashboardId));
      return count;
    } catch (error) {
      console.error(`[NavMain] Error loading widgets for dashboard ${dashboardId}:`, error);
      setWidgetCounts(prev => ({ ...prev, [dashboardId]: 0 }));
      return 0;
    }
  }, [widgetCounts, activeDashboardId, currentDashboardWidgets]);

  // Update dashboards with widget data (without fetching all at once)
  const updateDashboardsWithWidgetData = useCallback(() => {
    const dashboardsWithWidgetData = dashboards.map(dashboard => ({
      ...dashboard,
      isActive: dashboard.id === activeDashboardId,
      widgets: dashboard.id === activeDashboardId ? currentDashboardWidgets : [],
      widgetCount: widgetCounts[dashboard.id] ?? 0, // Use cached count or 0
    }));

    setDashboardsWithWidgets(dashboardsWithWidgetData);
  }, [dashboards, activeDashboardId, currentDashboardWidgets, widgetCounts]);

  // Update dashboard list when dashboards or widget counts change
  useEffect(() => {
    if (dashboards.length > 0) {
      updateDashboardsWithWidgetData();
    }
  }, [dashboards, updateDashboardsWithWidgetData]);

  // Update current dashboard widget count when widgets change
  useEffect(() => {
    if (activeDashboardId && currentDashboardWidgets.length >= 0) {
      console.log(`[NavMain] Updating current dashboard ${activeDashboardId} widgets: ${currentDashboardWidgets.length}`);
      
      // Update the cached widget count for the current dashboard
      setWidgetCounts(prev => ({ ...prev, [activeDashboardId]: currentDashboardWidgets.length }));
      
      setDashboardsWithWidgets(prev => 
        prev.map(dashboard => 
          dashboard.id === activeDashboardId
            ? {
                ...dashboard,
                widgets: currentDashboardWidgets,
                widgetCount: currentDashboardWidgets.length,
              }
            : dashboard
        )
      );

      // Notify parent component about widget update
      onWidgetUpdate?.(activeDashboardId, currentDashboardWidgets);
    }
  }, [activeDashboardId, currentDashboardWidgets, onWidgetUpdate]);

  // Load widget count for current dashboard immediately
  useEffect(() => {
    if (activeDashboardId && !loadedDashboardIds.has(activeDashboardId)) {
      loadWidgetCountForDashboard(activeDashboardId);
    }
  }, [activeDashboardId, loadedDashboardIds, loadWidgetCountForDashboard]);

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
        {/* Dashboard navigation items with collapsible widgets */}
        {dashboardsWithWidgets.length > 0 && (
          <SidebarMenu className="text-muted font-semibold">
            {dashboardsWithWidgets.map((dashboard) => (
              <Collapsible key={dashboard.id} asChild defaultOpen={dashboard.isActive}>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={dashboard.name} 
                    className={`${
                      dashboard.isActive ? 'bg-sidebar-foreground/5 hover:bg-sidebar-foreground/25' : ''
                    }`}
                    onMouseEnter={() => {
                      setHoveredDashboard(dashboard.id);
                      // Lazy load widget count when user hovers over dashboard
                      if (!loadedDashboardIds.has(dashboard.id)) {
                        loadWidgetCountForDashboard(dashboard.id);
                      }
                    }}
                    onMouseLeave={() => setHoveredDashboard(null)}
                  >
                    <Link href={`/dashboard/${dashboard.id}`} className="flex items-center gap-2">
                      <IconRenderer
                        className="size-4 text-sidebar-foreground"
                        icon={dashboard.icon}
                      />
                      <span className="truncate">{dashboard.name}</span>
                      {dashboard.widgetCount > 0 && (
                        <span className="ml-auto text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 rounded-full">
                          {dashboard.widgetCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                  
                  {dashboard.widgets.length > 0 && (
                    <>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="data-[state=open]:rotate-90">
                          <ChevronRight />
                          <span className="sr-only">Toggle widgets</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {dashboard.widgets.map((widget) => (
                            <SidebarMenuSubItem key={widget.id}>
                              <SidebarMenuSubButton asChild>
                                <Link href={`/dashboard/${dashboard.id}#widget-${widget.id}`}>
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {widget.type}
                                  </span>
                                  <span className="truncate text-sm">
                                    {widget.config?.title || `${widget.type} widget`}
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        )}

        {/* Show message when no dashboards */}
        {dashboardsWithWidgets.length === 0 && (
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
