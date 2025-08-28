import { NextRequest, NextResponse } from 'next/server';
import { WidgetCacheManager } from '@/lib/WidgetCacheManager';

export async function POST(request: NextRequest) {
  try {
    const { jobId, dashboardId } = await request.json();
    
    if (!jobId || !dashboardId) {
      return NextResponse.json(
        { error: 'jobId and dashboardId are required' },
        { status: 400 }
      );
    }
    
    const cacheManager = new WidgetCacheManager();
    // Invalidate dashboard cache instead since we removed job-related functionality
    await cacheManager.invalidateDashboardCache(dashboardId);
    const result = { widgetsInvalidated: 0, dashboardCacheCleared: true };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cache invalidation API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to invalidate cache',
        widgetsInvalidated: 0,
        dashboardCacheCleared: false
      },
      { status: 500 }
    );
  }
}