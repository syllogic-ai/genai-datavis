"use client";

import {
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
import { useEffect, useState, useMemo, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
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
  
  // Refs to track mouse position and hover state more accurately
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dashboardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Memoize the active dashboard ID to prevent unnecessary re-renders
  const activeDashboardId = useMemo(() => {
    return (
      currentDashboardId ||
      (pathname?.includes("/dashboard/")
        ? pathname.split("/dashboard/")[1]
        : undefined)
    );
  }, [currentDashboardId, pathname]);

  
  


  // Simplified hover management
  const setDashboardHovered = useCallback((dashboardId: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (dashboardId) {
      setHoveredDashboard(dashboardId);
    } else {
      // Delay clearing hover state to prevent flickering
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredDashboard(null);
      }, 100);
    }
  }, []);

  // Check if mouse is still within dashboard bounds
  const isMouseWithinDashboard = useCallback((dashboardId: string, event: MouseEvent): boolean => {
    const dashboardElement = dashboardRefs.current[dashboardId];
    if (!dashboardElement) return false;
    
    const rect = dashboardElement.getBoundingClientRect();
    const { clientX, clientY } = event;
    
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }, []);


  // Chat functionality moved to chat sidebar

  // Update dashboards with basic data (no widget loading)
  const updateDashboardsWithWidgetData = useCallback(() => {
    const dashboardsWithWidgetData = dashboards.map(dashboard => ({
      ...dashboard,
      isActive: dashboard.id === activeDashboardId,
      widgets: dashboard.id === activeDashboardId ? currentDashboardWidgets : [],
      widgetCount: dashboard.id === activeDashboardId ? currentDashboardWidgets.length : 0,
    }));

    setDashboardsWithWidgets(dashboardsWithWidgetData);
  }, [dashboards, activeDashboardId, currentDashboardWidgets]);

  // Update dashboard list when dashboards or widget counts change
  useEffect(() => {
    if (dashboards.length > 0) {
      updateDashboardsWithWidgetData();
    }
  }, [dashboards, updateDashboardsWithWidgetData]);



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
        // Update local state without navigation
        setDashboardsWithWidgets(prev => {
          const updated = [...prev, { ...newDashboard, widgets: [] }];
          // Sort by creation date (newest first)
          return updated.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        // Don't navigate - just show success feedback
        console.log(`[NavMain] Dashboard duplicated successfully: ${newDashboard.name}`);
      }
    } catch (error) {
      console.error('Error duplicating dashboard:', error);
      alert('Failed to duplicate dashboard. Please try again.');
    } finally {
      setOperationLoading(prev => ({ ...prev, [dashboard.id]: false }));
    }
  }, [onDashboardCreated]);

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


  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Global mouse move listener to handle complex hover scenarios
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      // Only run this logic if we have a hovered dashboard
      if (!hoveredDashboard) return;
      
      // Check if mouse is still within the hovered dashboard bounds
      if (!isMouseWithinDashboard(hoveredDashboard, event)) {
        // Mouse has left the dashboard area entirely
        setDashboardHovered(null);
      }
    };

    // Only add listener when we have a hovered dashboard
    if (hoveredDashboard) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
    }
  }, [hoveredDashboard, isMouseWithinDashboard, setDashboardHovered]);

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
            <>
              {dashboardsWithWidgets.map((dashboard) => (
                <SidebarMenuItem key={dashboard.id}>
                    <div 
                      ref={(el) => {
                        dashboardRefs.current[dashboard.id] = el;
                      }}
                      className="relative group"
                      onMouseEnter={() => {
                        setDashboardHovered(dashboard.id);
                      }}
                      onMouseLeave={() => {
                        // Only clear hover if dropdown is not open for this dashboard
                        if (dropdownOpenId !== dashboard.id) {
                          setDashboardHovered(null);
                        }
                      }}
                    >
                      {/* Main Dashboard Button */}
                      <div className={`relative flex items-center w-full h-8 rounded-md py-1 text-left text-sm transition-colors ${
                        dashboard.isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' 
                          : hoveredDashboard === dashboard.id
                          ? 'bg-sidebar-foreground/10 text-sidebar-foreground-foreground'
                          : 'hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground-foreground'
                      }`}>
                        
                        {/* Dashboard Icon - always visible */}
                        <div className="absolute left-2 h-4 w-4 flex items-center justify-center z-20">
                          <IconRenderer
                            className={`size-4 transition-colors ${
                              dashboard.isActive 
                                ? 'text-primary-foreground hover:text-primary' 
                                : 'text-sidebar-foreground'
                            }`}
                            icon={dashboard.icon}
                          />
                        </div>

                          
                        {/* Dashboard name - positioned to not overlap icons */}
                        <Link href={`/dashboard/${dashboard.id}`} className="absolute left-8 right-10 py-1 truncate">
                          <span className={`truncate text-sm transition-colors ${
                            dashboard.isActive 
                              ? 'text-primary-foreground' 
                              : ''
                          }`}>{dashboard.name}</span>
                        </Link>
                      </div>

                      {/* Menu Actions - Loading indicator or Ellipsis Menu */}
                      <div 
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
                        onMouseEnter={() => setDashboardHovered(dashboard.id)}
                      >
                        {operationLoading[dashboard.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground" />
                        ) : (
                          <div className={`h-4 w-4 flex items-center justify-center transition-opacity duration-200 ${
                            hoveredDashboard === dashboard.id ? 'opacity-100' : 'opacity-0'
                          }`}>
                            <DropdownMenu 
                              open={dropdownOpenId === dashboard.id}
                              onOpenChange={(open) => {
                                console.log('[NavMain] Dropdown menu state changing for dashboard:', dashboard.id, 'open:', open);
                                setDropdownOpenId(open ? dashboard.id : null);
                                
                                // Maintain hover state when dropdown is open
                                if (open) {
                                  setDashboardHovered(dashboard.id);
                                } else {
                                  // Clear hover state when dropdown closes (with small delay)
                                  setTimeout(() => {
                                    setDashboardHovered(null);
                                  }, 100);
                                }
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-4 w-4 p-2 transition-all duration-200 flex items-center justify-center rounded-sm pointer-events-auto hover:bg-primary/30 ${
                                    dashboard.isActive 
                                      ? 'text-primary-foreground' 
                                      : 'text-sidebar-foreground-foreground'
                                  }`}
                                  onMouseEnter={() => {
                                    console.log('[NavMain] MoreHorizontal mouse enter for dashboard:', dashboard.id);
                                    setDashboardHovered(dashboard.id);
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('[NavMain] Dropdown trigger clicked for dashboard:', dashboard.id);
                                  }}
                              >
                                <MoreHorizontal className={`h-1 w-1 ${
                                  dashboard.isActive 
                                    ? 'text-primary-foreground' 
                                    : 'text-sidebar-foreground-foreground'
                                }`} />
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
                          </div>
                        )}
                      </div>
                    </div>
                </SidebarMenuItem>
              ))}
            </>
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