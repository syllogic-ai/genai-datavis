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
  X,
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
  onDashboardDeleted,
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
  onDashboardDeleted?: (dashboardId: string) => void;
  onWidgetUpdate?: (dashboardId: string, widgets: Widget[]) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardsWithWidgets, setDashboardsWithWidgets] = useState<DashboardWithWidgets[]>([]);
  const [hoveredDashboard, setHoveredDashboard] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState<{ [key: string]: boolean }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [renamingDashboard, setRenamingDashboard] = useState<Dashboard | null>(null);
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);

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
  
  // Track which dashboards are expanded
  const [expandedDashboards, setExpandedDashboards] = useState<Set<string>>(new Set());

  // Function to toggle dashboard expansion
  const toggleDashboardExpansion = useCallback((dashboardId: string) => {
    console.log('[NavMain] Toggling dashboard expansion for:', dashboardId);
    setExpandedDashboards(prev => {
      const newSet = new Set(prev);
      const wasExpanded = newSet.has(dashboardId);
      if (wasExpanded) {
        newSet.delete(dashboardId);
        console.log('[NavMain] Collapsing dashboard:', dashboardId);
      } else {
        newSet.add(dashboardId);
        console.log('[NavMain] Expanding dashboard:', dashboardId);
      }
      console.log('[NavMain] New expanded dashboards:', Array.from(newSet));
      return newSet;
    });
  }, []);

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
      
      // Update the context (this will sync both sidebar and dashboard home page)
      onDashboardDeleted?.(dashboardId);
      
      // Update the local dashboard list by removing the deleted dashboard
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
  }, [activeDashboardId, router, onDashboardDeleted]);

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

  // Cleanup effect for rename dialog state
  useEffect(() => {
    if (renamingDashboard) {
      console.log('[NavMain] Rename dialog opened for dashboard:', renamingDashboard.id);
      
      // Add a cleanup timer to ensure state is cleared if dialog doesn't respond
      const cleanupTimer = setTimeout(() => {
        console.log('[NavMain] Cleanup timer triggered, clearing rename state');
        setRenamingDashboard(null);
      }, 30000); // 30 seconds cleanup timer
      
      return () => {
        clearTimeout(cleanupTimer);
      };
    }
  }, [renamingDashboard]);

  // Initialize active dashboard as expanded
  useEffect(() => {
    if (activeDashboardId) {
      console.log('[NavMain] Initializing active dashboard as expanded:', activeDashboardId);
      setExpandedDashboards(prev => {
        const newSet = new Set(prev);
        newSet.add(activeDashboardId);
        console.log('[NavMain] Initial expanded dashboards:', Array.from(newSet));
        return newSet;
      });
    }
  }, [activeDashboardId]);

  return (
    <>
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
                <SidebarMenuItem key={dashboard.id}>
                  <Collapsible 
                    open={expandedDashboards.has(dashboard.id)}
                    onOpenChange={(open) => {
                      console.log('[NavMain] Collapsible onOpenChange called for dashboard:', dashboard.id, 'open:', open);
                      toggleDashboardExpansion(dashboard.id);
                    }}
                  >
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
                      <div className={`flex items-center gap-2 pr-2 w-full h-8 px-2 rounded-md transition-colors ${
                        dashboard.isActive ? 'bg-sidebar-foreground/5 hover:bg-sidebar-foreground/10' : 'hover:bg-secondary/40'
                      }`}>
                        {/* Always show chevron on hover, functional only for dashboards with widgets */}
                        {dashboard.widgets.length > 0 ? (
                          <CollapsibleTrigger
                            className="h-4 w-4 p-0 transition-all duration-200 data-[state=open]:rotate-90 hover:bg-secondary/40 relative z-10 flex items-center justify-center rounded-sm"
                            onClick={() => {
                              console.log('[NavMain] Chevron clicked for dashboard:', dashboard.id);
                              // Let the CollapsibleTrigger handle the toggle naturally
                            }}
                          >
                            <ChevronRight className={`h-3 w-3 transition-opacity duration-200 ${
                              hoveredDashboard === dashboard.id 
                                ? 'opacity-100' 
                                : 'opacity-0'
                            }`} />
                            <span className="sr-only">Toggle widgets</span>
                          </CollapsibleTrigger>
                        ) : (
                          /* Show chevron on hover for consistency, but not functional */
                          <div className="relative h-4 w-4 flex items-center justify-center">
                            {/* Dashboard Icon - visible when not hovered */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                              hoveredDashboard === dashboard.id ? 'opacity-0' : 'opacity-100'
                            }`}>
                              <IconRenderer
                                className="size-4 text-sidebar-foreground"
                                icon={dashboard.icon}
                              />
                            </div>
                            {/* Chevron - visible on hover */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                              hoveredDashboard === dashboard.id ? 'opacity-100' : 'opacity-0'
                            }`}>
                              <ChevronRight className="h-3 w-3 text-sidebar-foreground/50" />
                            </div>
                          </div>
                        )}
                        
                        <Link href={`/dashboard/${dashboard.id}`} className="truncate flex-1 py-1">
                          <span className="truncate text-sm">{dashboard.name}</span>
                        </Link>
                      </div>

                      {/* Menu Actions - Loading indicator or Ellipsis Menu */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                        {operationLoading[dashboard.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground" />
                        ) : (
                          <DropdownMenu 
                            open={dropdownOpenId === dashboard.id}
                            onOpenChange={(open) => {
                              console.log('[NavMain] Dropdown menu state changing for dashboard:', dashboard.id, 'open:', open);
                              setDropdownOpenId(open ? dashboard.id : null);
                            }}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 p-0 transition-opacity duration-200 ${
                                  hoveredDashboard === dashboard.id 
                                    ? 'opacity-100' 
                                    : 'opacity-0'
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('[NavMain] Dropdown trigger clicked for dashboard:', dashboard.id);
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
                              className="focus:bg-sidebar focus:text-sidebar-foreground hover:bg-sidebar hover:text-sidebar-foreground"
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
                                console.log('[NavMain] Current renamingDashboard state:', renamingDashboard);
                                console.log('[NavMain] Current dropdownOpenId:', dropdownOpenId);
                                
                                // First close the dropdown menu
                                console.log('[NavMain] Closing dropdown menu before opening rename dialog');
                                setDropdownOpenId(null);
                                
                                // Wait for dropdown to close, then open rename dialog
                                setTimeout(() => {
                                  console.log('[NavMain] Opening rename dialog after dropdown closed');
                                  console.log('[NavMain] Setting renamingDashboard to:', dashboard);
                                  setRenamingDashboard(dashboard);
                                  console.log('[NavMain] Rename dashboard state set complete');
                                }, 150); // Small delay to ensure dropdown closes
                              }}
                              className="focus:bg-sidebar focus:text-sidebar-foreground hover:bg-sidebar hover:text-sidebar-foreground"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[NavMain] Delete button clicked for dashboard:', dashboard.id);
                                
                                // First close the dropdown menu
                                console.log('[NavMain] Closing dropdown menu before opening delete dialog');
                                setDropdownOpenId(null);
                                
                                // Wait for dropdown to close, then open delete dialog
                                setTimeout(() => {
                                  console.log('[NavMain] Opening delete dialog after dropdown closed');
                                  setShowDeleteDialog(dashboard.id);
                                }, 150); // Small delay to ensure dropdown closes
                              }}
                              disabled={operationLoading[dashboard.id]}
                              className="focus:bg-sidebar focus:text-sidebar-foreground hover:bg-sidebar hover:text-red-600 transition-colors [&>svg]:hover:text-red-600"
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
                  </Collapsible>
                </SidebarMenuItem>
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!showDeleteDialog} 
        onOpenChange={(open) => {
          console.log('[NavMain] Delete dialog open state changing:', !!showDeleteDialog, '->', open);
          if (!open) {
            setShowDeleteDialog(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg font-semibold">Delete Dashboard</AlertDialogTitle>
                </div>
              </div>
              
              {/* X Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-100 -mt-1"
                onClick={() => setShowDeleteDialog(null)}
                disabled={showDeleteDialog ? operationLoading[showDeleteDialog] : false}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
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
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDeleteDashboard(showDeleteDialog)}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
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
          <DashboardCreateEditPopover
            key={renamingDashboard.id} // Force re-mount for each dashboard
            dashboard={renamingDashboard}
            onDashboardUpdated={(updatedDashboard) => {
              console.log('[NavMain] Dashboard updated:', updatedDashboard);
              onDashboardUpdated?.(updatedDashboard);
              console.log('[NavMain] Clearing renamingDashboard state');
              setRenamingDashboard(null);
            }}
            onDialogClose={() => {
              console.log('[NavMain] Rename dialog closed without updating, clearing state');
              setRenamingDashboard(null);
            }}
            trigger={null}
          />
        </>
      )}
    </>
  );
}
