import TasksLoaderClient from "@/app/test/tasks/tasks-loader-client";
import { getTasksByGroupId } from "@/app/lib/chatActions";

export default async function TasksTestPage() {
  const taskGroupId = "req_b2e9354f-16a6-4cb1-9eb6-9baf636f4e801";

  const tasksRaw = await getTasksByGroupId(taskGroupId);
  const tasks: { title: string; status: string }[] = (tasksRaw || []).map(
    (t: any) => ({ title: t.title, status: t.status })
  );

  return <TasksLoaderClient initialTasks={tasks} taskGroupId={taskGroupId} />;
}
