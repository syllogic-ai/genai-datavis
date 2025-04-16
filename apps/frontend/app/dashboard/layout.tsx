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
import { Chat } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  // Fetch chats from the server if user is logged in
  const chats = userId ? await getChats(userId) : [];
  
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" chats={chats} />
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