"use client";

import {
  ChevronRight,
  PlusCircleIcon,
  LayoutDashboard,
  type LucideIcon,
  PlusIcon,
  MoreHorizontal,
  Copy,
  Edit,
  Trash2,
  Loader2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  onDashboardUpdated,
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
  onDashboardUpdated?: (dashboard: Dashboard) => void;
  onWidgetUpdate?: (dashboardId: string, widgets: Widget[]) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardsWithWidgets, setDashboardsWithWidgets] = useState<DashboardWithWidgets[]>([]);
  const [hoveredDashboard, setHoveredDashboard] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState<{ [key: string]: boolean }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [renamingDashboard, setRenamingDashboard] = useState<Dashboard | null>(null);

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

  // Chat functionality moved to chat sidebar

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

  // Dashboard operations
  const handleDuplicateDashboard = useCallback(async (dashboard: Dashboard) => {
    setOperationLoading(prev => ({ ...prev, [dashboard.id]: true }));
    try {
      const response = await fetch(`/api/dashboards/${dashboard.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const newDashboard = await response.json();
        onDashboardCreated?.(newDashboard);
        router.push(`/dashboard/${newDashboard.id}`);
      }
    } catch (error) {
      console.error('Error duplicating dashboard:', error);
    } finally {
      setOperationLoading(prev => ({ ...prev, [dashboard.id]: false }));
    }
  }, [onDashboardCreated, router]);

  const handleDeleteDashboard = useCallback(async (dashboardId: string) => {
    console.log(`[NavMain] Starting delete operation for dashboard ${dashboardId}`);
    setOperationLoading(prev => ({ ...prev, [dashboardId]: true }));
    
    // Set a timeout to prevent infinite loading states
    const timeoutId = setTimeout(() => {
      console.warn(`[NavMain] Delete operation timed out for dashboard ${dashboardId}`);
      setOperationLoading(prev => ({ ...prev, [dashboardId]: false }));
      setShowDeleteDialog(null);
      alert('Delete operation timed out. Please try again.');
    }, 30000); // 30 second timeout
    
    try {
      console.log(`[NavMain] Making DELETE request to /api/dashboards/${dashboardId}`);
      const controller = new AbortController();
      const timeoutSignal = setTimeout(() => controller.abort(), 25000); // 25 second request timeout
      
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutSignal);
      console.log(`[NavMain] DELETE response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log(`[NavMain] DELETE response data:`, responseData);
      
      console.log(`[NavMain] Dashboard ${dashboardId} deleted successfully`);
      
      // Update the dashboard list by removing the deleted dashboard
      setDashboardsWithWidgets(prev => {
        const updated = prev.filter(d => d.id !== dashboardId);
        console.log(`[NavMain] Updated dashboard list, new count: ${updated.length}`);
        return updated;
      });
      
      // If we're deleting the current dashboard, navigate away
      if (dashboardId === activeDashboardId) {
        console.log(`[NavMain] Navigating away from deleted dashboard ${dashboardId}`);
        router.push('/dashboard');
      }
      
    } catch (error) {
      console.error('[NavMain] Error deleting dashboard:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Delete operation was cancelled due to timeout. Please try again.');
      } else {
        // Show user-friendly error message
        alert(`Failed to delete dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      clearTimeout(timeoutId);
      console.log(`[NavMain] Cleaning up delete operation state for dashboard ${dashboardId}`);
      setOperationLoading(prev => ({ ...prev, [dashboardId]: false }));
      setShowDeleteDialog(null);
    }
  }, [activeDashboardId, router]);

  // Chat loading moved to chat sidebar

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
                  <div 
                    className={`relative group rounded-md transition-all duration-200 ${
                      dashboard.isActive ? 'bg-sidebar-foreground/5' : ''
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
                    {/* Main Dashboard Button */}
                    <SidebarMenuButton 
                      asChild 
                      tooltip={dashboard.name}
                      className={`pr-0 ${
                        dashboard.isActive ? 'hover:bg-sidebar-foreground/25' : ''
                      }`}
                    >
                      <Link href={`/dashboard/${dashboard.id}`} className="flex items-center gap-2 pr-2">
                        {/* Chevron button - appears on hover, positioned on left */}
                        {hoveredDashboard === dashboard.id && dashboard.widgets.length > 0 ? (
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 data-[state=open]:rotate-90"
                              onClick={(e) => e.preventDefault()}
                            >
                              <ChevronRight className="h-3 w-3" />
                              <span className="sr-only">Toggle widgets</span>
                            </Button>
                          </CollapsibleTrigger>
                        ) : (
                          /* Dashboard Icon - hidden when chevron appears */
                          <div className={`transition-opacity duration-200 ${
                            hoveredDashboard === dashboard.id && dashboard.widgets.length > 0 
                              ? 'opacity-0' 
                              : 'opacity-100'
                          }`}>
                            <IconRenderer
                              className="size-4 text-sidebar-foreground"
                              icon={dashboard.icon}
                            />
                          </div>
                        )}
                        
                        <span className="truncate flex-1">{dashboard.name}</span>
                      </Link>
                    </SidebarMenuButton>

                    {/* Menu Actions - Loading indicator or Ellipsis Menu */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {operationLoading[dashboard.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-sidebar-accent"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                              <span className="sr-only">Dashboard options</span>
                            </Button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleDuplicateDashboard(dashboard)}
                            disabled={operationLoading[dashboard.id]}
                            className="focus:bg-blue-50 focus:text-blue-700"
                          >
                            {operationLoading[dashboard.id] ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            {operationLoading[dashboard.id] ? 'Duplicating...' : 'Duplicate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('[NavMain] Rename button clicked for dashboard:', dashboard.id, dashboard.name);
                              // Store dashboard info and trigger rename mode
                              setRenamingDashboard(dashboard);
                              console.log('[NavMain] Set renamingDashboard state:', dashboard);
                            }}
                            className="focus:bg-blue-50 focus:text-blue-700"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setShowDeleteDialog(dashboard.id)}
                            disabled={operationLoading[dashboard.id]}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            {operationLoading[dashboard.id] ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            {operationLoading[dashboard.id] ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  
                  {/* Collapsible Widget List */}
                  {dashboard.widgets.length > 0 && (
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold">Delete Dashboard</AlertDialogTitle>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <AlertDialogDescription className="text-sm text-gray-600">
                Are you sure you want to delete this dashboard? This action will permanently delete all associated data and cannot be undone.
              </AlertDialogDescription>
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-700 mb-1">This includes:</div>
                <div className="space-y-1 pl-4">
                  <div>• The dashboard and all its widgets</div>
                  <div>• All associated data files</div>
                  <div>• Chat history and conversations</div>
                </div>
              </div>
              <div className="font-medium text-red-600 text-sm">
                ⚠️ This action cannot be undone.
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              disabled={showDeleteDialog ? operationLoading[showDeleteDialog] : false}
              className="w-full"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDeleteDashboard(showDeleteDialog)}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 w-full"
              disabled={showDeleteDialog ? operationLoading[showDeleteDialog] : false}
            >
              {showDeleteDialog && operationLoading[showDeleteDialog] ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Dashboard
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      {renamingDashboard && (
        <>
          {console.log('[NavMain] Rendering rename dialog for dashboard:', renamingDashboard.id)}
          <DashboardCreateEditPopover
            dashboard={renamingDashboard}
            onDashboardUpdated={(updatedDashboard) => {
              console.log('[NavMain] Dashboard updated:', updatedDashboard);
              onDashboardUpdated?.(updatedDashboard);
              setRenamingDashboard(null);
              console.log('[NavMain] Cleared renamingDashboard state');
            }}
            trigger={null}
          />
        </>
      )}
    </SidebarGroup>
  );
}
