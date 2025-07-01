"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  File, 
  X, 
  Eye, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Image,
  Table,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dropzone, DropzoneEmptyState, DropzoneContent } from "@/components/dropzone";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { formatBytes } from "@/components/dropzone";
import toast from "react-hot-toast";

export interface ExistingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  uploadedAt: Date;
  status?: string;
}

interface EnhancedFileManagerProps {
  dashboardId: string;
  existingFiles: ExistingFile[];
  onFileAdded: (file: ExistingFile) => void;
  onFileRemoved: (fileId: string) => void;
  onRefreshFiles?: () => void;
  maxFiles?: number;
  className?: string;
}

export function EnhancedFileManager({
  dashboardId,
  existingFiles,
  onFileAdded,
  onFileRemoved,
  onRefreshFiles,
  maxFiles = 10,
  className,
}: EnhancedFileManagerProps) {
  const [showExistingFiles, setShowExistingFiles] = useState(true);
  const [duplicateAttempts, setDuplicateAttempts] = useState<string[]>([]);
  const [deletingFileIds, setDeletingFileIds] = useState<Set<string>>(new Set());

  const uploadHook = useSupabaseUpload({
    bucketName: 'test-bucket',
    path: `dashboards/${dashboardId}`,
    maxFiles: maxFiles,
    upsert: true, // Allow overwriting existing files
    allowedMimeTypes: [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/plain'
    ],
  });

  const { loading: isUploading, errors: uploadErrors } = uploadHook;

  // Check for duplicate files before upload
  const checkForDuplicates = useCallback((newFiles: File[]) => {
    const duplicates = newFiles.filter(newFile =>
      existingFiles.some(existing => existing.name === newFile.name)
    );
    
    if (duplicates.length > 0) {
      setDuplicateAttempts(duplicates.map(f => f.name));
      return duplicates;
    }
    
    setDuplicateAttempts([]);
    return [];
  }, [existingFiles]);

  // Enhanced upload processing
  useEffect(() => {
    if (uploadHook.isSuccess && uploadHook.files.length > 0) {
      const processUploads = async () => {
        // Check for duplicates and warn user (but don't block upload since we use upsert=true)
        const duplicates = checkForDuplicates(uploadHook.files);
        if (duplicates.length > 0) {
          toast.warning(
            `File${duplicates.length > 1 ? 's' : ''} ${duplicates.map(f => f.name).join(', ')} already exist${duplicates.length > 1 ? '' : 's'} and will be replaced.`,
            { duration: 4000 }
          );
          console.log(`[EnhancedFileManager] Replacing existing files: ${duplicates.map(f => f.name).join(', ')}`);
        }

        // Ensure dashboard exists
        try {
          const dashboardResponse = await fetch(`/api/dashboards/${dashboardId}`);
          if (!dashboardResponse.ok && dashboardResponse.status === 404) {
            const createResponse = await fetch('/api/dashboards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: dashboardId,
                name: 'My Dashboard',
                description: 'Created from file upload',
              }),
            });
            
            if (!createResponse.ok) {
              throw new Error('Failed to create dashboard');
            }
          }
        } catch (error) {
          console.error('Error checking/creating dashboard:', error);
          toast.error('Failed to prepare dashboard for upload');
          return;
        }

        // Process file uploads
        for (const file of uploadHook.files) {
          if (uploadHook.successes.includes(file.name)) {
            try {
              const response = await fetch(`/api/dashboards/${dashboardId}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileName: file.name,
                  storagePath: `test-bucket/dashboards/${dashboardId}/${file.name}`,
                  fileType: 'original',
                }),
              });

              if (response.ok) {
                const data = await response.json();
                const newFile: ExistingFile = {
                  id: data.file.id,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  storagePath: `test-bucket/dashboards/${dashboardId}/${file.name}`,
                  uploadedAt: new Date(),
                };
                
                onFileAdded(newFile);
                toast.success(`${file.name} uploaded successfully! Click "Continue to Dashboard" when ready.`, {
                  duration: 4000,
                });
              } else {
                // Database record creation failed, but file is in storage
                const errorText = await response.text();
                console.error(`[EnhancedFileManager] Database record creation failed for ${file.name}: ${response.status} - ${errorText}`);
                throw new Error(`Failed to create database record: ${response.status}`);
              }
            } catch (error) {
              console.error(`[EnhancedFileManager] Error creating file record for ${file.name}:`, error);
              
              // If database record creation fails, the file remains in storage
              // Since we now use upsert=true, this will be overwritten on next upload attempt
              console.warn(`[EnhancedFileManager] File ${file.name} exists in storage but not in database. Next upload will overwrite it.`);
              
              toast.error(`Failed to register ${file.name} in database. File uploaded to storage but not linked to dashboard.`);
            }
          }
        }

        // Refresh files from database
        if (onRefreshFiles) {
          setTimeout(() => {
            onRefreshFiles();
          }, 500);
        }

        // Clear upload state and reset duplicate attempts
        setTimeout(() => {
          uploadHook.setFiles([]);
          uploadHook.setErrors([]);
          uploadHook.setSuccesses([]);
          setDuplicateAttempts([]);
        }, 1000);
      };

      processUploads();
    }
  }, [uploadHook.isSuccess, uploadHook.files, uploadHook.successes, checkForDuplicates, dashboardId, onFileAdded, onRefreshFiles]);

  const getFileIcon = (type: string) => {
    if (!type) return <File className="w-4 h-4" />;
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.includes('csv') || type.includes('spreadsheet')) return <Table className="w-4 h-4" />;
    if (type.includes('json')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const handleRemoveFile = async (fileId: string, fileName: string) => {
    // Prevent duplicate deletions
    if (deletingFileIds.has(fileId)) {
      console.log(`[EnhancedFileManager] File ${fileId} is already being deleted, skipping duplicate request`);
      return;
    }

    try {
      // Mark file as being deleted
      setDeletingFileIds(prev => new Set(prev).add(fileId));
      
      console.log(`[EnhancedFileManager] Starting deletion of file ${fileId} (${fileName})`);
      const response = await fetch(`/api/dashboards/${dashboardId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Only call the callback to update UI state, don't make another API call
        onFileRemoved(fileId);
        toast.success(`${fileName} removed successfully`);
        console.log(`[EnhancedFileManager] Successfully deleted file ${fileId}`);
      } else {
        const errorText = await response.text();
        console.error(`[EnhancedFileManager] Failed to delete file ${fileId}: ${response.status} - ${errorText}`);
        throw new Error(`Failed to remove file: ${response.status}`);
      }
    } catch (error) {
      console.error(`[EnhancedFileManager] Error removing file ${fileId}:`, error);
      toast.error('Failed to remove file');
    } finally {
      // Always remove from deleting set, even if there was an error
      setDeletingFileIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  return (
    <div className={className}>
      {/* Existing Files Section */}
      {existingFiles.length > 0 && (
        <Card className="mb-6 bg-card border">
          <div className="p-4">
            <button
              onClick={() => setShowExistingFiles(!showExistingFiles)}
              className="w-full flex items-center justify-between text-left hover:bg-muted/50 -m-2 p-2 rounded-md transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-2 py-1">
                  {existingFiles.length}
                </Badge>
                <h3 className="font-medium text-foreground">
                  Connected Data Source{existingFiles.length === 1 ? '' : 's'}
                </h3>
              </div>
              {showExistingFiles ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showExistingFiles && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <Separator className="mb-4" />
                  <div className="space-y-3">
                    {existingFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-muted-foreground">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatBytes(file.size)}</span>
                              <span>•</span>
                              <span>
                                {file.uploadedAt 
                                  ? new Date(file.uploadedAt).toLocaleDateString()
                                  : 'Recently uploaded'
                                }
                              </span>
                              {file.status && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    {file.status}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                            title="Preview file"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveFile(file.id, file.name);
                            }}
                            disabled={deletingFileIds.has(file.id)}
                            title={deletingFileIds.has(file.id) ? "Removing..." : "Remove file"}
                          >
                            {deletingFileIds.has(file.id) ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Duplicate Warning */}
      {duplicateAttempts.length > 0 && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Duplicate files detected:</strong> {duplicateAttempts.join(', ')} 
            {duplicateAttempts.length === 1 ? ' already exists' : ' already exist'} in your dashboard.
            Remove the existing file first if you want to replace it.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <Card className="bg-card border">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-medium text-foreground mb-1">
              Upload New Files
            </h3>
            <p className="text-sm text-muted-foreground">
              Support for CSV, Excel, JSON, and text files
              {existingFiles.length > 0 && (
                <span className="ml-1">
                  ({existingFiles.length}/{maxFiles} files connected)
                </span>
              )}
            </p>
          </div>

          <Dropzone {...uploadHook}>
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>

          {uploadHook.errors.length > 0 && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Upload failed:</strong> {uploadHook.errors[0]?.message || 'Please try again'}
              </AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <Alert className="mt-4 border-blue-200 bg-blue-50">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Processing upload...</strong> Please wait while we save your files.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* File Limits Info */}
      {existingFiles.length >= maxFiles && (
        <Alert className="mt-4 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You've reached the maximum of {maxFiles} files. Remove existing files to add new ones.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}