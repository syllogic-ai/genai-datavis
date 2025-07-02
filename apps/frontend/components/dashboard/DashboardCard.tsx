"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/db/schema";
import { IconRenderer } from "@/components/dashboard/DashboardIconRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

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
  
  const handleClick = () => {
    router.push(`/dashboard/${dashboard.id}`);
  };

  // Prefetch dashboard data on hover for faster loading
  const handleMouseEnter = useCallback(async () => {
    try {
      // Prefetch the dashboard page route
      router.prefetch(`/dashboard/${dashboard.id}`);
      
      // Prefetch dashboard widgets data
      const widgetsPromise = fetch(`/api/dashboards/${dashboard.id}/widgets`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Prefetch dashboard files data (lower priority)
      const filesPromise = fetch(`/api/dashboards/${dashboard.id}/files`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      // Don't wait for these to complete, just initiate the requests
      Promise.allSettled([widgetsPromise, filesPromise]).then(() => {
        console.log(`[PREFETCH] Dashboard ${dashboard.id} data prefetched`);
      }).catch(() => {
        // Silently fail prefetch attempts
      });
    } catch (error) {
      // Silently fail prefetch attempts - they're not critical
    }
  }, [dashboard.id, router]);

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Unknown";
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <CardContent className="px-6">
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
      </CardContent>
    </Card>
  );
} 