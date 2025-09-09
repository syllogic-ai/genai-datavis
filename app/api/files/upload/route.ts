import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient } from '@supabase/supabase-js';
import { generateSanitizedFilename } from '@/app/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client with service role key to bypass RLS for uploads
// We handle RLS manually by validating the user session
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('[FILE_UPLOAD] Starting file upload process...');
    
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    console.log('[FILE_UPLOAD] Session check:', { userId: userId ? 'present' : 'missing' });
    
    if (!userId) {
      console.log('[FILE_UPLOAD] ERROR: No user session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dashboardId = formData.get('dashboardId') as string;
    const bucketName = formData.get('bucketName') as string || 'user-files';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'dashboardId is required' },
        { status: 400 }
      );
    }

    // Generate sanitized filename
    const sanitizedFilename = generateSanitizedFilename(file.name);
    
    // Create the storage path: {userId}/{dashboardId}/{filename}
    const storagePath = `${userId}/${dashboardId}/${sanitizedFilename}`;
    
    console.log('[FILE_UPLOAD] Uploading to Supabase Storage:', { 
      bucketName, 
      storagePath, 
      fileName: file.name,
      fileSize: file.size,
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      serviceKeyPresent: !!supabaseServiceKey
    });

    // Upload the file to Supabase storage
    // The service_role can now bypass RLS policies thanks to the updated policy
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('[FILE_UPLOAD] Error uploading to Supabase Storage:', error);
      console.error('[FILE_UPLOAD] Error details:', {
        message: error.message
      });
      
      // Handle specific error cases
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'File with this name already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[FILE_UPLOAD] Successfully uploaded to Storage:', data.path);

    // Also create the database record
    try {
      console.log('[FILE_UPLOAD] Creating database record...');
      const createFileResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/dashboards/${dashboardId}/files`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Forward the original request headers for authentication
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          fileName: file.name,
          storagePath: storagePath,
          fileType: 'original',
          mimeType: file.type,
          size: file.size,
        }),
      });

      if (!createFileResponse.ok) {
        const errorText = await createFileResponse.text();
        console.error('[FILE_UPLOAD] Database record creation failed:', errorText);
        // File is uploaded to storage but DB record failed
        // Still return success but with a warning
        return NextResponse.json({
          success: true,
          warning: 'File uploaded to storage but database record creation failed',
          file: {
            name: file.name,
            sanitizedName: sanitizedFilename,
            size: file.size,
            type: file.type,
            storagePath: storagePath,
            uploadPath: data.path,
          },
        });
      }

      const dbResult = await createFileResponse.json();
      console.log('[FILE_UPLOAD] Database record created successfully');

      return NextResponse.json({
        success: true,
        file: {
          name: file.name,
          sanitizedName: sanitizedFilename,
          size: file.size,
          type: file.type,
          storagePath: storagePath,
          uploadPath: data.path,
          dbRecord: dbResult.file,
        },
      });
    } catch (error) {
      console.error('[FILE_UPLOAD] Error creating database record:', error);
      // File is uploaded to storage but DB record failed
      return NextResponse.json({
        success: true,
        warning: 'File uploaded to storage but database record creation failed',
        file: {
          name: file.name,
          sanitizedName: sanitizedFilename,
          size: file.size,
          type: file.type,
          storagePath: storagePath,
          uploadPath: data.path,
        },
      });
    }
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}