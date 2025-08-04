"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Globe, Lock, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface PublishDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
  dashboardId: string;
  isPublic: boolean;
  isLoading?: boolean;
}

export function PublishDashboardModal({
  isOpen,
  onClose,
  onPublish,
  onUnpublish,
  dashboardId,
  isPublic,
  isLoading = false,
}: PublishDashboardModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const publicUrl = `${window.location.origin}/d/${dashboardId}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public URL copied to clipboard!", {
        position: "top-right",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to copy URL:", error);
      toast.error("Failed to copy URL");
    }
  };

  const handleTogglePublish = async () => {
    setIsUpdating(true);
    try {
      if (isPublic) {
        await onUnpublish();
        toast.success("Dashboard is now private", {
          position: "top-right",
          duration: 3000,
        });
      } else {
        await onPublish();
        toast.success("Dashboard published successfully!", {
          position: "top-right",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
      toast.error(isPublic ? "Failed to unpublish dashboard" : "Failed to publish dashboard");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPublic ? (
              <>
                <Globe className="h-5 w-5 text-green-600" />
                Dashboard Published
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 text-gray-600" />
                Publish Dashboard
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isPublic ? (
              "Your dashboard is currently public and accessible to anyone with the link."
            ) : (
              "Make your dashboard public so anyone with the link can view it."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isPublic && (
            <div className="space-y-2">
              <Label htmlFor="public-url">Public URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="public-url"
                  value={publicUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="px-3"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this link to give others read-only access to your dashboard.
              </p>
            </div>
          )}

          {!isPublic && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start space-x-3">
                <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Public Access</p>
                  <p className="text-sm text-muted-foreground">
                    Anyone with the link will be able to view your dashboard in read-only mode.
                    They won&apos;t be able to edit, delete, or see sensitive data sources.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleTogglePublish}
            disabled={isUpdating || isLoading}
            variant={isPublic ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublic ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            {isUpdating
              ? isPublic
                ? "Unpublishing..."
                : "Publishing..."
              : isPublic
              ? "Make Private"
              : "Publish Dashboard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}