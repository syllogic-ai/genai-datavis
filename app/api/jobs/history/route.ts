import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import db from '@/db';
import { jobs } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('dashboardId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query conditions
    const conditions = [eq(jobs.userId, userId)];
    if (dashboardId) {
      conditions.push(eq(jobs.dashboardId, dashboardId));
    }

    // Query job history
    const jobHistory = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate stats
    const stats = {
      total: jobHistory.length,
      completed: jobHistory.filter(j => j.status === 'completed').length,
      failed: jobHistory.filter(j => j.status === 'failed').length,
      avgProcessingTime: jobHistory
        .filter(j => j.processingTimeMs)
        .reduce((acc, j) => acc + (j.processingTimeMs || 0), 0) / 
        jobHistory.filter(j => j.processingTimeMs).length || 0,
    };

    return NextResponse.json({
      jobs: jobHistory,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: jobHistory.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching job history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job history' },
      { status: 500 }
    );
  }
}