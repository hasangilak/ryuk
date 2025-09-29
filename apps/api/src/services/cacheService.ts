import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  serialize?: boolean; // Whether to JSON serialize values
}

export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;
  private defaultTTL: number = 300; // 5 minutes default

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: config.lazyConnect || true,
    } as any); // Temporarily bypass strict typing for ioredis

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  private generateKey(key: string, prefix?: string): string {
    const fullPrefix = prefix ? `${prefix}:` : 'ryuk:';
    return `${fullPrefix}${key}`;
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cache get operation skipped');
      return null;
    }

    try {
      const fullKey = this.generateKey(key, options.prefix);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return null;
      }

      if (options.serialize !== false) {
        return JSON.parse(value) as T;
      }

      return value as T;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null; // Graceful degradation
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cache set operation skipped');
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;

      let serializedValue: string;
      if (options.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value;
      }

      await this.redis.setex(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cache delete operation skipped');
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options.prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cache exists check skipped');
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options.prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const fullPattern = this.generateKey(pattern, options.prefix);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      logger.error('Cache pattern invalidation error:', error);
      return 0;
    }
  }

  async getMultiple<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.isConnected) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(key => this.generateKey(key, options.prefix));
      const values = await this.redis.mget(...fullKeys);

      return values.map(value => {
        if (value === null) {
          return null;
        }

        if (options.serialize !== false) {
          return JSON.parse(value) as T;
        }

        return value as T;
      });
    } catch (error) {
      logger.error('Cache multi-get error:', error);
      return keys.map(() => null);
    }
  }

  async setMultiple(
    keyValuePairs: { key: string; value: any; ttl?: number }[],
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const { key, value, ttl } of keyValuePairs) {
        const fullKey = this.generateKey(key, options.prefix);
        const cacheTTL = ttl || options.ttl || this.defaultTTL;

        let serializedValue: string;
        if (options.serialize !== false) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = value;
        }

        pipeline.setex(fullKey, cacheTTL, serializedValue);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache multi-set error:', error);
      return false;
    }
  }

  async increment(key: string, by: number = 1, options: CacheOptions = {}): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const fullKey = this.generateKey(key, options.prefix);
      const result = await this.redis.incrby(fullKey, by);

      // Set expiration if key was just created
      if (options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    try {
      // Generate the value
      const value = await factory();

      // Store in cache
      await this.set(key, value, options);

      return value;
    } catch (error) {
      logger.error('Cache get-or-set factory error:', error);
      return null;
    }
  }

  async clearAll(prefix?: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const pattern = prefix ? `${prefix}:*` : 'ryuk:*';
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return true;
      }

      await this.redis.del(...keys);
      return true;
    } catch (error) {
      logger.error('Cache clear all error:', error);
      return false;
    }
  }

  getStats(): { connected: boolean; ready: boolean } {
    return {
      connected: this.isConnected,
      ready: this.redis.status === 'ready'
    };
  }

  async ping(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping error:', error);
      return false;
    }
  }
}

// Cache key generators for consistent naming
export class CacheKeys {
  static node(id: string): string {
    return `node:${id}`;
  }

  static nodeList(type: string, filters: Record<string, any> = {}): string {
    const filterStr = Object.keys(filters).length > 0
      ? `:${Buffer.from(JSON.stringify(filters)).toString('base64')}`
      : '';
    return `nodes:${type}${filterStr}`;
  }

  static relationship(id: string): string {
    return `relationship:${id}`;
  }

  static relationshipsByNode(nodeId: string): string {
    return `relationships:node:${nodeId}`;
  }

  static graphStats(): string {
    return 'graph:stats';
  }

  static traversal(startNodeId: string, params: Record<string, any>): string {
    const paramsStr = Buffer.from(JSON.stringify(params)).toString('base64');
    return `traversal:${startNodeId}:${paramsStr}`;
  }

  static neighbors(nodeId: string, params: Record<string, any>): string {
    const paramsStr = Buffer.from(JSON.stringify(params)).toString('base64');
    return `neighbors:${nodeId}:${paramsStr}`;
  }

  static convergentPath(pathId: string): string {
    return `convergent_path:${pathId}`;
  }

  static readerJourney(journeyId: string): string {
    return `reader_journey:${journeyId}`;
  }

  static characterSupernodeStats(characterId: string): string {
    return `character_supernode:${characterId}`;
  }
}

// Singleton instance
let cacheService: CacheService | null = null;

export function getCacheService(): CacheService | null {
  return cacheService;
}

export function initializeCacheService(config: CacheConfig): CacheService {
  if (cacheService) {
    throw new Error('Cache service already initialized');
  }

  cacheService = new CacheService(config);
  return cacheService;
}

export function closeCacheService(): Promise<void> {
  if (cacheService) {
    return cacheService.disconnect();
  }
  return Promise.resolve();
}