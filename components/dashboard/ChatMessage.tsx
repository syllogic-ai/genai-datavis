"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TodoTracker } from "./TodoTracker";
import { Task } from "@/db/schema";
import { getTasksByGroupId, updateTaskStatus } from "@/app/lib/chatActions";

interface ChatMessageProps {
  message: {
    role: 'user' | 'ai' | 'system';
    content?: string;
    message?: string; // For backward compatibility
    timestamp: string;
    messageType: string;
    taskGroupId?: string;
    widget_ids?: string[];
    chart_id?: string;
    isPending?: boolean;
    tempId?: string;
  };
  index: number;
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const content = message.content || message.message || '';

  // Fetch tasks if this is an AI task-list message
  useEffect(() => {
    if (message.role === 'ai' && message.messageType === 'task-list' && message.taskGroupId) {
      setIsLoadingTasks(true);
      getTasksByGroupId(message.taskGroupId)
        .then(fetchedTasks => {
          setTasks(fetchedTasks);
        })
        .catch(error => {
        })
        .finally(() => {
          setIsLoadingTasks(false);
        });
    }
  }, [message.role, message.taskGroupId, message.messageType]);

  const handleTaskToggle = async (taskId: string, newStatus: Task['status']) => {
    try {
      // Optimistic update
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus, completedAt: newStatus === 'completed' ? new Date() : null }
            : task
        )
      );

      // Update in database
      await updateTaskStatus(
        taskId, 
        newStatus, 
        newStatus === 'in-progress' ? new Date() : undefined,
        newStatus === 'completed' ? new Date() : undefined
      );
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert optimistic update on error
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, status: task.status === newStatus ? 'pending' : task.status }
            : task
        )
      );
    }
  };

  // For AI task-list messages, render only the TodoTracker without message bubble
  if (message.role === 'ai' && message.messageType === 'task-list') { 
    return (
      <div key={(message as any).tempId || index} className="w-full">
        {message.taskGroupId ? (
          isLoadingTasks ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-muted-foreground">Loading tasks...</span>
            </div>
          ) : tasks.length > 0 ? (
            <TodoTracker 
              tasks={tasks} 
              onTaskToggle={handleTaskToggle}
            />
          ) : (
            <div className="text-sm text-muted-foreground py-2 text-center">
              No tasks found for this message.
            </div>
          )
        ) : (
          <div className="text-sm text-muted-foreground py-2 text-center">
            Task list message without task group ID.
          </div>
        )}
      </div>
    );
  }

  // Regular message rendering for all other message types
  return (
    <div
      key={(message as any).tempId || index}
      className={cn(
        "p-3 rounded-lg max-w-[85%] break-words transition-opacity",
        message.role === 'user'
          ? "ml-auto bg-primary text-primary-foreground"
          : message.role === 'system'
          ? "mr-auto bg-muted/50 text-muted-foreground border"
          : message.role === 'ai'
          ? "mr-auto bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          : "mr-auto bg-muted",
        message.isPending && "opacity-70" // Show pending messages with reduced opacity
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {/* Regular message content */}
          <p className="text-sm whitespace-pre-wrap">{content}</p>
          
          {/* Show widget creation info */}
          {(message.widget_ids || message.chart_id) && (
            <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-xs">
              {message.widget_ids && message.widget_ids.length > 1 ? (
                <div className="flex items-center gap-1">
                  <span className="text-green-700 dark:text-green-300">
                    ✅ Created {message.widget_ids.length} widgets
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-green-700 dark:text-green-300">
                    ✅ Widget created
                  </span>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs opacity-70">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
            {message.isPending && (
              <div className="flex items-center gap-1">
                <div className="animate-spin h-2 w-2 border border-current border-t-transparent rounded-full" />
                <span className="text-xs opacity-70">Sending...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}