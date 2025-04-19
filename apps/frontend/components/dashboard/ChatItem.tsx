"use client";

import { useState, FormEvent, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Chat } from "@/db/schema";
import { renameChat, deleteChat } from "@/app/lib/chatActions";
import { chatEvents, CHAT_EVENTS } from "@/app/lib/events";
import { useUser } from "@clerk/nextjs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

export function ChatItem({ chat, isActive }: { chat: Chat; isActive: boolean }) {
  const router = useRouter();
  const { user } = useUser();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRename = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user || !newTitle.trim()) return;
    
    try {
      const updatedChat = await renameChat(chat.id, user.id, newTitle);
      setIsRenaming(false);
      
      // Emit a chat renamed event for any components that need to know about the title change
      chatEvents.emit(CHAT_EVENTS.CHAT_RENAMED, {
        chatId: chat.id, 
        newTitle: newTitle
      });
      
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
  };

  const handleDelete = async () => {
    if (!user || isPending) return;
    
    try {
      // Close both the dialog and dropdown
      setIsDeleteDialogOpen(false);
      setIsDropdownOpen(false);
      
      // Start transition to indicate loading state
      startTransition(() => {
        // Redirect to dashboard first
        router.replace('/dashboard');
        
        // Then delete the chat
        setTimeout(async () => {
          try {
            await deleteChat(chat.id, user.id);
            router.refresh();
          } catch (error) {
            console.error("Error during chat deletion:", error);
          }
        }, 100);
      });
    } catch (error) {
      console.error("Error initiating delete process:", error);
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isRenaming ? (
        <form onSubmit={handleRename} className="px-2">
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-7 py-1"
              onBlur={() => {
                if (newTitle.trim() === chat.title) {
                  setIsRenaming(false);
                }
              }}
            />
          </div>
        </form>
      ) : (
        <>
          <Link href={`/dashboard/c/${chat.id}`} passHref>
            <SidebarMenuButton 
              tooltip="Chat" 
              className={`truncate ${isActive ? 'bg-neutral-200 hover:bg-neutral-300' : 'hover:bg-neutral-200'}`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span>{chat.title}</span>
            </SidebarMenuButton>
          </Link>
          
          <div className={`absolute right-1 top-1.5 transition-opacity ${isHovering ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsRenaming(true);
                    setNewTitle(chat.title);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
      
      <Dialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            // Ensure dropdown is also closed when dialog is closed
            setIsDropdownOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setIsDropdownOpen(false);
              }} 
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 