import neo4j, { Driver } from 'neo4j-driver';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Neo4j connection
let neo4jDriver: Driver;

export async function initializeNeo4j(): Promise<Driver> {
  try {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    neo4jDriver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      connectionTimeout: 20000,
      maxConnectionPoolSize: 50,
    });

    // Verify connectivity
    await neo4jDriver.verifyConnectivity();
    logger.info('Neo4j connection established successfully');

    return neo4jDriver;
  } catch (error) {
    logger.error('Failed to connect to Neo4j:', error);
    throw error;
  }
}

export function getNeo4jDriver(): Driver {
  if (!neo4jDriver) {
    throw new Error('Neo4j driver not initialized. Call initializeNeo4j() first.');
  }
  return neo4jDriver;
}

// Redis connection
let redisClient: Redis;

export function initializeRedis(): Redis {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connection established successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

// Database initialization
export async function connectDatabases(): Promise<void> {
  try {
    logger.info('Initializing database connections...');

    // Initialize connections
    await initializeNeo4j();
    initializeRedis();

    // Test Redis connection
    await redisClient.connect();
    await redisClient.ping();

    logger.info('All database connections established successfully');
  } catch (error) {
    logger.error('Failed to connect to databases:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabaseConnections(): Promise<void> {
  try {
    if (neo4jDriver) {
      await neo4jDriver.close();
      logger.info('Neo4j connection closed');
    }

    if (redisClient) {
      redisClient.disconnect();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
}

export { neo4jDriver, redisClient };