"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/dashboard/SiteHeader";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const tabs = [
    { value: "themes", label: "Theme Generator", href: "/dashboard/themes" },
    { value: "account", label: "Account", href: "/dashboard/settings/account" },
    { value: "billing", label: "Billing", href: "/dashboard/settings/billing" },
  ];

  const currentTab = tabs.find(tab => pathname === tab.href)?.value || 
                    (pathname === "/dashboard/themes" ? "themes" : "account");

  return (
    <>
      <SiteHeader chatTitle="Settings" />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account and application preferences
            </p>
          </div>

          <Tabs value={currentTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  onClick={() => router.push(tab.href)}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Card className="p-6">
              {children}
            </Card>
          </Tabs>
        </div>
      </div>
    </>
  );
}