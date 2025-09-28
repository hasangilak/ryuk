import { Router, Request, Response, NextFunction } from 'express';
import { getNeo4jDriver, getRedisClient } from '../database/connections';
import { logger } from '../utils/logger';
import { HTTP_STATUS_CODES } from '@ryuk/shared';

const router = Router();

// GET /api/health - Basic health check
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/health/detailed - Detailed health check with dependencies
router.get('/detailed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthChecks = {
      api: { status: 'healthy', message: 'API is running' },
      neo4j: { status: 'unknown', message: 'Not checked' },
      redis: { status: 'unknown', message: 'Not checked' },
    };

    let overallStatus = 'healthy';

    // Check Neo4j connection
    try {
      const driver = getNeo4jDriver();
      await driver.verifyConnectivity();
      healthChecks.neo4j = { status: 'healthy', message: 'Connected' };
    } catch (error) {
      healthChecks.neo4j = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
      overallStatus = 'degraded';
      logger.warn('Neo4j health check failed:', error);
    }

    // Check Redis connection
    try {
      const redis = getRedisClient();
      await redis.ping();
      healthChecks.redis = { status: 'healthy', message: 'Connected' };
    } catch (error) {
      healthChecks.redis = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
      overallStatus = 'degraded';
      logger.warn('Redis health check failed:', error);
    }

    // Determine overall status
    const hasUnhealthy = Object.values(healthChecks).some(check => check.status === 'unhealthy');
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    }

    const responseStatus = overallStatus === 'unhealthy'
      ? HTTP_STATUS_CODES.SERVICE_UNAVAILABLE
      : HTTP_STATUS_CODES.OK;

    res.status(responseStatus).json({
      success: overallStatus !== 'unhealthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: healthChecks,
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
        cpu: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
        },
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;