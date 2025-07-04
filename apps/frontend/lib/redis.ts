import { Redis } from '@upstash/redis'

// Upstash Redis configuration
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  WIDGET_DATA: 30 * 60,        // 30 minutes - widget data changes less frequently
  DASHBOARD_LIST: 10 * 60,     // 10 minutes - dashboard list for navigation
  DASHBOARD_META: 30 * 60,     // 30 minutes - individual dashboard metadata
  FILE_LIST: 60 * 60,          // 60 minutes - file associations change rarely
  CHART_DATA: 15 * 60,         // 15 minutes - chart data from expensive queries
} as const

// Cache key generators
export const CACHE_KEYS = {
  dashboardList: (userId: string) => `dashboards:${userId}`,
  dashboard: (dashboardId: string, userId: string) => `dashboard:${dashboardId}:${userId}`,
  dashboardWidgets: (dashboardId: string, userId: string) => `dashboard:${dashboardId}:widgets:${userId}`,
  dashboardFiles: (dashboardId: string, userId: string) => `dashboard:${dashboardId}:files:${userId}`,
  widgetData: (widgetId: string) => `widget:${widgetId}:data`,
  chartData: (sql: string, fileId?: string) => {
    const sqlHash = Buffer.from(sql).toString('base64').slice(0, 32)
    return `chart:${sqlHash}${fileId ? `:${fileId}` : ''}`
  },
} as const

// Cache utility class for dashboard operations
export class DashboardCache {
  private static instance: DashboardCache
  private redis: Redis

  private constructor() {
    this.redis = redis
  }

  static getInstance(): DashboardCache {
    if (!DashboardCache.instance) {
      DashboardCache.instance = new DashboardCache()
    }
    return DashboardCache.instance
  }

  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key)
      return cached as T | null
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      console.warn(`Cache delete failed for key ${key}:`, error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.warn(`Cache exists check failed for key ${key}:`, error)
      return false
    }
  }

  // Check cache status for cache warming optimization
  async checkCacheStatus(key: string): Promise<boolean> {
    return this.exists(key)
  }

  // Dashboard-specific cache operations
  async getDashboardList(userId: string) {
    return this.get(CACHE_KEYS.dashboardList(userId))
  }

  async setDashboardList(userId: string, dashboards: any[]) {
    return this.set(CACHE_KEYS.dashboardList(userId), dashboards, CACHE_TTL.DASHBOARD_LIST)
  }

  async invalidateDashboardList(userId: string) {
    return this.del(CACHE_KEYS.dashboardList(userId))
  }

  async getDashboard(dashboardId: string, userId: string) {
    return this.get(CACHE_KEYS.dashboard(dashboardId, userId))
  }

  async setDashboard(dashboardId: string, userId: string, dashboard: any) {
    return this.set(CACHE_KEYS.dashboard(dashboardId, userId), dashboard, CACHE_TTL.DASHBOARD_META)
  }

  async invalidateDashboard(dashboardId: string, userId: string) {
    return this.del(CACHE_KEYS.dashboard(dashboardId, userId))
  }

  async getDashboardWidgets(dashboardId: string, userId: string) {
    return this.get(CACHE_KEYS.dashboardWidgets(dashboardId, userId))
  }

  async setDashboardWidgets(dashboardId: string, userId: string, widgets: any[]) {
    return this.set(CACHE_KEYS.dashboardWidgets(dashboardId, userId), widgets, CACHE_TTL.WIDGET_DATA)
  }

  async invalidateDashboardWidgets(dashboardId: string, userId: string) {
    return this.del(CACHE_KEYS.dashboardWidgets(dashboardId, userId))
  }

  async getDashboardFiles(dashboardId: string, userId: string) {
    return this.get(CACHE_KEYS.dashboardFiles(dashboardId, userId))
  }

  async setDashboardFiles(dashboardId: string, userId: string, files: any[]) {
    return this.set(CACHE_KEYS.dashboardFiles(dashboardId, userId), files, CACHE_TTL.FILE_LIST)
  }

  async invalidateDashboardFiles(dashboardId: string, userId: string) {
    return this.del(CACHE_KEYS.dashboardFiles(dashboardId, userId))
  }

  // Advanced widget data caching with fallback to existing widget cache system
  async getWidgetData(widgetId: string) {
    return this.get(CACHE_KEYS.widgetData(widgetId))
  }

  async setWidgetData(widgetId: string, data: any) {
    return this.set(CACHE_KEYS.widgetData(widgetId), data, CACHE_TTL.CHART_DATA)
  }

  async getChartData(sql: string, fileId?: string) {
    return this.get(CACHE_KEYS.chartData(sql, fileId))
  }

  async setChartData(sql: string, data: any, fileId?: string) {
    return this.set(CACHE_KEYS.chartData(sql, fileId), data, CACHE_TTL.CHART_DATA)
  }

  // Bulk invalidation for dashboard updates
  async invalidateAllDashboardData(dashboardId: string, userId: string) {
    const keys = [
      CACHE_KEYS.dashboard(dashboardId, userId),
      CACHE_KEYS.dashboardWidgets(dashboardId, userId),
      CACHE_KEYS.dashboardFiles(dashboardId, userId),
      CACHE_KEYS.dashboardList(userId), // Also invalidate dashboard list
    ]
    
    const results = await Promise.allSettled(keys.map(key => this.del(key)))
    return results.every(result => result.status === 'fulfilled')
  }

  // Connection health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('Redis ping failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const dashboardCache = DashboardCache.getInstance()

// Connection wrapper with error handling
export async function withRedisCache<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    const isHealthy = await dashboardCache.ping()
    if (!isHealthy) {
      console.warn('Redis not healthy, using fallback')
      return await fallback()
    }
    return await operation()
  } catch (error) {
    console.warn('Cache operation failed, using fallback:', error)
    return await fallback()
  }
}

export default redis