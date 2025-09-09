"use client";

import { useEffect, useMemo, useState } from "react";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

type Task = { title: string; status: string };

export default function TasksLoaderClient({
  initialTasks,
  taskGroupId,
}: {
  initialTasks: Task[];
  taskGroupId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState(true);

  // Poll for updates every 2s
  useEffect(() => {
    setLoading(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks/by-group?task_group_id=${encodeURIComponent(taskGroupId)}`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data?.tasks)) {
          setTasks(data.tasks);
        }
      } catch (e) {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskGroupId]);

  const loadingStates = useMemo(
    () => tasks.map((t) => ({ text: t.title, status: mapStatus(t.status) })),
    [tasks]
  );

  // Turn off loader when all tasks are terminal
  useEffect(() => {
    const allDone = tasks.length > 0 && tasks.every((t) => ["completed", "failed"].includes(mapStatus(t.status)));
    setLoading(!allDone);
  }, [tasks]);

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      <MultiStepLoader loadingStates={loadingStates} loading={loading} duration={2000} />
    </div>
  );
}

function mapStatus(s: string): "pending" | "in_progress" | "completed" | "failed" {
  if (s === "in-progress") return "in_progress";
  if (s === "completed") return "completed";
  if (s === "failed") return "failed";
  return "pending";
}
