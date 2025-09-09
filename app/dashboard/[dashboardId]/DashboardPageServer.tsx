import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import DashboardPageClient from "./DashboardPageClient";
import { preloadDashboardData } from "./server-cache";

interface DashboardPageServerProps {
  params: Promise<{ dashboardId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Server Component - pre-loads all dashboard data
export default async function DashboardPageServer({
  params,
  searchParams
}: DashboardPageServerProps) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const { dashboardId } = await params;
  const searchParamsData = await searchParams;
  const userId = session.user.id;

  // Pre-load all dashboard data on server in parallel using optimized cache-aware functions
  const { dashboard, files, widgets, chats } = await preloadDashboardData(dashboardId, userId);

  // If dashboard doesn't exist, return 404
  if (!dashboard) {
    console.log(`[DashboardPageServer] Dashboard ${dashboardId} not found or access denied`);
    notFound();
  }

  // Transform files to match the FileRecord interface expected by client
  const transformedFiles = files.map((file: any) => ({
    id: file.id,
    name: file.originalFilename,
    size: file.size || 0,
    type: file.mimeType || 'application/octet-stream',
    storagePath: file.storagePath,
    uploadedAt: new Date(file.createdAt),
  }));

  // Get default chat ID from chats
  const defaultChatId = chats.length > 0 ? chats[0].id : null;

  console.log(`[DashboardPageServer] Pre-loaded dashboard data:`, {
    dashboardId,
    dashboardName: dashboard.name,
    filesCount: transformedFiles.length,
    widgetsCount: widgets.length,
    chatsCount: chats.length,
    defaultChatId,
    userId
  });

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading dashboard...</span>
        </div>
      </div>
    }>
      <DashboardPageClient
        initialDashboard={dashboard}
        initialFiles={transformedFiles}
        initialWidgets={widgets}
        defaultChatId={defaultChatId}
        searchParams={searchParamsData}
        userId={userId}
      />
    </Suspense>
  );
}