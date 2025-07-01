import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteFile } from '@/app/lib/actions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string; fileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId, fileId } = await params;

    // Delete file record from database
    await deleteFile(fileId, userId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}