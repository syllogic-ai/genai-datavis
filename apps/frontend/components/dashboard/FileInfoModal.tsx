'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalClose
} from '@/components/ui/responsive-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FileInfoProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string;
  filePath?: string;
}

interface FileStats {
  size: number;
  created: string;
  modified: string;
  rows?: number;
  columns?: number;
}

export function FileInfoModal({ isOpen, onOpenChange, fileName, filePath }: FileInfoProps) {
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Explicit handler for closing the modal
  const handleCloseModal = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    async function fetchFileInfo() {
      if (!filePath || !isOpen) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/csv/info?filePath=${encodeURIComponent(filePath)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file info: ${response.statusText}`);
        }
        
        const stats = await response.json();
        setFileStats(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file information');
        console.error('Error fetching file info:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && filePath) {
      fetchFileInfo();
    }
  }, [filePath, isOpen]);

  // Format bytes to human-readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveModalContent side="bottom">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>File Information</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Details about {fileName || 'the file'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : fileStats ? (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Property</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">File name</TableCell>
                    <TableCell>{fileName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">File size</TableCell>
                    <TableCell>{formatBytes(fileStats.size)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Created</TableCell>
                    <TableCell>{new Date(fileStats.created).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Last modified</TableCell>
                    <TableCell>{new Date(fileStats.modified).toLocaleString()}</TableCell>
                  </TableRow>
                  {fileStats.rows !== undefined && (
                    <TableRow>
                      <TableCell className="font-medium">Rows</TableCell>
                      <TableCell>{fileStats.rows}</TableCell>
                    </TableRow>
                  )}
                  {fileStats.columns !== undefined && (
                    <TableRow>
                      <TableCell className="font-medium">Columns</TableCell>
                      <TableCell>{fileStats.columns}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">Path</TableCell>
                    <TableCell className="break-all">{filePath}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm">No file information available</div>
          )}
        </div>
        <ResponsiveModalClose onClick={handleCloseModal} />
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
} 