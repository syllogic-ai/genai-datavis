"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IconRenderer } from "@/components/dashboard/DashboardIconRenderer";
import { IconPickerDialog } from "@/components/dashboard/DashboardIconPicker";
import { Dashboard } from "@/db/schema";
import { PlusIcon, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardCreateEditPopoverProps {
  dashboard?: Dashboard;
  trigger?: React.ReactNode;
  onDashboardCreated?: (dashboard: Dashboard) => void;
  onDashboardUpdated?: (dashboard: Dashboard) => void;
  onDialogClose?: () => void;
  asDropdownItem?: boolean;
}

interface FormData {
  name: string;
}

export function DashboardCreateEditPopover({
  dashboard,
  trigger,
  onDashboardCreated,
  onDashboardUpdated,
  onDialogClose,
  asDropdownItem = false,
}: DashboardCreateEditPopoverProps) {
  const [open, setOpen] = useState(false); // Always start closed
  const [selectedIcon, setSelectedIcon] = useState(dashboard?.icon || "DocumentTextIcon");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    defaultValues: {
      name: dashboard?.name || "New Dashboard",
    },
  });

  // Reset form when dashboard changes and auto-open for direct dialogs
  useEffect(() => {
    if (dashboard) {
      form.reset({ name: dashboard.name });
      setSelectedIcon(dashboard.icon);
      // If this is a direct dialog (no trigger), open it when dashboard is set
      if (trigger === null) {
        console.log('[DashboardCreateEditPopover] Dashboard set, opening dialog for editing');
        setOpen(true);
      }
    } else {
      form.reset({ name: "New Dashboard" });
      setSelectedIcon("DocumentTextIcon");
      // If this is a direct dialog (no trigger), open it for new dashboard
      if (trigger === null) {
        console.log('[DashboardCreateEditPopover] No dashboard, opening dialog for creation');
        setOpen(true);
      }
    }
  }, [dashboard, form, trigger]);

  // Cleanup effect for dialog state
  useEffect(() => {
    return () => {
      if (trigger === null && open) {
        console.log('[DashboardCreateEditPopover] Component unmounting, ensuring dialog is closed');
        setOpen(false);
      }
    };
  }, [trigger, open]);

  const handleIconChange = async (iconName: string) => {
    setSelectedIcon(iconName);
    
    // If we're editing an existing dashboard, update the icon immediately
    if (dashboard) {
      try {
        const response = await fetch(`/api/dashboards/${dashboard.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ icon: iconName }),
        });
        
        if (response.ok) {
          const updatedDashboard = await response.json();
          onDashboardUpdated?.(updatedDashboard);
        }
      } catch (error) {
        console.error("Error updating dashboard icon:", error);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!data.name.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (dashboard) {
        // Update existing dashboard
        const response = await fetch(`/api/dashboards/${dashboard.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.name.trim() }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Failed to update dashboard (${response.status})`);
        }
        
        const updatedDashboard = await response.json();
        onDashboardUpdated?.(updatedDashboard);
        setOpen(false);
      } else {
        // Create new dashboard with optimistic UI
        const optimisticDashboard: Partial<Dashboard> = {
          name: data.name.trim(),
          icon: selectedIcon,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const response = await fetch("/api/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: data.name.trim(),
            icon: selectedIcon,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          
          // Handle specific error cases
          if (response.status === 401) {
            throw new Error("You must be signed in to create a dashboard");
          } else if (response.status === 429) {
            throw new Error("Too many requests. Please try again later.");
          } else if (response.status >= 500) {
            throw new Error("Server error. Please try again later.");
          } else {
            throw new Error(errorData?.error || `Failed to create dashboard (${response.status})`);
          }
        }
        
        const newDashboard = await response.json();
        onDashboardCreated?.(newDashboard);
        setOpen(false);
        form.reset({ name: "New Dashboard" });
        setSelectedIcon("DocumentTextIcon");
      }
    } catch (error) {
      console.error("Error saving dashboard:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <PlusIcon className="h-4 w-4" />
      New Dashboard
    </Button>
  );

  // For dropdown menu integration
  if (asDropdownItem) {
    return (
      <>
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Rename button clicked, opening popover...');
            setOpen(true);
          }}
          className="cursor-pointer"
        >
          {trigger}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverContent className="w-80" side="right" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">
                  {dashboard ? "Edit Dashboard" : "Create New Dashboard"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {dashboard ? "Update your dashboard details." : "Set up a new dashboard for your data."}
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center gap-1">
                <div className="flex-shrink-0">
                  <IconPickerDialog
                    selectedIcon={selectedIcon}
                    onIconChange={handleIconChange}
                    trigger={
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-sm"
                      >
                        <IconRenderer
                          icon={selectedIcon}
                          className="h-8 w-8"
                        />
                      </Button>
                    }
                  />
                </div>
                
                <div className="flex-1 h-full">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                      <FormField
                        control={form.control}
                        name="name"
                        rules={{
                          required: "Dashboard name is required",
                          minLength: {
                            value: 1,
                            message: "Name must be at least 1 character",
                          },
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Dashboard name"
                                className="h-10"
                                {...field}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    dashboard ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </>
    );
  }

  // Handle case where there's no trigger (direct popup) - use Dialog instead of Popover
  if (trigger === null) {
    console.log('[DashboardCreateEditPopover] Rendering direct dialog mode, open state:', open);
    return (
      <Dialog 
        open={open} 
        onOpenChange={(newOpen) => {
          console.log('[DashboardCreateEditPopover] Dialog open state changing:', open, '->', newOpen);
          setOpen(newOpen);
          
          // If dialog is closing and we're in direct popup mode, reset state properly
          if (!newOpen && trigger === null) {
            console.log('[DashboardCreateEditPopover] Dialog closing in direct mode, resetting state');
            // Reset form state
            if (dashboard) {
              form.reset({ name: dashboard.name });
              setSelectedIcon(dashboard.icon);
            } else {
              form.reset({ name: "New Dashboard" });
              setSelectedIcon("DocumentTextIcon");
            }
            // Notify parent component that dialog was closed
            onDialogClose?.();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dashboard ? "Edit Dashboard" : "Create New Dashboard"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-4">
              {/* Icon Picker */}
              <div className="flex-shrink-0">
                <IconPickerDialog
                  selectedIcon={selectedIcon}
                  onIconChange={handleIconChange}
                  trigger={
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-sm"
                    >
                      <IconRenderer
                        icon={selectedIcon}
                        className="h-8 w-8"
                      />
                    </Button>
                  }
                />
              </div>
              
              {/* Name Form */}
              <div className="flex-1">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{
                        required: "Dashboard name is required",
                        minLength: {
                          value: 1,
                          message: "Name must be at least 1 character",
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Dashboard name"
                              className="h-12"
                              {...field}
                              onKeyDown={handleKeyDown}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  console.log('[DashboardCreateEditPopover] Cancel button clicked, closing dialog');
                  setOpen(false);
                  // In direct dialog mode, also notify parent
                  if (trigger === null) {
                    onDialogClose?.();
                  }
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  dashboard ? "Update" : "Create"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">
              {dashboard ? "Edit Dashboard" : "Create New Dashboard"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {dashboard ? "Update your dashboard details." : "Set up a new dashboard for your data."}
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center gap-1">
            {/* Icon Picker Square */}
            <div className="flex-shrink-0">
              <IconPickerDialog
                selectedIcon={selectedIcon}
                onIconChange={handleIconChange}
                trigger={
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-sm"
                  >
                    <IconRenderer
                      icon={selectedIcon}
                      className="h-8 w-8"
                    />
                  </Button>
                }
              />
            </div>
            
            {/* Name Form */}
            <div className="flex-1 h-full">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{
                      required: "Dashboard name is required",
                      minLength: {
                        value: 1,
                        message: "Name must be at least 1 character",
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Dashboard name"
                            className="h-10"
                            {...field}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                dashboard ? "Update" : "Create"
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 