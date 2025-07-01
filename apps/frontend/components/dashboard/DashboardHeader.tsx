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
import { EnhancedFileManager, type ExistingFile } from '@/components/enhanced-file-manager';
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


  // Handle modal close
  const handleModalClose = useCallback((open: boolean) => {
    setIsFileUploadModalOpen(open);
  }, []);

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
        <ResponsiveModalContent className="max-w-4xl">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Manage Data Sources</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Upload new files or manage existing data sources for your dashboard.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <div className="p-6 pt-0">
            <EnhancedFileManager
              dashboardId={dashboardId || ''}
              existingFiles={uploadedFiles.map((file): ExistingFile => ({
                id: file.id,
                name: file.originalFilename || 'Unknown',
                size: 0, // File size not available in current schema
                type: file.fileType || 'application/octet-stream',
                storagePath: file.storagePath,
                uploadedAt: file.createdAt || new Date(),
                status: file.status || 'ready'
              }))}
              onFileAdded={(file) => {
                setUploadedFiles(prev => [...prev, {
                  id: file.id,
                  originalFilename: file.name,
                  storagePath: file.storagePath,
                  fileType: file.type,
                  status: 'ready',
                  createdAt: file.uploadedAt,
                  userId: '',
                  dashboardId: null
                }]);
              }}
              onFileRemoved={(fileId) => {
                setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
              }}
              onRefreshFiles={loadDashboardFiles}
              maxFiles={5}
            />
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </header>
  );
}
