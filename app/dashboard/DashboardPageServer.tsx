import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/db";
import { dashboards } from "@/db/schema";
import { eq } from "drizzle-orm";

import { SiteHeader } from "@/components/dashboard/SiteHeader";
import { DashboardListClient } from "./DashboardListClient";
import type { Dashboard } from "@/db/schema";

// Server Component - runs on server, pre-renders with data
export default async function DashboardPageServer() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Fetch dashboards on server
  let userDashboards: Dashboard[] = [];
  let error: string | null = null;

  try {
    userDashboards = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.userId, session.user.id))
      .orderBy(dashboards.updatedAt);
  } catch (err) {
    console.error("Failed to load dashboards:", err);
    error = "Failed to load dashboards";
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SiteHeader chatTitle="Home" />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <DashboardListClient 
            initialDashboards={userDashboards}
            error={error}
            userId={session.user.id}
          />
        </div>
      </div>
    </div>
  );
}