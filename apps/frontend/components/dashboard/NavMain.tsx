"use client";

import {
  ChevronRight,
  PlusCircleIcon,
  LayoutDashboard,
  type LucideIcon,
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

// Widget interface for navigation items
interface NavWidget {
  id: string;
  title: string;
  type: "text" | "chart" | "kpi" | "table";
}

// Dashboard with widgets for navigation
interface DashboardWithWidgets extends Dashboard {
  widgets?: NavWidget[];
  isActive?: boolean;
}

export function NavMain({
  items = [],
  dashboards = [],
  currentDashboardId,
}: {
  items?: {
    title: string;
    url: string;
  }[];
  dashboards?: Dashboard[];
  currentDashboardId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardsWithWidgets, setDashboardsWithWidgets] = useState<
    DashboardWithWidgets[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Memoize the active dashboard ID to prevent unnecessary re-renders
  const activeDashboardId = useMemo(() => {
    return (
      currentDashboardId ||
      (pathname?.includes("/dashboard/")
        ? pathname.split("/dashboard/")[1]
        : undefined)
    );
  }, [currentDashboardId, pathname]);

  // Memoize dashboard IDs to detect actual changes
  const dashboardIds = useMemo(
    () =>
      dashboards
        .map((d) => d.id)
        .sort()
        .join(","),
    [dashboards]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the pressed key is 'c' or 'C' and no modifier keys are pressed
      if (
        (e.key === "c" || e.key === "C") &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        // Check if the active element is an input, textarea, or has contentEditable
        const activeElement = document.activeElement as HTMLElement;
        const isEditableElement =
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true";

        // Only trigger navigation if user is not typing in an input field
        if (!isEditableElement) {
          router.push("/dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Memoized fetch function to prevent recreation on every render
  const fetchDashboardWidgets = useCallback(async () => {
    if (dashboards.length === 0) {
      setDashboardsWithWidgets([]);
      return;
    }

    setLoading(true);
    try {
      const dashboardsWithWidgetsData = await Promise.all(
        dashboards.map(async (dashboard) => {
          try {
            // Fetch widgets for this dashboard
            const response = await fetch(
              `/api/dashboards/${dashboard.id}/widgets`
            );
            const widgets = response.ok ? await response.json() : [];

            // Transform widgets to navigation format
            const navWidgets: NavWidget[] = widgets.map((widget: any) => ({
              id: widget.id,
              title:
                widget.title || widget.config?.title || `${widget.type} Widget`,
              type: widget.type,
            }));

            return {
              ...dashboard,
              widgets: navWidgets,
              isActive: dashboard.id === activeDashboardId,
            };
          } catch (error) {
            console.error(
              `Error fetching widgets for dashboard ${dashboard.id}:`,
              error
            );
            return {
              ...dashboard,
              widgets: [],
              isActive: dashboard.id === activeDashboardId,
            };
          }
        })
      );

      setDashboardsWithWidgets(dashboardsWithWidgetsData);
    } catch (error) {
      console.error("Error fetching dashboard widgets:", error);
      setDashboardsWithWidgets(
        dashboards.map((d) => ({
          ...d,
          widgets: [],
          isActive: d.id === activeDashboardId,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [dashboards, activeDashboardId]);

  // Fetch widgets for each dashboard with stable dependencies
  useEffect(() => {
    fetchDashboardWidgets();
  }, [dashboardIds, activeDashboardId]); // Use dashboardIds instead of dashboards array

  // Get icon for widget type
  const getWidgetIcon = (type: string): LucideIcon => {
    switch (type) {
      case "chart":
        return LayoutDashboard;
      case "table":
        return LayoutDashboard;
      case "kpi":
        return LayoutDashboard;
      case "text":
        return LayoutDashboard;
      default:
        return LayoutDashboard;
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex w-full font-semibold justify-between">
        <p>Dashboards</p>
        <p>New</p>
      </SidebarGroupLabel>

      <SidebarMenu>
        {/* Dashboards with widgets */}
        {dashboardsWithWidgets.length > 0 && (
          <SidebarMenu className="text-muted font-semibold">
            {dashboardsWithWidgets.map((dashboard) => (
              <Collapsible
                key={dashboard.id}
                asChild
                defaultOpen={dashboard.isActive}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={dashboard.name}>
                    <Link href={`/dashboard/${dashboard.id}`}>
                      <IconRenderer
                        className="size-4 text-zinc-500"
                        icon={dashboard.icon}
                      />
                      <span className="truncate">{dashboard.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  {dashboard.widgets && dashboard.widgets.length > 0 ? (
                    <>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="data-[state=open]:rotate-90">
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {dashboard.widgets.map((widget) => {
                            const WidgetIcon = getWidgetIcon(widget.type);
                            return (
                              <SidebarMenuSubItem key={widget.id}>
                                <SidebarMenuSubButton asChild>
                                  <Link
                                    href={`/dashboard/${dashboard.id}#widget-${widget.id}`}
                                  >
                                    <WidgetIcon className="h-3 w-3" />
                                    <span className="truncate">
                                      {widget.title}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </>
                  ) : null}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
