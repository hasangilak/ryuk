# Performance Tuning Guide - Ryuk Project

This guide provides comprehensive strategies for optimizing the performance of the Ryuk manga generation system across all components.

## 🎯 Performance Targets

### Response Time Goals
- **API Endpoints**: < 100ms for simple queries, < 500ms for complex operations
- **Database Queries**: < 50ms for single node retrieval, < 200ms for graph traversals
- **Bulk Operations**: < 5 seconds for 100 nodes, < 30 seconds for 1000 nodes

### Throughput Targets
- **Concurrent Users**: Support 100+ simultaneous API requests
- **Database Load**: Handle 1000+ queries per second
- **Memory Usage**: < 512MB for API server, < 2GB for database

## 🏗️ Database Optimization

### Neo4j Performance Tuning

#### 1. Index Optimization
```cypher
-- Essential indexes for performance
CREATE INDEX node_id_index FOR (n) ON (n.id);
CREATE INDEX node_type_index FOR (n) ON (n.type);
CREATE INDEX scene_sequence_index FOR (n:Scene) ON (n.sequence);
CREATE INDEX scene_chapter_index FOR (n:Scene) ON (n.chapter);
CREATE INDEX character_role_index FOR (n:Character) ON (n.role);
CREATE INDEX choice_weight_index FOR (n:Choice) ON (n.weight);
CREATE INDEX event_causality_index FOR (n:Event) ON (n.causality_level);

-- Composite indexes for common query patterns
CREATE INDEX scene_chapter_sequence FOR (n:Scene) ON (n.chapter, n.sequence);
CREATE INDEX character_role_name FOR (n:Character) ON (n.role, n.name);

-- Relationship indexes
CREATE INDEX relationship_type_index FOR ()-[r]-() ON (r.type);
CREATE INDEX leads_to_weight FOR ()-[r:LEADS_TO]-() ON (r.weight);
```

#### 2. Query Optimization Patterns
```cypher
-- ✅ Good: Use parameters and LIMIT
MATCH (n:Scene {chapter: $chapter})
RETURN n
ORDER BY n.sequence
LIMIT $limit

-- ❌ Bad: No parameters, no limit
MATCH (n:Scene)
WHERE n.chapter = 1
RETURN n

-- ✅ Good: Specific relationship direction
MATCH (s:Scene)-[:LEADS_TO]->(next:Scene)
WHERE s.id = $sceneId
RETURN next

-- ❌ Bad: Bidirectional without need
MATCH (s:Scene)-[:LEADS_TO]-(next:Scene)
WHERE s.id = $sceneId
RETURN next

-- ✅ Good: Use OPTIONAL MATCH for optional relationships
MATCH (c:Character {id: $characterId})
OPTIONAL MATCH (c)-[:APPEARS_IN]->(s:Scene)
RETURN c, collect(s) as scenes

-- ❌ Bad: Multiple separate queries
MATCH (c:Character {id: $characterId}) RETURN c;
MATCH (c:Character {id: $characterId})-[:APPEARS_IN]->(s:Scene) RETURN s;
```

#### 3. Neo4j Configuration
```conf
# neo4j.conf optimizations
dbms.memory.heap.initial_size=1G
dbms.memory.heap.max_size=2G
dbms.memory.pagecache.size=1G

# Query performance
cypher.default_language_version=4
cypher.hints_error=true
cypher.lenient_create_relationship=false

# Logging for performance monitoring
dbms.logs.query.enabled=true
dbms.logs.query.threshold=100ms
dbms.logs.query.parameter_logging_enabled=true
```

### PostgreSQL Optimization (Future Use)

#### Database Configuration
```sql
-- Performance-oriented settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 256MB
random_page_cost = 1.1
effective_io_concurrency = 200

-- Connection pooling
max_connections = 100
```

#### Indexing Strategy
```sql
-- Primary indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_stories_user_id ON stories(user_id);
CREATE INDEX CONCURRENTLY idx_stories_created_at ON stories(created_at DESC);

-- Composite indexes
CREATE INDEX CONCURRENTLY idx_stories_user_status
ON stories(user_id, status) WHERE status = 'published';
```

## 🖥️ API Server Optimization

### Node.js Performance

