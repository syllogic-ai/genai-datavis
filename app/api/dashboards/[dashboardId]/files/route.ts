import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createFile, updateDashboardFile, getDashboardFiles } from '@/app/lib/actions';
import { generateSanitizedFilename } from '@/app/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { dashboardCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    console.log('[FILE_DB] Creating file database record...');
    
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    console.log('[FILE_DB] Session check:', { userId: userId ? 'present' : 'missing' });
    
    if (!userId) {
      console.log('[FILE_DB] ERROR: No user session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await params;
    const body = await request.json();
    const { fileName, storagePath, fileType = 'original', mimeType, size } = body;

    if (!fileName || !storagePath) {
      return NextResponse.json(
        { error: 'fileName and storagePath are required' },
        { status: 400 }
      );
    }

    const fileId = uuidv4();
    const sanitizedFilename = generateSanitizedFilename(fileName);

    console.log('[FILE_DB] Creating file record:', {
      fileId,
      fileName,
      dashboardId,
      userId
    });

    // Create file record in database
    const fileRecord = await createFile(
      fileId,
      fileType,
      fileName,
      sanitizedFilename,
      storagePath,
      userId,
      mimeType,
      size
    );

    console.log('[FILE_DB] File record created successfully');

    // Link file to dashboard
    console.log('[FILE_DB] Linking file to dashboard...');
    await updateDashboardFile(dashboardId, fileId, userId);
    console.log('[FILE_DB] File linked to dashboard successfully');
    
    // Invalidate files cache for this dashboard
    const cacheKey = CACHE_KEYS.dashboardFiles(dashboardId, userId);
    await dashboardCache.del(cacheKey);

    return NextResponse.json({
      success: true,
      file: fileRecord,
    });
  } catch (error) {
    console.error('[FILE_DB] ERROR creating file record:', error);
    console.error('[FILE_DB] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to create file record' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await params;
    const cacheKey = CACHE_KEYS.dashboardFiles(dashboardId, userId);
    
    // Check cache first
    const cachedFiles = await dashboardCache.get(cacheKey);
    if (cachedFiles) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FILES_API] Cache hit for dashboard ${dashboardId}`);
      }
      return NextResponse.json({
        success: true,
        files: cachedFiles,
      });
    }
    
    // Cache miss - fetch from database
    const dbFiles = await getDashboardFiles(dashboardId, userId);

    // If dashboard doesn't exist, return 404
    if (dbFiles === null) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }
    
    // Map database records to frontend interface
    const files = dbFiles.map((file: any) => ({
      id: file.id,
      name: file.originalFilename,
      size: file.size || 0,
      type: file.mimeType || 'application/octet-stream',
      storagePath: file.storagePath,
      uploadedAt: file.createdAt,
      status: file.status,
    }));
    
    // Cache the result
    await dashboardCache.set(cacheKey, files, CACHE_TTL.FILE_LIST);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FILES_API] Cache miss - stored files for dashboard ${dashboardId}`);
    }

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('Error fetching dashboard files:', error);
    
    // If it's a "not found" error, return 404
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch dashboard files' },
      { status: 500 }
    );
  }
} 