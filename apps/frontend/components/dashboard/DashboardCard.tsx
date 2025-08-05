"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/db/schema";
import { IconRenderer } from "@/components/dashboard/DashboardIconRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Copy, Edit, Trash2, Loader2, X } from "lucide-react";
import { DashboardCreateEditPopover } from "./DashboardCreateEditPopover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Global cache for prefetch requests to prevent duplicates
const prefetchCache = new Set<string>();

interface DashboardCardProps {
  dashboard: Dashboard;
  onDashboardUpdated?: (dashboard: Dashboard) => void;
  onDashboardCreated?: (dashboard: Dashboard) => void;
  onDashboardDeleted?: (dashboardId: string) => void;
}

// Function to generate a color based on the dashboard icon
const getIconColor = (icon: string): string => {
  const colors = [
    "bg-accent"
  ];
  
  // Simple hash function to consistently assign colors based on icon name
  let hash = 0;
  for (let i = 0; i < icon.length; i++) {
    hash = icon.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Function to get abbreviation from dashboard name
const getAbbreviation = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(word => word[0]).join("").toUpperCase();
};

export function DashboardCard({ dashboard, onDashboardUpdated, onDashboardCreated, onDashboardDeleted }: DashboardCardProps) {
  const router = useRouter();
  const iconColor = getIconColor(dashboard.icon);
  const abbreviation = getAbbreviation(dashboard.name);
  const [operationLoading, setOperationLoading] = useState(false);
  const [renamingDashboard, setRenamingDashboard] = useState<Dashboard | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on dropdown menu
    if ((e.target as HTMLElement).closest('[role="menu"]') || 
        (e.target as HTMLElement).closest('button[aria-haspopup="menu"]')) {
      return;
    }
    router.push(`/dashboard/${dashboard.id}`);
  };

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced prefetch dashboard data on hover for faster loading
  const handleMouseEnter = useCallback(async () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Debounce prefetch by 300ms to prevent excessive requests
    hoverTimeoutRef.current = setTimeout(async () => {
      const cacheKey = `dashboard-${dashboard.id}`;
      
      // Skip if already prefetched
      if (prefetchCache.has(cacheKey)) {
        return;
      }
      
      // Mark as prefetched
      prefetchCache.add(cacheKey);
      
      try {
        // Prefetch the dashboard page route
        router.prefetch(`/dashboard/${dashboard.id}`);
        
        // Only prefetch widgets data (skip files to reduce requests)
        // Files will be loaded when actually needed
        const widgetsPromise = fetch(`/api/dashboards/${dashboard.id}/widgets`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'X-Prefetch': 'true' // Mark as prefetch for server-side logging
          }
        });

        // Don't wait for this to complete, just initiate the request
        widgetsPromise.then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[PREFETCH] Dashboard ${dashboard.id} widgets prefetched`);
          }
        }).catch(() => {
          // Remove from cache on failure so it can be retried
          prefetchCache.delete(cacheKey);
        });
      } catch (error) {
        // Remove from cache on failure so it can be retried
        prefetchCache.delete(cacheKey);
      }
    }, 300);
  }, [dashboard.id, router]);
  
  // Clean up timeout on mouse leave
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Unknown";
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const handleDuplicateDashboard = async () => {
    setOperationLoading(true);
    try {
      const response = await fetch(`/api/dashboards/${dashboard.id}/duplicate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to duplicate dashboard');
      }
      
      const duplicatedDashboard = await response.json();
      // Call the parent's onDashboardCreated callback to update the list
      if (onDashboardCreated) {
        onDashboardCreated(duplicatedDashboard);
      }
      // Don't navigate - stay on the dashboard home page
      console.log(`Dashboard duplicated successfully: ${duplicatedDashboard.name}`);
    } catch (error) {
      console.error('Error duplicating dashboard:', error);
      alert('Failed to duplicate dashboard. Please try again.');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteDashboard = async () => {
    setOperationLoading(true);
    try {
      const response = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete dashboard');
      }
      
      // Notify parent component to update the list
      if (onDashboardDeleted) {
        onDashboardDeleted(dashboard.id);
      }
      
      console.log(`Dashboard "${dashboard.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      alert('Failed to delete dashboard. Please try again.');
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <>
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border  group"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardContent className="px-6 relative">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
            {dashboard.icon === "DocumentTextIcon" || !dashboard.icon ? (
              <span className=" font-semibold text-lg">
                {abbreviation}
              </span>
            ) : (
              <IconRenderer
                icon={dashboard.icon}
                className="w-8 h-8 "
              />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg  truncate">
              {dashboard.name}
            </h3>
            <p className="text-sm  mt-1">
              Opened {formatTimeAgo(dashboard.updatedAt)}
            </p>
            {dashboard.description && (
              <p className="text-sm  mt-2 line-clamp-2">
                {dashboard.description}
              </p>
            )}
          </div>
        </div>

        {/* Dropdown Menu - positioned absolutely in top right */}
        <div className="absolute top-4 right-4">
          {operationLoading ? (
            <Loader2 className="h-4 w-4 animate-spin " />
          ) : (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Dashboard options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateDashboard();
                  }}
                  disabled={operationLoading}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // Close dropdown first, then open rename dialog after a brief delay
                    setDropdownOpen(false);
                    setTimeout(() => {
                      setRenamingDashboard(dashboard);
                    }, 100);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // Close dropdown first, then open delete dialog after a brief delay
                    setDropdownOpen(false);
                    setTimeout(() => {
                      setShowDeleteDialog(true);
                    }, 100);
                  }}
                  disabled={operationLoading}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Rename Dashboard Dialog */}
    {renamingDashboard && (
      <DashboardCreateEditPopover
        dashboard={renamingDashboard}
        trigger={null}
        onDashboardUpdated={(updatedDashboard) => {
          if (onDashboardUpdated) {
            onDashboardUpdated(updatedDashboard);
          }
          setRenamingDashboard(null);
        }}
        onDialogClose={() => setRenamingDashboard(null)}
      />
    )}

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={() => setShowDeleteDialog(false)}
              disabled={operationLoading}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          <div className="mt-4 space-y-3">
            <AlertDialogDescription className="text-sm ">
              Are you sure you want to delete &quot;{dashboard.name}&quot;? This action will permanently delete all associated data and cannot be undone.
            </AlertDialogDescription>
            <div className="text-sm ">
              <div className="font-medium text-gray-700 mb-1">This includes:</div>
              <div className="space-y-1 pl-4">
                <div>• The dashboard and all its widgets</div>
                <div>• All associated data files</div>
                <div>• Chat history and conversations</div>
              </div>
            </div>
              <div className="font-medium  text-sm">
              ⚠️ This action cannot be undone.
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              handleDeleteDashboard();
              setShowDeleteDialog(false);
            }}
              className="bg-red-600  hover:bg-red-700 focus:ring-red-500 text-white"
            disabled={operationLoading}
          >
            {operationLoading ? (
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
  </>
  );
} 