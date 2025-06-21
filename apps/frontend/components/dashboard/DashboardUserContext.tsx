"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as ClerkUser } from '@clerk/nextjs/server';
import { User as DbUser } from '@/db/schema';
import { Dashboard } from '@/db/schema';
import { Widget } from '@/types/enhanced-dashboard-types';

// Types for the context values
type DashboardUserContextType = {
  user: ClerkUser | null;
  dbUser: DbUser | null;
};

// Create context with default values
const DashboardUserContext = createContext<DashboardUserContextType>({
  user: null,
  dbUser: null,
});

// Custom hook to use the context
export const useDashboardUser = () => useContext(DashboardUserContext);

// Provider component
export function DashboardUserProvider({
  children,
  user,
  dbUser,
}: {
  children: React.ReactNode;
  user: ClerkUser | null;
  dbUser: DbUser | null;
}) {
  return (
    <DashboardUserContext.Provider value={{ user, dbUser }}>
      {children}
    </DashboardUserContext.Provider>
  );
}

interface DashboardContextType {
  dashboards: Dashboard[];
  currentDashboardId: string | null;
  currentDashboardWidgets: Widget[];
  updateDashboards: (dashboards: Dashboard[]) => void;
  updateCurrentDashboard: (dashboardId: string, widgets: Widget[]) => void;
  addDashboard: (dashboard: Dashboard) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ 
  children, 
  initialDashboards = [] 
}: { 
  children: ReactNode;
  initialDashboards?: Dashboard[];
}) {
  const [dashboards, setDashboards] = useState<Dashboard[]>(initialDashboards);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [currentDashboardWidgets, setCurrentDashboardWidgets] = useState<Widget[]>([]);

  // Update dashboards
  const updateDashboards = (newDashboards: Dashboard[]) => {
    console.log(`[DashboardContext] Updating dashboards: ${newDashboards.length}`);
    setDashboards(newDashboards);
  };

  // Update current dashboard and its widgets
  const updateCurrentDashboard = (dashboardId: string, widgets: Widget[]) => {
    console.log(`[DashboardContext] Updating current dashboard ${dashboardId} with ${widgets.length} widgets`);
    setCurrentDashboardId(dashboardId);
    setCurrentDashboardWidgets(widgets);
  };

  // Add a new dashboard
  const addDashboard = (dashboard: Dashboard) => {
    console.log(`[DashboardContext] Adding new dashboard: ${dashboard.name}`);
    setDashboards(prev => [...prev, dashboard]);
  };

  // Update initial dashboards when prop changes
  useEffect(() => {
    if (initialDashboards.length > 0) {
      setDashboards(initialDashboards);
    }
  }, [initialDashboards]);

  const value: DashboardContextType = {
    dashboards,
    currentDashboardId,
    currentDashboardWidgets,
    updateDashboards,
    updateCurrentDashboard,
    addDashboard,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
} 