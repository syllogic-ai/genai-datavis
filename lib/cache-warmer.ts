import { dashboardCache } from './redis'
import { logger } from './logger'

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
      logger.debug('[CACHE_WARMER] Skipping cache warming in development environment')
      return
    }

    if (this.isWarmingUp) {
      logger.debug('[CACHE_WARMER] Already warming up, skipping...')
      return
    }

    this.isWarmingUp = true
    logger.debug(`[CACHE_WARMER] Starting cache warming for user ${userId}`)
    
    try {
      // Check if dashboard list is already cached
      const isCached = await dashboardCache.checkCacheStatus(`dashboards:${userId}`)
      
      if (isCached) {
        logger.debug('[CACHE_WARMER] Dashboard list already cached, skipping warm-up')
        this.isWarmingUp = false
        return
      }
      
      // Pre-warm dashboard list only if not cached
      const dashboardListResponse = await fetch(`/api/dashboards`, {
        headers: {
          'x-cache-warming': 'true',
          'x-user-id': userId
        }
      })
      
      if (dashboardListResponse.ok) {
        const dashboards = await dashboardListResponse.json()
        logger.debug(`[CACHE_WARMER] Pre-warmed dashboard list: ${dashboards.length} dashboards`)
        
        // Pre-warm first 2 dashboard widget data (reduced from 3 to minimize requests)
        const topDashboards = dashboards.slice(0, 2)
        const warmupPromises = topDashboards.map(async (dashboard: any) => {
          try {
            // Check if widgets are already cached
            const cacheKey = `dashboard:${dashboard.id}:widgets:${userId}`
            const isWidgetsCached = await dashboardCache.checkCacheStatus(cacheKey)
            
            if (isWidgetsCached) {
              logger.debug(`[CACHE_WARMER] Widgets for dashboard ${dashboard.id} already cached, skipping`)
              return
            }
            
            const widgetsResponse = await fetch(`/api/dashboards/${dashboard.id}/widgets`, {
              headers: {
                'x-cache-warming': 'true',
                'x-user-id': userId
              }
            })
            
            if (widgetsResponse.ok) {
              logger.debug(`[CACHE_WARMER] Pre-warmed widgets for dashboard ${dashboard.id}`)
            }
          } catch (error) {
            logger.warn(`[CACHE_WARMER] Failed to warm dashboard ${dashboard.id}:`, error)
          }
        })
        
        await Promise.allSettled(warmupPromises)
        logger.debug(`[CACHE_WARMER] Completed warming top dashboards for user ${userId}`)
      }
    } catch (error) {
      logger.warn('[CACHE_WARMER] Cache warming failed:', error)
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
        logger.debug(`[CACHE_WARMER] Invalidated cache for dashboard ${dashboardId}`)
      } else {
        // Invalidate user's dashboard list only
        await dashboardCache.invalidateDashboardList(userId)
        logger.debug(`[CACHE_WARMER] Invalidated dashboard list cache for user ${userId}`)
      }
    } catch (error) {
      logger.warn('[CACHE_WARMER] Cache invalidation failed:', error)
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