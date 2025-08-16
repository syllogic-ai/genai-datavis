import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { ChatMessage, ChatRealtimeOptions, normalizeMessages } from '@/app/lib/types';

/**
 * Hook to subscribe to realtime updates for a specific chat
 * @param chatId The ID of the chat to subscribe to
 * @param options Optional configuration options
 * @returns The current conversation state
 */
export function useChatRealtime(
  chatId: string,
  options?: ChatRealtimeOptions
) {
  // Initialize all state variables unconditionally (React hooks rule)
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user, isSignedIn } = useUser();
  
  // Use refs to prevent re-renders and effect cleanup
  const isMountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const prevChatIdRef = useRef<string | null>(null);

  // Initial data fetch
  useEffect(() => {
    // Skip if user not signed in or we don't have a chat ID
    if (!chatId || !isSignedIn || !user) {
      return;
    }

    // Set loading state only for initial load or chat ID change
    if (prevChatIdRef.current !== chatId) {
      setIsLoading(true);
      setConversation([]); // Clear conversation immediately when chat ID changes
      setError(null); // Clear any previous errors
      prevChatIdRef.current = chatId;
    }

    // Fetch conversation data
    const fetchConversation = async () => {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('conversation')
          .eq('id', chatId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (data?.conversation) {
          // Normalize message format before setting state
          const normalizedConversation = normalizeMessages(data.conversation);
          setConversation(normalizedConversation);
        } else {
          // If no conversation data, set to empty array
          setConversation([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch conversation'));
      } finally {
        // Always exit loading state after fetch attempt
        setIsLoading(false);
      }
    };

    fetchConversation();
  }, [chatId, user, isSignedIn]);

  // Set up realtime subscription separately
  useEffect(() => {
    // Skip if user not signed in or we don't have a chat ID
    if (!chatId || !isSignedIn || !user) {
      return;
    }

    // Clean up any existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    // Create new subscription
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chats', 
          filter: `id=eq.${chatId}` 
        },
        (payload) => {
          // Check if the update is for the current user's chat
          if (payload.new.user_id === user.id) {
            // Normalize message format before setting state
            const normalizedConversation = normalizeMessages(payload.new.conversation);
            setConversation(normalizedConversation);
            
            // Call the onUpdate callback if provided
            if (options?.onUpdate) {
              options.onUpdate(normalizedConversation);
            }
          }
        }
      )
      .subscribe();
    
    // Store channel in ref
    channelRef.current = channel;

    // Clean up subscription on unmount (only once)
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [chatId, user?.id, isSignedIn, options, user]);  // Only depend on these specific values

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    conversation,
    isLoading,
    error
  };
}