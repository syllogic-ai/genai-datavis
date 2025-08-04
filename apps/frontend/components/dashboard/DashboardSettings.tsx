"use client";

import { useState } from 'react';
import {
  Settings,
  Monitor,
  FileText,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DashboardWidth = 'full' | 'constrained';

interface DashboardSettingsProps {
  currentWidth: DashboardWidth;
  onWidthChange: (width: DashboardWidth) => void;
}

export function DashboardSettings({ currentWidth, onWidthChange }: DashboardSettingsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-fit py-1 px-3 rounded-lg text-sm font-medium gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Page Layout</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onWidthChange('full')}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>Full Width</span>
          </div>
          {currentWidth === 'full' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onWidthChange('constrained')}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Blog Layout</span>
          </div>
          {currentWidth === 'constrained' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}