"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createChat } from '@/app/lib/chatActions';
import { supabase } from '@/app/lib/supabase';

/**
 * Hook to manage the main chat session for a dashboard
 * Gets existing chat or creates a new one
 */
export function useDashboardChat(dashboardId: string) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!dashboardId || !isSignedIn || !user) {
      setIsLoading(false);
      return;
    }

    const getOrCreateChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, try to find an existing chat for this dashboard
        const { data: existingChats, error: fetchError } = await supabase
          .from('chats')
          .select('id')
          .eq('dashboard_id', dashboardId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) {
          throw fetchError;
        }

        if (existingChats && existingChats.length > 0) {
          // Use the most recent chat for this dashboard
          setChatId(existingChats[0].id);
        } else {
          // Create a new chat for this dashboard
          const newChat = await createChat(
            user.id,
            dashboardId,
            "Starting dashboard conversation..."
          );
          setChatId(newChat.id);
        }
      } catch (err) {
        console.error('Error getting or creating dashboard chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    getOrCreateChat();
  }, [dashboardId, user?.id, isSignedIn]);

  return {
    chatId,
    isLoading,
    error
  };
}