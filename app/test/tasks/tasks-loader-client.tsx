"use client";

import { useEffect, useMemo, useState } from "react";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

type Task = { title: string; status: string };

const fallbackLoadingStates = [
  { text: "Waking up the AI hamsters..." },
  { text: "Brewing an extra-strong coffee..." },
  { text: "Convincing charts to behave..." },
  { text: "Teaching data some manners..." },
  { text: "Assembling tiny bar charts with tweezers..." },
  { text: "Optimizing witty responses..." },
  { text: "Almost there... probably." },
];

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

  const isWaitingForTasks = tasks.length === 0;

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      {isWaitingForTasks ? (
        <MultiStepLoader loadingStates={fallbackLoadingStates} loading={loading} duration={1600} loop />
      ) : (
        <MultiStepLoader loadingStates={loadingStates} loading={loading} duration={2000} />
      )}
    </div>
  );
}

function mapStatus(s: string): "pending" | "in_progress" | "completed" | "failed" {
  if (s === "in-progress") return "in_progress";
  if (s === "completed") return "completed";
  if (s === "failed") return "failed";
  return "pending";
}
