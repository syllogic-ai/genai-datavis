'use client'

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ChevronDown, Table as TableIcon, Download, ExternalLink, Info } from "lucide-react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalClose
} from "@/components/ui/responsive-modal"
import { CsvDataPreview } from "./CsvDataPreview"
import { FileInfoModal } from "./FileInfoModal"

export function SiteHeader({chatTitle, fileStatus, fileName, filePath}: {chatTitle?: string, fileStatus?: string, fileName?: string, filePath?: string}) {
  const [isDataPreviewOpen, setIsDataPreviewOpen] = useState(false);
  const [isFileInfoOpen, setIsFileInfoOpen] = useState(false);
  
  // Function to truncate filename if it's too long
  const getTruncatedFileName = (name?: string) => {
    if (!name) return "";
    return name.length > 20 ? `${name.substring(0, 17)}...` : name;
  };

  const handleDownload = () => {
    if (!filePath) {
      console.log("File path is missing, cannot download file");
      return;
    }
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = `/api/csv/download?filePath=${encodeURIComponent(filePath)}`;
    link.download = fileName || 'download.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Open and close handlers for data preview modal
  const openDataPreview = () => setIsDataPreviewOpen(true);
  const closeDataPreview = () => setIsDataPreviewOpen(false);
  
  // Open and close handlers for file info modal
  const openFileInfo = () => setIsFileInfoOpen(true);
  const closeFileInfo = () => setIsFileInfoOpen(false);

  // For debugging - log the props to see what's available
  console.log("SiteHeader props:", { chatTitle, fileStatus, fileName, filePath });

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{chatTitle || "New chat"}</h1>
        </div>
        {fileName && (
          <>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 border text-sm font-medium">
                {getTruncatedFileName(fileName)}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="flex items-center gap-2"
                  onClick={openDataPreview}
                  disabled={!filePath}
                >
                  <TableIcon className="h-4 w-4" />
                  Data preview
                  {!filePath && <span className="ml-1 text-xs opacity-50">(Path missing)</span>}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center gap-2"
                  onClick={handleDownload}
                  disabled={!filePath}
                >
                  <Download className="h-4 w-4" />
                  Download file
                  {!filePath && <span className="ml-1 text-xs opacity-50">(Path missing)</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center gap-2"
                  onClick={openFileInfo}
                  disabled={!filePath}
                >
                  <Info className="h-4 w-4" />
                  File info
                  {!filePath && <span className="ml-1 text-xs opacity-50">(Path missing)</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {filePath && (
              <>
                <ResponsiveModal 
                  open={isDataPreviewOpen} 
                  onOpenChange={setIsDataPreviewOpen}
                >
                  <ResponsiveModalContent side="bottom" className="max-w-4xl max-h-[90vh]">
                    <ResponsiveModalHeader className="pb-2">
                      <ResponsiveModalTitle>Data Preview: {fileName}</ResponsiveModalTitle>
                      <ResponsiveModalDescription className="text-xs">
                        CSV data from the file you uploaded.
                      </ResponsiveModalDescription>
                    </ResponsiveModalHeader>
                    <div className="flex-1 overflow-hidden">
                      <CsvDataPreview filePath={filePath} />
                    </div>
                  </ResponsiveModalContent>
                </ResponsiveModal>

                <FileInfoModal 
                  isOpen={isFileInfoOpen} 
                  onOpenChange={setIsFileInfoOpen}
                  fileName={fileName}
                  filePath={filePath}
                />
              </>
            )}
          </>
        )}
      </div>
    </header>
  )
}