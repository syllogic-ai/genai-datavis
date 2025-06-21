import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createFile, updateDashboardFile, getDashboardFiles } from '@/app/lib/actions';
import { v4 as uuidv4 } from 'uuid';

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

    // Create file record in database
    const fileRecord = await createFile(
      fileId,
      fileType,
      fileName,
      storagePath,
      userId
    );

    // Link file to dashboard
    await updateDashboardFile(dashboardId, fileId, userId);

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
    const files = await getDashboardFiles(dashboardId, userId);

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('Error fetching dashboard files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard files' },
      { status: 500 }
    );
  }
} 