#### 1. Memory Management
```typescript
// apps/api/src/utils/memoryOptimization.ts
export class MemoryOptimizer {
  private static readonly MEMORY_THRESHOLD = 0.85; // 85% of heap

  static monitor(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedPercent = usage.heapUsed / usage.heapTotal;

      if (heapUsedPercent > this.MEMORY_THRESHOLD) {
        console.warn('High memory usage detected:', {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
          percentage: Math.round(heapUsedPercent * 100) + '%'
        });

        // Force garbage collection if possible
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }
}
```

#### 2. Connection Pooling
```typescript
// apps/api/src/database/poolManager.ts
export class DatabasePoolManager {
  private static neo4jPool: neo4j.Driver;
  private static readonly MAX_POOL_SIZE = 50;
  private static readonly ACQUISITION_TIMEOUT = 60000; // 60 seconds

  static initializeNeo4j(uri: string, auth: neo4j.AuthToken): neo4j.Driver {
    if (!this.neo4jPool) {
      this.neo4jPool = neo4j.driver(uri, auth, {
        maxConnectionPoolSize: this.MAX_POOL_SIZE,
        connectionAcquisitionTimeout: this.ACQUISITION_TIMEOUT,
        maxTransactionRetryTime: 15000,
        connectionTimeout: 20000,
        disableLosslessIntegers: true // Improve performance for integers
      });
    }
    return this.neo4jPool;
  }

  static async closeAll(): Promise<void> {
    if (this.neo4jPool) {
      await this.neo4jPool.close();
    }
  }
}
```

#### 3. Response Caching
```typescript
// apps/api/src/middleware/caching.ts
import { Redis } from 'ioredis';

export class CacheManager {
  private static redis: Redis;
  private static readonly DEFAULT_TTL = 300; // 5 minutes

  static initialize(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }

  static middleware(ttl: number = this.DEFAULT_TTL) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `api:${req.originalUrl}`;

      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }

        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function(data: any) {
          CacheManager.redis.setex(cacheKey, ttl, JSON.stringify(data));
          res.setHeader('X-Cache', 'MISS');
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Cache error:', error);
        next(); // Continue without caching
      }
    };
  }
}
```

### Express.js Optimizations

#### 1. Middleware Optimization
```typescript
// apps/api/src/middleware/performance.ts
import compression from 'compression';
import helmet from 'helmet';

export const performanceMiddleware = [
  // Compression with optimized settings
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Balance between compression and CPU usage
    threshold: 1024 // Only compress responses > 1KB
  }),

  // Security with minimal overhead
  helmet({
    contentSecurityPolicy: false, // Disable if not needed
    crossOriginEmbedderPolicy: false
  }),

  // Request parsing optimization
  express.json({ limit: '10mb' }),
  express.urlencoded({ extended: true, limit: '10mb' })
];
```

#### 2. Response Optimization
```typescript
// apps/api/src/utils/responseOptimizer.ts
export class ResponseOptimizer {
  static paginate<T>(
    data: T[],
    page: number = 1,
    limit: number = 20
  ): PaginatedResponse<T> {
    const offset = (page - 1) * limit;
    const paginatedData = data.slice(offset, offset + limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: data.length,
        pages: Math.ceil(data.length / limit),
        hasNext: offset + limit < data.length,
        hasPrev: page > 1
      }
    };
  }

  static selectFields<T>(data: T[], fields?: string[]): Partial<T>[] {
    if (!fields || fields.length === 0) {
      return data;
    }

    return data.map(item => {
      const selected: Partial<T> = {};
      fields.forEach(field => {
        if (field in item) {
          (selected as any)[field] = (item as any)[field];
        }
      });
      return selected;
    });
  }
}
```

## 🚀 Query Optimization Strategies

### 1. Batch Operations
```typescript
// apps/api/src/services/batchService.ts
export class BatchService {
  static async createNodes<T extends BaseNode>(
    nodeData: CreateNodeRequest<T>[],
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];

    // Process in batches to avoid memory issues
    for (let i = 0; i < nodeData.length; i += batchSize) {
      const batch = nodeData.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(data => this.nodeService.createNode(data))
      );

      results.push(...batchResults);

      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < nodeData.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }
}
```

