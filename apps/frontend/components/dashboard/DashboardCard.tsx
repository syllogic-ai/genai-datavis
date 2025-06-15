"use client";

import React from "react";
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
    "bg-green-500",
    "bg-blue-500", 
    "bg-purple-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
    "bg-orange-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-pink-500",
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
    >
      <CardContent className="p-6">
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