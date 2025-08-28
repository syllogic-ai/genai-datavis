import { Redis } from "@upstash/redis";
import db from '@/db';
import { widgets } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class WidgetCacheManager {
  private redis: Redis;

  constructor() {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error("Redis configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
    }

    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  async cacheWidgetData(
    widgetId: string, 
    data: any, 
    ttlSeconds: number = 3600
  ): Promise<void> {
    try {
      const dataSize = JSON.stringify(data).length;
      const MAX_CACHE_SIZE = 1024 * 1024; // 1MB limit
      
      if (dataSize < MAX_CACHE_SIZE) {
        const cacheKey = `widget:${widgetId}:data`;
        
        // Store in Redis with TTL
        await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify({
          data,
          timestamp: Date.now(),
          size: dataSize,
          ttl: ttlSeconds,
        }));
        
        // Update widget with cache key and last fetch time
        await db.update(widgets)
          .set({ 
            cacheKey,
            lastDataFetch: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(widgets.id, widgetId));

        console.log(`Cached widget ${widgetId} data (${dataSize} bytes)`);
      } else {
        console.warn(`Widget ${widgetId} data too large for cache (${dataSize} bytes)`);
      }
    } catch (error) {
      console.error(`Error caching widget ${widgetId} data:`, error);
      throw error;
    }
  }

  async getCachedWidgetData(widgetId: string): Promise<any | null> {
    try {
      // Get widget to find cache key
      const widgetResult = await db.select()
        .from(widgets)
        .where(eq(widgets.id, widgetId))
        .limit(1);
      
      const widget = widgetResult[0];
      
      if (!widget?.cacheKey) {
        return null;
      }
      
      // Get from Redis
      const cached = await this.redis.get(widget.cacheKey);
      if (!cached) {
        console.log(`Cache miss for widget ${widgetId}`);
        return null;
      }
      
      const parsedCache = JSON.parse(cached as string);
      
      // Check if cache is still valid
      const cacheAge = Date.now() - parsedCache.timestamp;
      const maxAge = (parsedCache.ttl || 3600) * 1000; // Convert to milliseconds
      const isStale = cacheAge > maxAge;
      
      if (isStale) {
        console.log(`Cache expired for widget ${widgetId} (age: ${Math.round(cacheAge / 1000)}s)`);
        // Clean up expired cache
        await this.invalidateWidgetCache(widgetId);
        return null;
      }
      
      console.log(`Cache hit for widget ${widgetId} (age: ${Math.round(cacheAge / 1000)}s)`);
      return parsedCache.data;
    } catch (error) {
      console.error(`Error getting cached widget ${widgetId} data:`, error);
      return null;
    }
  }

  async invalidateWidgetCache(widgetId: string): Promise<void> {
    try {
      // Get widget to find cache key
      const widgetResult = await db.select()
        .from(widgets)
        .where(eq(widgets.id, widgetId))
        .limit(1);
      
      const widget = widgetResult[0];
      
      if (widget?.cacheKey) {
        // Delete from Redis
        await this.redis.del(widget.cacheKey);
        
        // Clear cache key from widget
        await db.update(widgets)
          .set({ 
            cacheKey: null,
            updatedAt: new Date(),
          })
          .where(eq(widgets.id, widgetId));

        console.log(`Invalidated cache for widget ${widgetId}`);
      }
    } catch (error) {
      console.error(`Error invalidating cache for widget ${widgetId}:`, error);
      throw error;
    }
  }

  async invalidateDashboardCache(dashboardId: string): Promise<void> {
    try {
      // Get all widgets for this dashboard
      const dashboardWidgetsData = await db.select()
        .from(widgets)
        .where(eq(widgets.dashboardId, dashboardId));

      // Invalidate cache for each widget
      const invalidationPromises = dashboardWidgetsData
        .filter(widget => widget?.cacheKey)
        .map(widget => this.invalidateWidgetCache(widget.id));

      await Promise.all(invalidationPromises);
      console.log(`Invalidated cache for ${invalidationPromises.length} widgets in dashboard ${dashboardId}`);
    } catch (error) {
      console.error(`Error invalidating dashboard ${dashboardId} cache:`, error);
      throw error;
    }
  }

  async getCacheStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    hitRate: number;
  }> {
    try {
      // Get all widget cache keys
      const keys = await this.redis.keys('widget:*:data');
      let totalSize = 0;
      let validKeys = 0;

      // Calculate total size of cached data
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data as string);
            totalSize += parsed.size || 0;
            validKeys++;
          }
        } catch (error) {
          console.warn(`Error reading cache key ${key}:`, error);
        }
      }

      // Simple hit rate calculation (would need more sophisticated tracking in production)
      const hitRate = validKeys > 0 ? 0.8 : 0; // Placeholder calculation

      return {
        totalKeys: validKeys,
        totalSize,
        hitRate,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        hitRate: 0,
      };
    }
  }

  async cleanupExpiredCache(): Promise<number> {
    try {
      const keys = await this.redis.keys('widget:*:data');
      let cleanedCount = 0;

      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data as string);
            const cacheAge = Date.now() - parsed.timestamp;
            const maxAge = (parsed.ttl || 3600) * 1000;
            
            if (cacheAge > maxAge) {
              await this.redis.del(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // If we can't parse the data, delete the key
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }

  // Smart caching with different TTLs based on data type
  async cacheWidgetDataSmart(
    widgetId: string,
    data: any,
    dataType: 'realtime' | 'daily' | 'static' = 'daily'
  ): Promise<void> {
    const ttlMap = {
      realtime: 300, // 5 minutes
      daily: 3600,   // 1 hour
      static: 86400, // 24 hours
    };

    const ttl = ttlMap[dataType];
    await this.cacheWidgetData(widgetId, data, ttl);
  }

  // Batch cache operations for multiple widgets
  async batchCacheWidgetData(
    cacheOperations: Array<{
      widgetId: string;
      data: any;
      ttl?: number;
    }>
  ): Promise<void> {
    const operations = cacheOperations.map(async ({ widgetId, data, ttl = 3600 }) => {
      try {
        await this.cacheWidgetData(widgetId, data, ttl);
      } catch (error) {
        console.error(`Failed to cache widget ${widgetId}:`, error);
      }
    });

    await Promise.all(operations);
    console.log(`Batch cached ${cacheOperations.length} widgets`);
  }


  // Preemptive cache warming for new widgets
  async warmCacheForNewWidgets(dashboardId: string, widgetIds: string[]): Promise<void> {
    try {
      console.log(`Warming cache for ${widgetIds.length} new widgets`);
      
      const warmingPromises = widgetIds.map(async (widgetId) => {
        try {
          // Get widget data to determine cache strategy
          const widgetData = await db.select()
            .from(widgets)
            .where(eq(widgets.id, widgetId))
            .limit(1);
          
          const widget = widgetData[0];
          if (!widget) return;
          
          // Determine cache TTL based on widget type
          const cacheType = widget.type === 'kpi' ? 'realtime' : 'daily';
          
          // If widget has SQL, it will need data fetching
          if (widget.sql) {
            // Mark as needing data fetch (don't actually fetch here to avoid long delays)
            await db.update(widgets)
              .set({ 
                lastDataFetch: null, // Reset to force fresh fetch
                updatedAt: new Date(),
              })
              .where(eq(widgets.id, widgetId));
          }
          
          console.log(`Prepared cache warming for widget ${widgetId} (${widget.type})`);
        } catch (error) {
          console.error(`Error warming cache for widget ${widgetId}:`, error);
        }
      });
      
      await Promise.all(warmingPromises);
      console.log(`Cache warming completed for ${widgetIds.length} widgets`);
    } catch (error) {
      console.error('Error in cache warming:', error);
    }
  }
}