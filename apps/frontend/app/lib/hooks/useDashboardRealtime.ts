import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Widget } from '@/types/enhanced-dashboard-types';
import toast from 'react-hot-toast';

export interface DashboardRealtimeOptions {
  dashboardId: string;
  onWidgetAdded?: (widget: Widget) => void;
  onWidgetUpdated?: (widget: Widget) => void;
  onWidgetDeleted?: (widgetId: string) => void;
  onDashboardUpdated?: (dashboardId: string) => void;
  enableOptimisticUpdates?: boolean;
  enableCrossTabSync?: boolean;
  showNotifications?: boolean;
}

export interface OptimisticUpdate {
  id: string;
  type: 'create' | 'update' | 'delete';
  widget?: Widget;
  widgetId?: string;
  timestamp: number;
  rollback?: () => void;
}

export interface DashboardRealtimeReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
  optimisticUpdates: OptimisticUpdate[];
  addOptimisticUpdate: (update: OptimisticUpdate) => void;
  rollbackOptimisticUpdate: (updateId: string) => void;
  clearOptimisticUpdates: () => void;
  disconnect: () => void;
}

export function useDashboardRealtime(options: DashboardRealtimeOptions): DashboardRealtimeReturn {
  const {
    dashboardId,
    onWidgetAdded,
    onWidgetUpdated,
    onWidgetDeleted,
    onDashboardUpdated,
    enableOptimisticUpdates = true,
    enableCrossTabSync = true,
    showNotifications = true
  } = options;

  const { isSignedIn, userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const handlersRef = useRef({
    onWidgetAdded,
    onWidgetUpdated,
    onWidgetDeleted,
    onDashboardUpdated
  });
  const optimisticUpdatesRef = useRef(optimisticUpdates);
  
  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = {
      onWidgetAdded,
      onWidgetUpdated,
      onWidgetDeleted,
      onDashboardUpdated
    };
  }, [onWidgetAdded, onWidgetUpdated, onWidgetDeleted, onDashboardUpdated]);
  
  // Update optimistic updates ref
  useEffect(() => {
    optimisticUpdatesRef.current = optimisticUpdates;
  }, [optimisticUpdates]);

  // Add optimistic update
  const addOptimisticUpdate = useCallback((update: OptimisticUpdate) => {
    if (!enableOptimisticUpdates) return;
    
    console.log('Adding optimistic update:', update);
    setOptimisticUpdates(prev => [...prev, update]);
    
    if (showNotifications) {
      const action = update.type === 'create' ? 'Creating' : 
                    update.type === 'update' ? 'Updating' : 'Deleting';
      toast.loading(`${action} widget...`, {
        id: update.id,
        duration: 5000,
        position: 'top-right',
      });
    }
  }, [enableOptimisticUpdates, showNotifications]);

  // Rollback optimistic update
  const rollbackOptimisticUpdate = useCallback((updateId: string) => {
    console.log('Rolling back optimistic update:', updateId);
    
    setOptimisticUpdates(prev => {
      const update = prev.find(u => u.id === updateId);
      if (update?.rollback) {
        update.rollback();
      }
      return prev.filter(u => u.id !== updateId);
    });
    
    if (showNotifications) {
      toast.dismiss(updateId);
      toast.error('Operation failed - changes reverted', {
        duration: 4000,
        position: 'top-right',
      });
    }
  }, [showNotifications]);

  // Clear all optimistic updates
  const clearOptimisticUpdates = useCallback(() => {
    console.log('Clearing all optimistic updates');
    setOptimisticUpdates([]);
  }, []);

  // Confirm optimistic update (remove from pending)
  const confirmOptimisticUpdate = useCallback((updateId: string) => {
    console.log('Confirming optimistic update:', updateId);
    
    setOptimisticUpdates(prev => prev.filter(u => u.id !== updateId));
    
    if (showNotifications) {
      toast.dismiss(updateId);
      toast.success('✅ Changes saved', {
        duration: 2000,
        position: 'top-right',
      });
    }
  }, [showNotifications]);

  // Handle widget changes from realtime
  const handleWidgetChange = useCallback((payload: any) => {
    const { eventType, new: newWidget, old: oldWidget } = payload;
    
    // console.log('Widget change detected:', { eventType, newWidget, oldWidget });
    
    // Prevent duplicate processing
    const updateId = `${eventType}-${newWidget?.id || oldWidget?.id}-${Date.now()}`;
    if (lastProcessedUpdateRef.current === updateId) {
      console.log('Skipping duplicate update:', updateId);
      return;
    }
    lastProcessedUpdateRef.current = updateId;
    
    setLastUpdate(new Date());
    
    // Find and confirm matching optimistic update
    const matchingUpdate = optimisticUpdatesRef.current.find(update => {
      if (eventType === 'INSERT' && update.type === 'create') {
        return update.widget?.id === newWidget?.id;
      } else if (eventType === 'UPDATE' && update.type === 'update') {
        return update.widget?.id === newWidget?.id;
      } else if (eventType === 'DELETE' && update.type === 'delete') {
        return update.widgetId === oldWidget?.id;
      }
      return false;
    });
    
    if (matchingUpdate) {
      confirmOptimisticUpdate(matchingUpdate.id);
    }
    
    // Handle the actual change
    switch (eventType) {
      case 'INSERT':
        if (newWidget && handlersRef.current.onWidgetAdded) {
          handlersRef.current.onWidgetAdded(newWidget);
        }
        break;
      case 'UPDATE':
        if (newWidget && handlersRef.current.onWidgetUpdated) {
          handlersRef.current.onWidgetUpdated(newWidget);
        }
        break;
      case 'DELETE':
        if (oldWidget && handlersRef.current.onWidgetDeleted) {
          handlersRef.current.onWidgetDeleted(oldWidget.id);
        }
        break;
    }
  }, [confirmOptimisticUpdate]);

  // Handle dashboard changes
  const handleDashboardChange = useCallback((payload: any) => {
    const { eventType, new: newDashboard } = payload;
    
    // console.log('Dashboard change detected:', { eventType, newDashboard });
    
    if (eventType === 'UPDATE' && newDashboard && handlersRef.current.onDashboardUpdated) {
      handlersRef.current.onDashboardUpdated(newDashboard.id);
      setLastUpdate(new Date());
    }
  }, []);

  // Cross-tab synchronization
  const handleCrossTabSync = useCallback((event: StorageEvent) => {
    if (!enableCrossTabSync) return;
    
    if (event.key === `dashboard-${dashboardId}-updated` && event.newValue) {
      const data = JSON.parse(event.newValue);
      // console.log('Cross-tab sync detected:', data);
      
      if (data.type === 'widget-added' && handlersRef.current.onWidgetAdded) {
        handlersRef.current.onWidgetAdded(data.widget);
      } else if (data.type === 'widget-updated' && handlersRef.current.onWidgetUpdated) {
        handlersRef.current.onWidgetUpdated(data.widget);
      } else if (data.type === 'widget-deleted' && handlersRef.current.onWidgetDeleted) {
        handlersRef.current.onWidgetDeleted(data.widgetId);
      }
      
      setLastUpdate(new Date());
    }
  }, [dashboardId, enableCrossTabSync]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Main effect for setting up realtime subscriptions
  useEffect(() => {
    if (!isSignedIn || !userId || !dashboardId) {
      return;
    }

    const supabase = createClient();

    // Widget changes subscription
    const widgetChannel = supabase
      .channel(`dashboard-${dashboardId}-widgets`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widgets',
          filter: `dashboard_id=eq.${dashboardId}`
        },
        handleWidgetChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dashboards',
          filter: `id=eq.${dashboardId}`
        },
        handleDashboardChange
      )
      .subscribe((status) => {
        // console.log('Dashboard realtime subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = widgetChannel;

    // Cross-tab sync
    if (enableCrossTabSync) {
      window.addEventListener('storage', handleCrossTabSync);
    }

    return () => {
      disconnect();
      if (enableCrossTabSync) {
        window.removeEventListener('storage', handleCrossTabSync);
      }
    };
  }, [
    isSignedIn,
    userId,
    dashboardId,
    enableCrossTabSync,
    disconnect,
    handleCrossTabSync,
    handleDashboardChange,
    handleWidgetChange
  ]);

  // Cleanup optimistic updates after timeout
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const maxAge = 30000; // 30 seconds
      
      setOptimisticUpdates(prev => {
        const expired = prev.filter(update => now - update.timestamp > maxAge);
        
        // Rollback expired updates
        expired.forEach(update => {
          console.log('Rolling back expired optimistic update:', update.id);
          if (update.rollback) {
            update.rollback();
          }
          if (showNotifications) {
            toast.dismiss(update.id);
            toast.error('Operation timed out - changes reverted', {
              duration: 4000,
              position: 'top-right',
            });
          }
        });
        
        return prev.filter(update => now - update.timestamp <= maxAge);
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanup);
  }, [showNotifications]);

  return {
    isConnected,
    lastUpdate,
    optimisticUpdates,
    addOptimisticUpdate,
    rollbackOptimisticUpdate,
    clearOptimisticUpdates,
    disconnect
  };
}