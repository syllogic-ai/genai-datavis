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
  const [isOpen, setIsOpen] = useState(true); // Initially open

  const completedCount = tasks.filter(
    (task) => task.status === "completed" || task.status === "failed"
  ).length;
  const totalCount = tasks.length;

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  return (
    <MovingBorderComponent
      className="w-full min-w-[250px] mx-auto border border-border rounded-lg px-2 py-2 bg-card"
      animate={completedCount == totalCount ? false : true}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="flex flex-col items-left w-full"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              

              <p className="text-sm font-medium text-foreground/40">
                Tasks{" "}
                <span className="ml-1 text-muted-foreground/20 text-xs font-semibold">
                  {completedCount}/{totalCount}
                </span>
              </p>
              {completedCount == totalCount && !tasks.some((task) => task.status === "failed") ? (
                <div className="h-3 w-3 bg-green-800 flex items-center justify-center rounded-full text-primary-foreground/90">
                  <Check className="h-2 w-2" />
                </div>
              ) : tasks.some((task) => task.status === "failed") ? (
                <div className="h-3 w-3 bg-destructive flex items-center justify-center rounded-full text-destructive-foreground">
                  <X className="h-2 w-2" />
                </div>
              ) : (
                <Loader2 className="h-3 w-3 text-muted-foreground/40 animate-spin" />
              )}
            </div>
            <div className="flex items-center">
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground/40" />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <div className="max-h-[100px] overflow-y-auto space-y-3">
            {sortedTasks.map((task, index) => (
                <div key={task.id} className="flex items-center justify-center gap-3">
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
