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

    // Fetch conversation data from messages table
    const fetchConversation = async () => {
      try {
        // First verify the chat belongs to the user
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('id')
          .eq('id', chatId)
          .eq('user_id', user.id)
          .single();

        if (chatError) {
          throw chatError;
        }

        if (!chatData) {
          throw new Error('Chat not found or access denied');
        }

        // Fetch messages for this chat
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          throw messagesError;
        }

        if (messagesData && messagesData.length > 0) {
          // Convert messages to chat format
          const chatMessages: ChatMessage[] = messagesData.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            messageType: msg.message_type,
            taskGroupId: msg.task_group_id
          }));
          setConversation(chatMessages);
        } else {
          setConversation([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch conversation'));
      } finally {
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
    
    // Create new subscription for messages table
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `chat_id=eq.${chatId}` 
        },
        async (payload) => {
          // New message added - refetch all messages to maintain order
          try {
            const { data: messagesData, error } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_id', chatId)
              .order('created_at', { ascending: true });

            if (!error && messagesData) {
              const chatMessages: ChatMessage[] = messagesData.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.created_at,
                messageType: msg.message_type,
                taskGroupId: msg.task_group_id
              }));
              setConversation(chatMessages);
              
              if (options?.onUpdate) {
                options.onUpdate(chatMessages);
              }
            }
          } catch (error) {
            console.error('Error fetching updated messages:', error);
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