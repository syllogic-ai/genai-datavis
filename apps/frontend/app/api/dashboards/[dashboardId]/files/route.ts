import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createFile, updateDashboardFile, getDashboardFiles } from '@/app/lib/actions';
import { generateSanitizedFilename } from '@/app/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { dashboardCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId } = await params;
    const body = await request.json();
    const { fileName, storagePath, fileType = 'original' } = body;

    if (!fileName || !storagePath) {
      return NextResponse.json(
        { error: 'fileName and storagePath are required' },
        { status: 400 }
      );
    }

    const fileId = uuidv4();
    const sanitizedFilename = generateSanitizedFilename(fileName);

    // Create file record in database
    const fileRecord = await createFile(
      fileId,
      fileType,
      fileName,
      sanitizedFilename,
      storagePath,
      userId
    );

    // Link file to dashboard
    await updateDashboardFile(dashboardId, fileId, userId);
    
    // Invalidate files cache for this dashboard
    const cacheKey = CACHE_KEYS.dashboardFiles(dashboardId, userId);
    await dashboardCache.del(cacheKey);

    return NextResponse.json({
      success: true,
      file: fileRecord,
    });
  } catch (error) {
    console.error('Error creating file record:', error);
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
    const { userId } = await auth();
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
    const files = await getDashboardFiles(dashboardId, userId);

    // If dashboard doesn't exist, return 404
    if (files === null) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }
    
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