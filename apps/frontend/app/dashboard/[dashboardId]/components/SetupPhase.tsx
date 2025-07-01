"use client";

import { motion } from "motion/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { EnhancedFileManager, type ExistingFile } from "@/components/enhanced-file-manager";
import { FileRecord } from "../hooks/useSetupState";

interface SetupPhaseProps {
  dashboardId: string;
  files: FileRecord[];
  onFileAdded: (file: FileRecord) => void;
  onFileRemoved: (fileId: string) => void;
  onContinue: () => void;
  isLoading?: boolean;
  onRefreshFiles?: () => void;
}

export function SetupPhase({
  dashboardId,
  files,
  onFileAdded,
  onFileRemoved,
  onContinue,
  isLoading = false,
  onRefreshFiles,
}: SetupPhaseProps) {
  // Debug logging
  React.useEffect(() => {
    console.log('[SetupPhase] Files prop updated:', files);
  }, [files]);

  // Convert FileRecord to ExistingFile format
  const existingFiles: ExistingFile[] = files.map(file => ({
    id: file.id,
    name: file.name,
    size: file.size,
    type: file.type,
    storagePath: file.storagePath,
    uploadedAt: file.uploadedAt,
    status: 'ready'
  }));

  const handleFileAdded = (file: ExistingFile) => {
    onFileAdded({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      storagePath: file.storagePath,
      uploadedAt: file.uploadedAt,
    });
  };

  return (
    <div className="min-h-[calc(100vh-1rem)] flex items-center justify-center p-6 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Connect Your Data Sources</h1>
          <p className="text-lg text-muted-foreground">Upload your files to get started with data analysis</p>
        </div>

        {/* Enhanced File Manager */}
        <EnhancedFileManager
          dashboardId={dashboardId}
          existingFiles={existingFiles}
          onFileAdded={handleFileAdded}
          onFileRemoved={onFileRemoved}
          onRefreshFiles={onRefreshFiles}
          maxFiles={10}
        />

        {/* Continue Button */}
        <motion.div 
          className="flex flex-col items-center mt-8"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: files.length > 0 ? 1 : 0.5 }}
        >
        
          <Button
            onClick={onContinue}
            disabled={files.length === 0 || isLoading}
            size="lg"
            className={`px-8 py-3 text-base font-medium transition-all ${
              files.length > 0
                ? 'bg-accent hover:bg-accent text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : files.length > 0 ? (
              <>Continue to Dashboard</>
            ) : (
              <>Continue to Dashboard</>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}