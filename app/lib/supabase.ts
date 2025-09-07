import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Create standard supabase client with anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Creates a signed URL for a private file through our API (handles RLS)
// This is the preferred method as it handles user authentication and file ownership
export async function getSignedFileUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const response = await fetch('/api/files/signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filePath, expiresIn }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get signed URL');
  }

  const data = await response.json();
  return data.signedUrl;
}

// Direct Supabase signed URL (for internal use with service key)
// This bypasses RLS checks, so use carefully
export async function getDirectSignedFileUrl(bucket: string, filePath: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);
    
  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
  
  return data.signedUrl;
}

// Creates a URL for a file in a bucket (deprecated - use getSignedFileUrl for private buckets)
export function getFileUrl(bucket: string, filePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

// Generate a unique file name
export function generateFileName(file: File): string {
  const fileExt = file.name.split('.').pop();
  return `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
}

// Generate storage path for user files in private bucket
// Path structure: {user_id}/{dashboard_id}/{filename}
export function generateUserFilePath(userId: string, dashboardId: string, filename: string): string {
  return `${userId}/${dashboardId}/${filename}`;
}

// Upload file to private user-files bucket
export async function uploadUserFile(
  file: File, 
  userId: string, 
  dashboardId: string,
  bucketName: string = 'user-files'
) {
  try {
    const fileName = generateFileName(file);
    const filePath = generateUserFilePath(userId, dashboardId, fileName);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);
      
    if (error) throw error;
    
    return {
      path: filePath,
      fileName: fileName,
      fullPath: data.path
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Upload file to Supabase Storage (legacy function - deprecated)
export async function uploadFileToSupabase(file: File, bucketName: string = 'test-bucket') {
  try {
    const fileName = generateFileName(file);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(`${fileName}`, file);
      
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}
