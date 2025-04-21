"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chat } from "@/db/schema";
import { chatEvents, CHAT_EVENTS } from "@/app/lib/events";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { ChatItem } from "./ChatItem";

interface SidebarChatListProps {
  initialChats: Chat[];
  currentChatId?: string;
}

export function SidebarChatList({ 
  initialChats, 
  currentChatId 
}: SidebarChatListProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const router = useRouter();

  // Listen for chat renamed events
  useEffect(() => {
    const handleChatRenamed = async (data: { chatId: string; newTitle: string }) => {
      console.log("Chat renamed event received in sidebar:", data);
      
      // Update the chat title in the local state
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === data.chatId 
            ? { ...chat, title: data.newTitle } 
            : chat
        )
      );
    };

    // Handle new chat creation
    const handleChatCreated = async (data: Chat) => {
      console.log("Chat created event received in sidebar:", data);
      
      // Add the new chat to the list (setChats will handle de-duplication)
      setChats(prevChats => {
        // Check if the chat already exists in our list
        const chatExists = prevChats.some(chat => chat.id === data.id);
        
        // Only add the chat if it doesn't already exist
        if (!chatExists) {
          return [data, ...prevChats];
        }
        return prevChats;
      });
    };

    // Subscribe to events
    chatEvents.on(CHAT_EVENTS.CHAT_RENAMED, handleChatRenamed);
    chatEvents.on(CHAT_EVENTS.CHAT_CREATED, handleChatCreated);

    return () => {
      // Clean up subscriptions when component unmounts
      chatEvents.off(CHAT_EVENTS.CHAT_RENAMED, handleChatRenamed);
      chatEvents.off(CHAT_EVENTS.CHAT_CREATED, handleChatCreated);
    };
  }, []);

  if (chats.length === 0) return null;

  return (
    <SidebarMenu className="mt-2">
      <SidebarMenuItem className="mb-1">
        <div className="px-3 text-xs font-medium text-muted-foreground">Recent Chats</div>
      </SidebarMenuItem>
      {chats.map((chat) => {
        const isActive = currentChatId === chat.id;
        return (
          <SidebarMenuItem key={chat.id}>
            <ChatItem chat={chat} isActive={isActive} />
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
} 