import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createDashboard, getDashboards } from '@/app/lib/actions';
import { nanoid } from 'nanoid';
import { dashboardCache, withRedisCache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' }, 
        { status: 400 }
      );
    }

    const dashboardId = nanoid();

    // Create dashboard with correct parameter order
    const result = await createDashboard(
      dashboardId,
      userId,
      name,
      description,
      null, // metadata - not used for now
      icon
    );

    // Invalidate dashboard list cache after creating new dashboard
    try {
      await dashboardCache.invalidateDashboardList(userId);
      console.log(`[API] Dashboard list cache invalidated for user ${userId}`);
    } catch (cacheError) {
      console.warn('Failed to invalidate dashboard list cache:', cacheError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cache-first approach for dashboard list
    const dashboards = await withRedisCache(
      // Try cache first
      async () => {
        const cached = await dashboardCache.getDashboardList(userId);
        if (cached && Array.isArray(cached)) {
          console.log(`[API] Cache HIT - Loaded ${cached.length} dashboards for user ${userId}`);
          return cached;
        }
        return null;
      },
      // Fallback to database
      async () => {
        console.log(`[API] Cache MISS - Loading dashboards from database for user ${userId}`);
        const dashboards = await getDashboards(userId);
        
        // Cache the results for future requests
        await dashboardCache.setDashboardList(userId, dashboards);
        console.log(`[API] Loaded and cached ${dashboards.length} dashboards for user ${userId}`);
        
        return dashboards;
      }
    );

    // If cache operation failed, fall back to direct database query
    if (!dashboards) {
      const fallbackDashboards = await getDashboards(userId);
      console.log(`[API] Fallback - Loaded ${fallbackDashboards.length} dashboards for user ${userId}`);
      return NextResponse.json(fallbackDashboards);
    }

    return NextResponse.json(dashboards);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' }, 
      { status: 500 }
    );
  }
}