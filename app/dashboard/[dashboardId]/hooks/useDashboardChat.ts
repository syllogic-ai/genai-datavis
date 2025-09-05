"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { createChat } from '@/app/lib/chatActions';

/**
 * Hook to manage the main chat session for a dashboard
 * Gets existing chat or creates a new one
 */
export function useDashboardChat(dashboardId: string) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!user;

  useEffect(() => {
    if (!dashboardId || !isSignedIn || !user?.id) {
      setIsLoading(false);
      return;
    }

    // Skip if we already have a chatId to prevent unnecessary re-initialization
    if (chatId) {
      setIsLoading(false);
      return;
    }

    const getOrCreateChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, try to find an existing chat for this dashboard
        const response = await fetch(`/api/dashboard/${dashboardId}/chat/latest`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to fetch existing chat`);
        }
        
        const { chat: existingChat } = await response.json();

        if (existingChat) {
          // Use the most recent chat for this dashboard
          setChatId(existingChat.id);
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
  }, [dashboardId, user?.id, isSignedIn, chatId]);

  return {
    chatId,
    isLoading,
    error
  };
}