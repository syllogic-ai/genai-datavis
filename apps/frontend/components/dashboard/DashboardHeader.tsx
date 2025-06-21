"use client";

import { useState, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  ChevronDown,
  Table as TableIcon,
  Download,
  ExternalLink,
  Info,
  Send,
  SquareArrowUpRight,
  Share2,
  Forward,
  File,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalClose,
} from "@/components/ui/responsive-modal";
import { CsvDataPreview } from "./CsvDataPreview";
import { FileInfoModal } from "./FileInfoModal";
import { Button } from "../ui/button";
import { Dropzone } from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { DropzoneEmptyState, DropzoneContent } from '@/components/dropzone';
import { File as FileType } from '@/db/schema';

const BUCKET_NAME = 'test-bucket';

export function DashboardHeader({
  dashboardTitle,
  dashboardId,
}: {
  dashboardTitle?: string;
  dashboardId?: string;
}) {
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileType[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [hasProcessedUpload, setHasProcessedUpload] = useState(false);

  // Initialize useSupabaseUpload
  const upload = useSupabaseUpload({
    bucketName: BUCKET_NAME,
    allowedMimeTypes: ['text/csv'],
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    upsert: true,
  });

  // Load existing files for the dashboard
  const loadDashboardFiles = useCallback(async () => {
    if (!dashboardId) return;
    
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/files`);
      if (response.ok) {
        const { files } = await response.json();
        setUploadedFiles(files);
      }
    } catch (error) {
      console.error('Error loading dashboard files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    if (dashboardId) {
      loadDashboardFiles();
    }
  }, [dashboardId, loadDashboardFiles]);

  // Handle successful upload
  const handleUploadSuccess = useCallback(async () => {
    if (upload.files.length === 0 || !dashboardId || isProcessingUpload || hasProcessedUpload) {
      return;
    }

    setIsProcessingUpload(true);
    const uploadedFile = upload.files[0];
    const storagePath = `${BUCKET_NAME}/${uploadedFile.name}`;

    try {
      // Create database record and link to dashboard
      const response = await fetch(`/api/dashboards/${dashboardId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadedFile.name,
          storagePath: storagePath,
          fileType: 'original',
        }),
      });

      if (response.ok) {
        const { file } = await response.json();
        setUploadedFiles(prev => [...prev, file]);
        setHasProcessedUpload(true);
        
        // Close modal after successful upload
        setTimeout(() => {
          setIsFileUploadModalOpen(false);
        }, 500);
      } else {
        throw new Error('Failed to create file record');
      }
    } catch (error) {
      console.error('Error creating file record:', error);
    } finally {
      setIsProcessingUpload(false);
    }
  }, [upload.files, dashboardId, isProcessingUpload, hasProcessedUpload]);

  // Watch for upload success
  useEffect(() => {
    if (upload.isSuccess && !isProcessingUpload && !hasProcessedUpload) {
      handleUploadSuccess();
    }
  }, [upload.isSuccess, isProcessingUpload, hasProcessedUpload, handleUploadSuccess]);

  // Handle modal close with proper cleanup
  const handleModalClose = useCallback((open: boolean) => {
    setIsFileUploadModalOpen(open);
    
    if (!open) {
      // Clean up upload state when modal closes
      setTimeout(() => {
        upload.setFiles([]);
        upload.setErrors([]);
        setIsProcessingUpload(false);
        setHasProcessedUpload(false);
      }, 100);
    }
  }, [upload]);

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
          {/* Sources Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="h-fit py-1 px-4 rounded-lg text-sm font-medium gap-2"
                disabled={isLoadingFiles}
              >
                Sources
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {isLoadingFiles ? (
                <DropdownMenuItem disabled className="flex items-center gap-2 p-3">
                  <span className="text-sm text-muted-foreground">Loading files...</span>
                </DropdownMenuItem>
              ) : (
                <>
                  {uploadedFiles.length > 0 && (
                    <>
                      {uploadedFiles.map((file, index) => (
                        <DropdownMenuItem key={file.id} className="flex items-center gap-2 p-3">
                          <File className="size-4 text-muted-foreground" />
                          <span className="truncate text-sm" title={file.originalFilename || file.id}>
                            {file.originalFilename || file.id}
                          </span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem 
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => setIsFileUploadModalOpen(true)}
                    disabled={!dashboardId}
                  >
                    <Plus className="size-4" />
                    <span className="text-sm">Add a file</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Publish Button */}
          <Button className="bg-primary h-fit py-1 px-4 text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm font-medium gap-2">
            Publish
            <Forward className="size-4" />
          </Button>
        </div>
      </div>

      {/* File Upload Modal */}
      <ResponsiveModal open={isFileUploadModalOpen} onOpenChange={handleModalClose}>
        <ResponsiveModalContent className="max-w-lg">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Upload File</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Upload a CSV file to add as a data source for your dashboard.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <div className="p-6 pt-0">
            <Dropzone {...upload}>
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>
            
            {upload.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                Upload failed. Please try again.
              </div>
            )}
            
            {isProcessingUpload && (
              <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded text-sm">
                Processing upload...
              </div>
            )}
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </header>
  );
}
