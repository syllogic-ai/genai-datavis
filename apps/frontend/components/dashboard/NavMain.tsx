"use client";

import { MailIcon, PlusCircleIcon, MessageSquare, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Chat } from "@/db/schema";
import Link from "next/link";
import { ChatItem } from "./ChatItem";

export function NavMain({
  items = [],
  chats = [],
  currentChatId,
}: {
  items?: {
    title: string;
    url: string;
  }[];
  chats?: Chat[];
  currentChatId?: string;
}) {
  // If currentChatId is not provided, try to extract it from the pathname
  const pathname = usePathname();
  const router = useRouter();
  const activeChatId = currentChatId || (pathname?.includes('/dashboard/c/') ? 
    pathname.split('/dashboard/c/')[1] : undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the pressed key is 'c' or 'C' and no modifier keys are pressed
      if ((e.key === 'c' || e.key === 'C') && 
          !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        // Check if the active element is an input, textarea, or has contentEditable
        const activeElement = document.activeElement as HTMLElement;
        const isEditableElement = activeElement.tagName === 'INPUT' || 
                                 activeElement.tagName === 'TEXTAREA' || 
                                 activeElement.getAttribute('contenteditable') === 'true';
        
        // Only trigger navigation if user is not typing in an input field
        if (!isEditableElement) {
          router.push('/dashboard');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="min-w-8 h-10 bg-primary border shadow-sm font-semibold text-primary-foreground duration-200 ease-linear hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground"
            >
              <Link href="/dashboard" className="flex items-center justify-between gap-2 h-full w-full">
              

              <span>New chat</span>
              <span className="text-xs text-muted bg-white/20 rounded-sm px-1.5 py-0.5">C</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} className="truncate">
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        {chats.length > 0 && (
          <SidebarMenu className="mt-2">
            <SidebarMenuItem className="mb-1">
              <div className="px-3 text-xs font-medium text-muted-foreground">Recent Chats</div>
            </SidebarMenuItem>
            {chats.map((chat) => {
              const isActive = activeChatId === chat.id;
              return (
                <SidebarMenuItem key={chat.id}>
                  <ChatItem chat={chat} isActive={isActive} />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
