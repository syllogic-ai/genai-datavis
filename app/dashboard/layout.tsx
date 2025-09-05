import Link from "next/link";
import { LayoutDashboard, User, History, BarChartBig } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "../../components/ui/sidebar";
import { TooltipProvider } from "../../components/ui/tooltip";
import { SiteHeader } from "@/components/dashboard/SiteHeader";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { getDashboards } from "@/app/lib/actions";
import { User as DbUser, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import db from "@/db";
import { eq } from "drizzle-orm";
import { DashboardProvider } from "@/components/dashboard/DashboardUserContext";
import { LayoutProvider } from "@/components/dashboard/LayoutContext";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get Better Auth user information
  const session = await auth.api.getSession({
    headers: await headers()
  });
  
  const user = session?.user;
  const userId = user?.id;
  
  // Ensure user exists in our database (they should already exist from Better Auth)
  if (userId && user) {
    // Check if user exists in our database
    const dbUsers = await db.select().from(users).where(eq(users.id, userId));
    
    if (dbUsers.length === 0) {
      // Create the user in our database if they don't exist (fallback)
      await db.insert(users).values({
        id: userId,
        email: user.email || "",
        name: user.name || "",
        emailVerified: user.emailVerified || false,
        image: user.image || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  
  // Fetch dashboards from the server if user is logged in
  const dashboards = userId ? await getDashboards(userId) : [];
  
  return (
    <DashboardProvider initialDashboards={dashboards}>
      <LayoutProvider>
        <TooltipProvider delayDuration={0}>
          <SidebarProvider className="">
            <AppSidebar />
            <SidebarInset>
              <div className="flex flex-1 flex-col relative">
                <div className="@container/main flex flex-1 flex-col gap-2">
                 {children}
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </LayoutProvider>
    </DashboardProvider>
  );
} 