import { NextResponse } from "next/server";
import { getTasksByGroupId } from "@/app/lib/chatActions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskGroupId = searchParams.get("task_group_id");

  if (!taskGroupId) {
    return NextResponse.json(
      { error: "Missing task_group_id" },
      { status: 400 }
    );
  }

  try {
    const tasks = await getTasksByGroupId(taskGroupId);
    const minimal = tasks.map((t: any) => ({ title: t.title, status: t.status }));
    return NextResponse.json({ tasks: minimal });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
