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
import { MoreHorizontal, Copy, Edit, Trash2, Loader2 } from "lucide-react";
import { DashboardCreateEditPopover } from "./DashboardCreateEditPopover";

// Global cache for prefetch requests to prevent duplicates
const prefetchCache = new Set<string>();

interface DashboardCardProps {
  dashboard: Dashboard;
  onDashboardUpdated?: (dashboard: Dashboard) => void;
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

export function DashboardCard({ dashboard, onDashboardUpdated }: DashboardCardProps) {
  const router = useRouter();
  const iconColor = getIconColor(dashboard.icon);
  const abbreviation = getAbbreviation(dashboard.name);
  const [operationLoading, setOperationLoading] = useState(false);
  const [renamingDashboard, setRenamingDashboard] = useState<Dashboard | null>(null);
  
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
      router.push(`/dashboard/${duplicatedDashboard.id}`);
    } catch (error) {
      console.error('Error duplicating dashboard:', error);
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
      
      // Refresh the page or notify parent component
      window.location.reload();
    } catch (error) {
      console.error('Error deleting dashboard:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <>
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200 group"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardContent className="px-6 relative">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
            {dashboard.icon === "DocumentTextIcon" || !dashboard.icon ? (
              <span className="text-white font-semibold text-lg">
                {abbreviation}
              </span>
            ) : (
              <IconRenderer
                icon={dashboard.icon}
                className="w-8 h-8 text-white"
              />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {dashboard.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Opened {formatTimeAgo(dashboard.updatedAt)}
            </p>
            {dashboard.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {dashboard.description}
              </p>
            )}
          </div>
        </div>

        {/* Dropdown Menu - positioned absolutely in top right */}
        <div className="absolute top-4 right-4">
          {operationLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          ) : (
            <DropdownMenu>
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
                    setRenamingDashboard(dashboard);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${dashboard.name}"?`)) {
                      handleDeleteDashboard();
                    }
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

    {/* Rename Dashboard Popover */}
    {renamingDashboard && (
      <DashboardCreateEditPopover
        isOpen={!!renamingDashboard}
        onOpenChange={(open) => !open && setRenamingDashboard(null)}
        editingDashboard={renamingDashboard}
        onDashboardCreated={(updatedDashboard) => {
          if (onDashboardUpdated) {
            onDashboardUpdated(updatedDashboard);
          }
          setRenamingDashboard(null);
        }}
      />
    )}
  </>
  );
} 