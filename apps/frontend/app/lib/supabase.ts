import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Creates a URL for a file in a bucket
export function getFileUrl(bucket: string, filePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

// Generate a unique file name
export function generateFileName(file: File): string {
  const fileExt = file.name.split('.').pop();
  return `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
}

// Upload file to Supabase Storage
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