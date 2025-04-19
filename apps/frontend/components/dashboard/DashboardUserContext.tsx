"use client";

import React, { createContext, useContext } from 'react';
import { User as ClerkUser } from '@clerk/nextjs/server';
import { User as DbUser } from '@/db/schema';

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