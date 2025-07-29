"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import {
  Forward,
  Database,
} from "lucide-react";
import { Button } from "../ui/button";

export function DashboardHeader({
  dashboardTitle,
  dashboardId,
}: {
  dashboardTitle?: string;
  dashboardId?: string;
}) {
  const router = useRouter();

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">
            {dashboardTitle || "New dashboard"}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">

          {/* Sources Button */}
          <Button 
            variant="outline" 
            className="h-fit py-1 px-4 rounded-lg text-sm font-medium gap-2"
            onClick={() => {
              console.log('Sources button clicked, dashboardId:', dashboardId);
              if (dashboardId) {
                router.push(`/dashboard/${dashboardId}?setup=true`);
              } else {
                console.error('Dashboard ID is not available');
              }
            }}
            disabled={!dashboardId}
          >
            <Database className="size-4" />
            Sources
          </Button>

          {/* Publish Button */}
          <Button className="bg-primary h-fit py-1 px-4 text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm font-medium gap-2">
            Publish
            <Forward className="size-4" />
          </Button>
        </div>
      </div>

    </header>
  );
}