### 2. Efficient Graph Traversals
```typescript
// apps/api/src/services/optimizedGraphService.ts
export class OptimizedGraphService extends GraphService {
  async getStoryFlow(
    startSceneId: string,
    maxDepth: number = 10
  ): Promise<StoryFlowResult> {
    const session = this.driver.session();

    try {
      // Optimized query for story flow with minimal data transfer
      const result = await session.run(`
        MATCH path = (start:Scene {id: $startSceneId})
          -[:LEADS_TO*1..$maxDepth]->
          (end:Scene)
        WITH path, nodes(path) as scenes, relationships(path) as transitions
        RETURN {
          scenes: [scene IN scenes | {
            id: scene.id,
            title: scene.title,
            sequence: scene.sequence,
            chapter: scene.chapter
          }],
          transitions: [rel IN transitions | {
            type: rel.type,
            weight: rel.weight,
            transition_type: rel.transition_type
          }],
          length: length(path)
        } as storyFlow
        ORDER BY length(path)
        LIMIT 100
      `, { startSceneId, maxDepth });

      return {
        flows: result.records.map(record => record.get('storyFlow')),
        totalPaths: result.records.length
      };
    } finally {
      await session.close();
    }
  }
}
```

## 📊 Monitoring and Profiling

### 1. Performance Monitoring
```typescript
// apps/api/src/middleware/monitoring.ts
export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric> = new Map();

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = process.hrtime.bigint();

      res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000; // Convert to milliseconds

        const route = `${req.method} ${req.route?.path || req.path}`;

        this.recordMetric(route, {
          duration,
          statusCode: res.statusCode,
          timestamp: new Date()
        });
      });

      next();
    };
  }

  private static recordMetric(route: string, metric: PerformanceMetric): void {
    const existing = this.metrics.get(route) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity
    };

    existing.count++;
    existing.totalDuration += metric.duration;
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.maxDuration = Math.max(existing.maxDuration, metric.duration);
    existing.minDuration = Math.min(existing.minDuration, metric.duration);

    this.metrics.set(route, existing);
  }

  static getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }
}
```

### 2. Database Query Profiling
```typescript
// apps/api/src/utils/queryProfiler.ts
export class QueryProfiler {
  static async profileQuery(
    session: neo4j.Session,
    query: string,
    parameters: any = {}
  ): Promise<ProfiledQueryResult> {
    const profileQuery = `PROFILE ${query}`;

    const start = process.hrtime.bigint();
    const result = await session.run(profileQuery, parameters);
    const end = process.hrtime.bigint();

    const executionTime = Number(end - start) / 1_000_000;

    return {
      records: result.records,
      summary: result.summary,
      executionTime,
      profile: result.summary.profile
    };
  }
}
```

## 🔧 Production Optimization Checklist

### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048"

# Database configuration
NEO4J_MAX_POOL_SIZE=50
NEO4J_ACQUISITION_TIMEOUT=60000

# Caching
REDIS_ENABLED=true
CACHE_DEFAULT_TTL=300

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
LOG_LEVEL=warn
```

### Build Optimizations
```json
// package.json
{
  "scripts": {
    "build:prod": "NODE_ENV=production tsc && npm run optimize",
    "optimize": "npm run bundle-analyzer && npm run tree-shake",
    "start:prod": "NODE_ENV=production node --max-old-space-size=2048 dist/index.js"
  }
}
```

### Docker Optimizations
```dockerfile
# Production Dockerfile optimizations
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
USER node
EXPOSE 3001
CMD ["node", "--max-old-space-size=1024", "dist/index.js"]
```

## 📈 Performance Testing

### Load Testing Script
```javascript
// scripts/loadTest.js
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Less than 10% failures
  },
};

export default function() {
  // Test various endpoints
  let responses = http.batch([
    ['GET', 'http://localhost:3001/api/nodes?type=Scene&limit=20'],
    ['GET', 'http://localhost:3001/api/graph/stats'],
    ['GET', 'http://localhost:3001/api/relationships?page=1&limit=10'],
  ]);

  responses.forEach((res, index) => {
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  });
}
```

---

*This performance tuning guide should be regularly updated based on production metrics and performance testing results.*