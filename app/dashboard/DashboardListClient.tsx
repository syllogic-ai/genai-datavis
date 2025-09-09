"use client";

import React, { useState, useEffect, useOptimistic } from 'react';
import { useRouter } from "next/navigation";
import { useCacheWarming } from "@/lib/cache-warmer";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardCreateEditPopover } from "@/components/dashboard/DashboardCreateEditPopover";
import { Dashboard } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { PlusIcon, FolderIcon } from "lucide-react";

interface DashboardListClientProps {
  initialDashboards: Dashboard[];
  error: string | null;
  userId: string;
}

export function DashboardListClient({ 
  initialDashboards, 
  error: initialError,
  userId 
}: DashboardListClientProps) {
  const router = useRouter();
  const { warmCache } = useCacheWarming();
  
  // Use optimistic updates for instant UI feedback
  const [optimisticDashboards, addOptimisticDashboard] = useOptimistic(
    initialDashboards,
    (state, newDashboard: Dashboard) => [newDashboard, ...state]
  );

  const [error, setError] = useState(initialError);

  // Warm cache after component mounts (non-blocking)
  useEffect(() => {
    warmCache(userId).catch(() => {}); // Silent failure
  }, [userId, warmCache]);

  const handleDashboardCreated = (newDashboard: Dashboard) => {
    // Optimistically add to UI
    addOptimisticDashboard(newDashboard);
    // Navigate to the new dashboard
    router.push(`/dashboard/${newDashboard.id}`);
  };

  const handleDashboardUpdated = (updatedDashboard: Dashboard) => {
    // This would trigger a revalidation in a real app
    router.refresh();
  };

  const handleDashboardDeleted = (dashboardId: string) => {
    // This would trigger a revalidation in a real app
    router.refresh();
  };

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-full px-4">
        <div className="text-center p-4 text-red-600">{error}</div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Your Dashboards
          </h1>
          <p className="mt-2">
            Manage and explore your data visualizations
          </p>
        </div>
        <DashboardCreateEditPopover
          onDashboardCreated={handleDashboardCreated}
          trigger={
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" />
              New Dashboard
            </Button>
          }
        />
      </div>

      {/* Dashboard Grid or Empty State */}
      {optimisticDashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <FolderIcon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            No dashboards yet
          </h3>
          <p className="text-gray-600 mb-8 max-w-md">
            Create your first dashboard to start analyzing and visualizing your data.
          </p>
          <DashboardCreateEditPopover
            onDashboardCreated={handleDashboardCreated}
            trigger={
              <Button size="lg" className="gap-2">
                <PlusIcon className="h-5 w-5" />
                Create Your First Dashboard
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Recent Section */}
          {optimisticDashboards.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">
                Recent
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {optimisticDashboards.slice(0, 6).map((dashboard) => (
                  <DashboardCard
                    key={dashboard.id}
                    dashboard={dashboard}
                    onDashboardUpdated={handleDashboardUpdated}
                    onDashboardCreated={handleDashboardCreated}
                    onDashboardDeleted={handleDashboardDeleted}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Dashboards Section */}
          {optimisticDashboards.length > 6 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Earlier
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {optimisticDashboards.slice(6).map((dashboard) => (
                  <DashboardCard
                    key={dashboard.id}
                    dashboard={dashboard}
                    onDashboardUpdated={handleDashboardUpdated}
                    onDashboardCreated={handleDashboardCreated}
                    onDashboardDeleted={handleDashboardDeleted}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}