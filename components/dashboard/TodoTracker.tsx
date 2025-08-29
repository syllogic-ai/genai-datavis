"use client";

import { useState } from "react";
import {
  Check,
  List,
  ChevronUp,
  ChevronDown,
  Loader2,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Task } from "@/db/schema";
import { MovingBorderComponent } from "../ui/moving-border";

interface TodoTrackerProps {
  tasks: Task[];
  onTaskToggle?: (taskId: string, newStatus: Task["status"]) => void;
}

export function TodoTracker({ tasks, onTaskToggle }: TodoTrackerProps) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [isOpen, setIsOpen] = useState(true); // Initially open

  const completedCount = localTasks.filter(
    (task) => task.status === "completed"
  ).length;
  const totalCount = localTasks.length;

  const sortedTasks = [...localTasks].sort((a, b) => a.order - b.order);

  return (
    <MovingBorderComponent className="w-full mx-auto border border-border rounded-lg px-2 py-2 bg-card" animate={completedCount == totalCount ? false : true}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="flex flex-col items-left w-full"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4 text-muted-foreground/40"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
                />
              </svg>

              <p className="text-sm font-medium text-foreground/40">
                Tasks{" "}
                <span className="ml-1 text-muted-foreground/20 text-xs font-semibold">
                  {completedCount}/{totalCount}
                </span>
              </p>
            </div>
            <div className="flex items-center">
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground/40" />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 px-0.5">
          <div className="space-y-3">
            {sortedTasks.map((task, index) => (
              <div key={task.id} className="flex items-center gap-3">
                {task.status === "in-progress" ? (
                  <Loader2 className="flex-shrink-0 w-3 h-3 animate-spin text-blue-500" />
                ) : (
                  <div
                    className={cn(
                      "flex-shrink-0 w-3 h-3 rounded-full border-1 flex items-center justify-center",
                      task.status === "completed"
                        ? "bg-primary border-primary text-primary-foreground"
                        : task.status === "failed"
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-muted-foreground"
                    )}
                  >
                    {task.status === "completed" && (
                      <Check className="h-2 w-2" />
                    )}
                    {task.status === "failed" && (
                      <X className="h-2 w-2 text-destructive" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs leading-relaxed", // Smaller font size
                      task.status === "completed"
                        ? "text-muted-foreground line-through"
                        : task.status === "failed"
                        ? "text-red-600"
                        : "text-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </MovingBorderComponent>
  );
}
