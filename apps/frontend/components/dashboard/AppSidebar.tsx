"use client";

import * as React from "react";
import { Command, Home, Plus, Settings, Palette, ChevronsUpDown, LogOut, HelpCircle, Moon, Sun, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavMain } from "@/components/dashboard/NavMain";
import { Dashboard } from "@/db/schema";
import { DashboardCreateEditPopover } from "./DashboardCreateEditPopover";
import { useDashboardContext } from "./DashboardUserContext";
import { useTheme } from "@/lib/ThemeProvider";
import Link from "next/link";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentChatId?: string;
}

export function AppSidebar({
  currentChatId,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { isMobile } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { dashboards, currentDashboardWidgets, addDashboard, updateDashboard, deleteDashboard } = useDashboardContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Extract active dashboard ID from pathname
  const activeChatId =
    currentChatId ||
    (pathname?.includes("/dashboard/")
      ? pathname.split("/dashboard/")[1]
      : undefined);

  const handleDashboardCreated = (dashboard: Dashboard) => {
    addDashboard(dashboard);
    // Navigate to the new dashboard
    router.push(`/dashboard/${dashboard.id}`);
  };

  const handleDashboardUpdated = (dashboard: Dashboard) => {
    updateDashboard(dashboard);
  };

  const handleDashboardDeleted = (dashboardId: string) => {
    deleteDashboard(dashboardId);
  };

  return (
    <Sidebar variant="inset" className="fixed h-full" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="mb-6">
            <SidebarMenuButton size="sm" asChild className="hover:bg-transparent">
              <Link href="/dashboard" className="py-2">
                {mounted && (
                  <div className="w-full flex py-1" style={{ height: 32 }}>
                    <Image
                      src={
                        theme === "dark"
                          ? "https://ptsbrkwalysbchtdharj.supabase.co/storage/v1/object/public/web-public/brand-kit/syllogic_logo.png"
                          : "https://ptsbrkwalysbchtdharj.supabase.co/storage/v1/object/public/web-public/brand-kit/syllogic_logo_black.png"
                      }
                      alt="Syllogic Logo"
                      width={100}
                      height={28}
                      priority
                      style={{ objectFit: "contain" }}
                      className="w-auto h-full"
                    />
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* Home Button */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard" className={mounted && pathname === '/dashboard' ? 'bg-secondary' : ''}>
                <Home className="size-4" />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

            {/* Theme Generator Button */}
            <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/themes" className={mounted && pathname === '/dashboard/themes' ? 'bg-secondary' : ''}>
                <Palette className="size-4" />
                <span>Themes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* Settings Button */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings" className={mounted && pathname?.startsWith('/dashboard/settings') ? 'bg-secondary' : ''}>
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
        
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="overflow-y-auto">
        <NavMain
          dashboards={dashboards}
          currentDashboardId={activeChatId}
          currentDashboardWidgets={currentDashboardWidgets}
          onDashboardCreated={handleDashboardCreated}
          onDashboardUpdated={handleDashboardUpdated}
          onDashboardDeleted={handleDashboardDeleted}
        />
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          {/* User Profile with Dropdown Menu - Only render after mount and when user is loaded */}
          {mounted && isLoaded && user && (
            <SidebarMenuItem>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="h-8 w-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || "U"}
                      </span>
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {user.fullName || user.firstName || "User"}
                      </span>
                      <span className="truncate text-xs">
                        {user.emailAddresses[0]?.emailAddress || ""}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="flex flex-row gap-2 items-center font-normal">
My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={toggleTheme} className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground">
                      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground">
                      <a href="mailto:giannis@syllogic.ai" className="flex items-center">
                        <HelpCircle />
                        Help & Support
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <SignOutButton>
                    <DropdownMenuItem variant="destructive">
                      <LogOut />
                      Log out
                    </DropdownMenuItem>
                  </SignOutButton>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
