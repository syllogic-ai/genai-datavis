"use client";

import React from 'react';
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
// Remove FilePond imports
// import { FilePond, registerPlugin } from 'react-filepond';
// import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
// import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
// import 'filepond/dist/filepond.min.css';
// import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import { SiteHeader } from "@/components/dashboard/SiteHeader";
import { chatEvents, CHAT_EVENTS } from "@/app/lib/events";
import { createChat, createFile } from "@/app/lib/actions";
// Add Dropzone imports
import { Dropzone, DropzoneEmptyState, DropzoneContent } from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { supabase } from "@/app/lib/supabase";

const BUCKET_NAME = 'test-bucket'; // TODO: Replace with your actual bucket name

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dropzone upload hook
  const upload = useSupabaseUpload({
    bucketName: BUCKET_NAME,
    allowedMimeTypes: ['text/csv', '.csv'],
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    upsert: true,
  });

  // Handle post-upload logic
  const handlePostUpload = async () => {
    if (!isSignedIn || !user?.id || !upload.isSuccess || upload.files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      // Check if user exists in DB first
      const userResponse = await fetch(`/api/user?userId=${user.id}`);
      if (userResponse.status === 404) {
        const createUserResponse = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
          }),
        });
        if (!createUserResponse.ok) {
          throw new Error('Failed to create user in database');
        }
      } else if (!userResponse.ok && userResponse.status !== 404) {
        throw new Error('Error checking user in database');
      }
      
      // Get uploaded file info
      const uploadedFile = upload.files[0];
      const originalFilename = uploadedFile.name;
      
      // Generate IDs
      const fileId = 'file_' + uuidv4();
      const chatId = 'chat_' + uuidv4();
      
      // Extract file extension
      const fileExtension = originalFilename.split('.').pop() || '';
      
      // Create safe filename with ID
      const safeFilename = `${fileId}${fileExtension ? '.' + fileExtension : ''}`;
      
      // Get the file blob data from the uploadedFile
      const fileBlob = uploadedFile;
      
      // Upload to Supabase with the safe filename
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(safeFilename, fileBlob, { upsert: true });
      
      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
      
      // Compose the Supabase public URL for the uploaded file
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(safeFilename)}`;
      
      // Create file + chat records in your DB
      const [fileResult, chatResult] = await Promise.all([
        // Pass the original filename for storage in DB
        createFile(fileId, "original", originalFilename, url, user.id),
        createChat(chatId, user.id, fileId)
      ]);
      
      // Emit event that a new chat was created
      if (chatResult) {
        chatEvents.emit(CHAT_EVENTS.CHAT_CREATED, chatResult);
      }
      
      // Navigate to the new chat page
      router.push(`/dashboard/c/${chatId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading file");
      console.error("Error uploading file:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Watch for successful upload
  React.useEffect(() => {
    if (upload.isSuccess && upload.files.length > 0 && !isProcessing) {
      handlePostUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.isSuccess, upload.files]);

  return (
    <div className="flex flex-col h-full overflow-hidden text-black">
      <SiteHeader />
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col justify-center items-center h-full px-4">
          <h1 className="text-2xl font-semibold mb-6 text-center">
            What data would you like to analyze?
          </h1>
          <div className="w-full max-w-2xl">
            {!isLoaded ? (
              <div className="text-center p-4">Loading...</div>
            ) : !isSignedIn ? (
              <div className="text-center p-4">You need to sign in to upload files</div>
            ) : (
              <Dropzone {...upload}>
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
