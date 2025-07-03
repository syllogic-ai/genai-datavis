import { dashboardCache } from './redis'

// Cache warming utility to preload frequently accessed data
export class CacheWarmer {
  private static instance: CacheWarmer
  private isWarmingUp = false

  private constructor() {}

  static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer()
    }
    return CacheWarmer.instance
  }

  // Warm cache for a specific user's dashboard data
  async warmUserCache(userId: string): Promise<void> {
    // Skip cache warming in development to prevent infinite loops with Fast Refresh
    if (process.env.NODE_ENV === 'development') {
      console.log('[CACHE_WARMER] Skipping cache warming in development environment')
      return
    }

    if (this.isWarmingUp) {
      console.log('[CACHE_WARMER] Already warming up, skipping...')
      return
    }

    this.isWarmingUp = true
    console.log(`[CACHE_WARMER] Starting cache warming for user ${userId}`)
    
    try {
      // Pre-warm dashboard list
      const dashboardListResponse = await fetch(`/api/dashboards`, {
        headers: {
          'x-cache-warming': 'true'
        }
      })
      
      if (dashboardListResponse.ok) {
        const dashboards = await dashboardListResponse.json()
        console.log(`[CACHE_WARMER] Pre-warmed dashboard list: ${dashboards.length} dashboards`)
        
        // Pre-warm first 3 dashboard widget data (most likely to be accessed)
        const topDashboards = dashboards.slice(0, 3)
        const warmupPromises = topDashboards.map(async (dashboard: any) => {
          try {
            const widgetsResponse = await fetch(`/api/dashboards/${dashboard.id}/widgets`, {
              headers: {
                'x-cache-warming': 'true'
              }
            })
            
            if (widgetsResponse.ok) {
              console.log(`[CACHE_WARMER] Pre-warmed widgets for dashboard ${dashboard.id}`)
            }
          } catch (error) {
            console.warn(`[CACHE_WARMER] Failed to warm dashboard ${dashboard.id}:`, error)
          }
        })
        
        await Promise.allSettled(warmupPromises)
        console.log(`[CACHE_WARMER] Completed warming top dashboards for user ${userId}`)
      }
    } catch (error) {
      console.warn('[CACHE_WARMER] Cache warming failed:', error)
    } finally {
      this.isWarmingUp = false
    }
  }

  // Get cache statistics for monitoring
  async getCacheStats(): Promise<{
    redisHealthy: boolean;
    timestamp: number;
  }> {
    try {
      const isHealthy = await dashboardCache.ping()
      return {
        redisHealthy: isHealthy,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        redisHealthy: false,
        timestamp: Date.now(),
      }
    }
  }

  // Selective cache invalidation for efficiency
  async invalidateUserCache(userId: string, dashboardId?: string): Promise<void> {
    try {
      if (dashboardId) {
        // Invalidate specific dashboard
        await dashboardCache.invalidateAllDashboardData(dashboardId, userId)
        console.log(`[CACHE_WARMER] Invalidated cache for dashboard ${dashboardId}`)
      } else {
        // Invalidate user's dashboard list only
        await dashboardCache.invalidateDashboardList(userId)
        console.log(`[CACHE_WARMER] Invalidated dashboard list cache for user ${userId}`)
      }
    } catch (error) {
      console.warn('[CACHE_WARMER] Cache invalidation failed:', error)
    }
  }
}

// Export singleton instance
export const cacheWarmer = CacheWarmer.getInstance()

// Utility hook for React components
export function useCacheWarming() {
  const warmCache = async (userId: string) => {
    await cacheWarmer.warmUserCache(userId)
  }

  const getStats = async () => {
    return await cacheWarmer.getCacheStats()
  }

  const invalidateCache = async (userId: string, dashboardId?: string) => {
    await cacheWarmer.invalidateUserCache(userId, dashboardId)
  }

  return {
    warmCache,
    getStats,
    invalidateCache,
  }
}