import { UserButton } from "@clerk/nextjs";
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
import { SiteHeader } from "@/components/dashboard/SiteHeader";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { getChats } from "@/app/lib/actions";
import { User as DbUser, users } from "@/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import db from "@/db";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get Clerk user information
  const { userId } = await auth();
  const clerkUser = await currentUser();
  
  // Ensure user exists in our database
  if (userId && clerkUser) {
    // Check if user exists in our database
    const dbUsers = await db.select().from(users).where(eq(users.id, userId));
    
    if (dbUsers.length === 0) {
      // Create the user in our database if they don't exist
      await db.insert(users).values({
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        createdAt: new Date(),
      });
    }
  }
  
  // Fetch chats from the server if user is logged in
  const chats = userId ? await getChats(userId) : [];
  
  return (
    <SidebarProvider className="relative">
      <AppSidebar variant="inset" chats={chats}/>
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
           {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 