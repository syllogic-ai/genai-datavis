"use client";

import { Card } from "@/components/ui/card";
import { Palette } from "lucide-react";

export default function ThemeSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Theme Settings</h1>
        <p className="text-muted-foreground">
          Manage your visual preferences
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Palette className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-medium">Dashboard Themes</h2>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Themes are now managed at the dashboard level. Each dashboard can have its own unique theme with custom colors and fonts.
        </p>
        
        <p className="text-sm text-muted-foreground">
          To change a dashboard's theme:
        </p>
        <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2 space-y-1">
          <li>Navigate to the dashboard you want to customize</li>
          <li>Click the &quot;Theme&quot; button in the dashboard header</li>
          <li>Select from preset themes or create your own</li>
          <li>Your theme selection will be saved automatically</li>
        </ol>
      </Card>
    </div>
  );
}