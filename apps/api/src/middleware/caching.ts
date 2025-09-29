import { Request, Response, NextFunction } from 'express';
import { getCacheService, CacheKeys } from '../services/cacheService';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  skipCache?: (req: Request) => boolean;
  onHit?: (req: Request, cachedData: any) => void;
  onMiss?: (req: Request) => void;
}

export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cacheService = getCacheService();

    // Skip caching if service is not available or condition not met
    if (!cacheService ||
        req.method !== 'GET' ||
        (options.condition && !options.condition(req)) ||
        (options.skipCache && options.skipCache(req))) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(req)
        : generateDefaultCacheKey(req);

      // Try to get cached response
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        // Cache hit
        if (options.onHit) {
          options.onHit(req, cachedData);
        }

        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - prepare to cache the response
      if (options.onMiss) {
        options.onMiss(req);
      }

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = options.ttl || 300; // Default 5 minutes
          cacheService.set(cacheKey, data, { ttl }).catch(error => {
            logger.error('Error caching response:', error);
          });
        }

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
}

function generateDefaultCacheKey(req: Request): string {
  const { path, query } = req;
  const queryString = Object.keys(query).length > 0
    ? `:${Buffer.from(JSON.stringify(query)).toString('base64')}`
    : '';
  return `api:${path}${queryString}`;
}

// Specialized cache middleware for different endpoints
export const nodesCacheMiddleware = cacheMiddleware({
  ttl: 600, // 10 minutes for node data
  keyGenerator: (req) => {
    const { type, ...filters } = req.query;
    return CacheKeys.nodeList(type as string || 'all', filters);
  },
  condition: (req) => {
    // Only cache if type is specified or it's a simple list request
    return Boolean(req.query.type) || Object.keys(req.query).length <= 2;
  }
});

export const singleNodeCacheMiddleware = cacheMiddleware({
  ttl: 900, // 15 minutes for individual nodes
  keyGenerator: (req) => CacheKeys.node(req.params.id),
  condition: (req) => Boolean(req.params.id)
});

export const relationshipsCacheMiddleware = cacheMiddleware({
  ttl: 300, // 5 minutes for relationships
  keyGenerator: (req) => {
    if (req.params.nodeId) {
      return CacheKeys.relationshipsByNode(req.params.nodeId);
    }
    const queryString = Object.keys(req.query).length > 0
      ? `:${Buffer.from(JSON.stringify(req.query)).toString('base64')}`
      : '';
    return `relationships:list${queryString}`;
  }
});

export const graphStatsCacheMiddleware = cacheMiddleware({
  ttl: 1800, // 30 minutes for graph statistics
  keyGenerator: () => CacheKeys.graphStats()
});

export const traversalCacheMiddleware = cacheMiddleware({
  ttl: 600, // 10 minutes for traversal results
  keyGenerator: (req) => {
    const startNodeId = req.params.startNodeId || req.query.start_node_id as string;
    const { start_node_id, ...params } = req.query;
    return CacheKeys.traversal(startNodeId, params);
  },
  condition: (req) => {
    const startNodeId = req.params.startNodeId || req.query.start_node_id;
    return Boolean(startNodeId);
  }
});

export const neighborsCacheMiddleware = cacheMiddleware({
  ttl: 600, // 10 minutes for neighbor queries
  keyGenerator: (req) => {
    const nodeId = req.params.nodeId || req.query.node_id as string;
    const { node_id, ...params } = req.query;
    return CacheKeys.neighbors(nodeId, params);
  },
  condition: (req) => {
    const nodeId = req.params.nodeId || req.query.node_id;
    return Boolean(nodeId);
  }
});

// Cache invalidation middleware
export function cacheInvalidationMiddleware(patterns: string | string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cacheService = getCacheService();

    if (!cacheService) {
      return next();
    }

    // Store original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const invalidateCache = async () => {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

        for (const pattern of patternsArray) {
          try {
            await cacheService.invalidatePattern(pattern);
            logger.debug(`Invalidated cache pattern: ${pattern}`);
          } catch (error) {
            logger.error(`Error invalidating cache pattern ${pattern}:`, error);
          }
        }
      }
    };

    // Override response methods to trigger cache invalidation
    res.json = function(data: any) {
      invalidateCache();
      return originalJson(data);
    };

    res.send = function(data: any) {
      invalidateCache();
      return originalSend(data);
    };

    next();
  };
}

// Specific invalidation patterns for different operations
export const nodeInvalidationMiddleware = cacheInvalidationMiddleware([
  'ryuk:nodes:*',
  'ryuk:node:*',
  'ryuk:graph:stats',
  'ryuk:traversal:*',
  'ryuk:neighbors:*'
]);

export const relationshipInvalidationMiddleware = cacheInvalidationMiddleware([
  'ryuk:relationships:*',
  'ryuk:relationship:*',
  'ryuk:graph:stats',
  'ryuk:traversal:*',
  'ryuk:neighbors:*'
]);

// Conditional cache warming for frequently accessed data
export async function warmCache() {
  const cacheService = getCacheService();
  if (!cacheService) {
    logger.warn('Cache service not available for warming');
    return;
  }

  try {
    logger.info('Starting cache warming...');

    // Warm commonly accessed patterns here
    // This would typically be done with actual service calls
    // For now, we'll just log the intention

    logger.info('Cache warming completed');
  } catch (error) {
    logger.error('Error during cache warming:', error);
  }
}

// Cache monitoring and metrics
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  errors: number;
}

class CacheMetricsCollector {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    errors: 0
  };

  recordHit() {
    this.metrics.hits++;
    this.updateHitRate();
  }

  recordMiss() {
    this.metrics.misses++;
    this.updateHitRate();
  }

  recordError() {
    this.metrics.errors++;
  }

  private updateHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      errors: 0
    };
  }
}

export const cacheMetrics = new CacheMetricsCollector();

// Enhanced cache middleware with metrics
export function cacheMiddlewareWithMetrics(options: CacheMiddlewareOptions = {}) {
  const originalOnHit = options.onHit;
  const originalOnMiss = options.onMiss;

  return cacheMiddleware({
    ...options,
    onHit: (req, cachedData) => {
      cacheMetrics.recordHit();
      if (originalOnHit) {
        originalOnHit(req, cachedData);
      }
    },
    onMiss: (req) => {
      cacheMetrics.recordMiss();
      if (originalOnMiss) {
        originalOnMiss(req);
      }
    }
  });
}