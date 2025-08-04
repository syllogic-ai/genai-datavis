"use client";

import { useState, useEffect, useCallback } from 'react';
import { DashboardWidth } from '@/components/dashboard/DashboardSettings';

interface DashboardSettings {
  width: DashboardWidth;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  width: 'full'
};

export function useDashboardSettings(dashboardId: string) {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to update dashboard width in database
  const updateDashboardWidth = useCallback(async (width: DashboardWidth) => {
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ width }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dashboard width');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update dashboard width:', error);
      throw error;
    }
  }, [dashboardId]);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First try localStorage for backward compatibility
        const stored = localStorage.getItem(`dashboard-settings-${dashboardId}`);
        let localSettings = null;
        if (stored) {
          localSettings = JSON.parse(stored);
        }

        // Fetch dashboard settings from database
        const response = await fetch(`/api/dashboards/${dashboardId}`);
        if (response.ok) {
          const dashboard = await response.json();
          const dbSettings: DashboardSettings = {
            width: dashboard.width || 'full'
          };
          
          // If we have localStorage settings but no database width, migrate to database
          if (localSettings?.width && !dashboard.width) {
            console.log('Migrating width setting to database:', localSettings.width);
            await updateDashboardWidth(localSettings.width);
            // Clear localStorage after migration
            localStorage.removeItem(`dashboard-settings-${dashboardId}`);
          }
          
          setSettings(dbSettings);
        } else {
          // Fallback to localStorage if database fetch fails
          if (localSettings) {
            setSettings({ ...DEFAULT_SETTINGS, ...localSettings });
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard settings:', error);
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(`dashboard-settings-${dashboardId}`);
          if (stored) {
            const parsedSettings = JSON.parse(stored);
            setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
          }
        } catch (e) {
          console.error('Failed to load localStorage settings:', e);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (dashboardId) {
      loadSettings();
    }
  }, [dashboardId, updateDashboardWidth]);

  // Save settings to database (with localStorage fallback)
  const updateSettings = async (newSettings: Partial<DashboardSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      // Save to database
      if (newSettings.width) {
        await updateDashboardWidth(newSettings.width);
      }
    } catch (error) {
      console.error('Failed to save dashboard settings to database:', error);
      // Fallback to localStorage if database fails
      try {
        localStorage.setItem(
          `dashboard-settings-${dashboardId}`, 
          JSON.stringify(updatedSettings)
        );
      } catch (localError) {
        console.error('Failed to save dashboard settings to localStorage:', localError);
      }
    }
  };

  // Convenience methods
  const setWidth = (width: DashboardWidth) => {
    updateSettings({ width });
  };

  return {
    settings,
    isLoading,
    updateSettings,
    setWidth
  };
}