"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCacheWarming } from "@/lib/cache-warmer";

import { SiteHeader } from "@/components/dashboard/SiteHeader";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardCreateEditPopover } from "@/components/dashboard/DashboardCreateEditPopover";
import { Dashboard } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { PlusIcon, FolderIcon } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { warmCache } = useCacheWarming();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboards on component mount and warm cache
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      fetchDashboards();
      // Warm cache in the background for better performance
      warmCache(user.id).catch(console.warn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user?.id]); // Removed warmCache from deps to prevent infinite loop

  const fetchDashboards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboards');
      if (response.ok) {
        const data = await response.json();
        setDashboards(data);
      } else {
        setError('Failed to fetch dashboards');
      }
    } catch (err) {
      setError('Error fetching dashboards');
      console.error('Error fetching dashboards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDashboardCreated = (newDashboard: Dashboard) => {
    setDashboards(prev => [newDashboard, ...prev]);
    // Navigate to the new dashboard
    router.push(`/dashboard/${newDashboard.id}`);
  };

  const handleDashboardUpdated = (updatedDashboard: Dashboard) => {
    setDashboards(prev => 
      prev.map(dashboard => 
        dashboard.id === updatedDashboard.id ? updatedDashboard : dashboard
      )
    );
  };

  // Show loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden text-black">
        <SiteHeader />
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col justify-center items-center h-full px-4">
            <div className="text-center p-4">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt
  if (!isSignedIn) {
    return (
      <div className="flex flex-col h-full overflow-hidden text-black">
        <SiteHeader />
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col justify-center items-center h-full px-4">
            <div className="text-center p-4">You need to sign in to view dashboards</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full overflow-hidden text-black">
        <SiteHeader />
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col justify-center items-center h-full px-4">
            <div className="text-center p-4 text-red-600">{error}</div>
            <Button onClick={fetchDashboards} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-black">
      <SiteHeader chatTitle='Home'/>
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Your Dashboards
              </h1>
              <p className="text-gray-600 mt-2">
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
          {dashboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <FolderIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
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
              {dashboards.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboards.slice(0, 6).map((dashboard) => (
                      <DashboardCard
                        key={dashboard.id}
                        dashboard={dashboard}
                        onDashboardUpdated={handleDashboardUpdated}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Dashboards Section */}
              {dashboards.length > 6 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Earlier
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboards.slice(6).map((dashboard) => (
                      <DashboardCard
                        key={dashboard.id}
                        dashboard={dashboard}
                        onDashboardUpdated={handleDashboardUpdated}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
