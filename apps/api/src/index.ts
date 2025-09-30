import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { validateEnv } from './utils/validateEnv';
import { connectDatabases } from './database/connections';
import { initializeCacheService, closeCacheService } from './services/cacheService';

// Import route handlers
import nodeRoutes from './routes/nodes';
import relationshipRoutes from './routes/relationships';
import graphRoutes from './routes/graph';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import phase2Routes from './routes/phase2';
import { createPhase3Router } from './routes/phase3';
import { createPhase4Router } from './routes/phase4';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

const app = express();
const PORT = process.env.API_PORT || 3001;

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'http://localhost:3000']
    : true,
  credentials: true,
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// =============================================================================
// ROUTES
// =============================================================================

// Health check (before auth to allow monitoring)
app.use('/api/health', healthRoutes);

// Authentication routes
app.use('/api/auth', authRoutes);

// API routes (with authentication middleware)
app.use('/api/nodes', nodeRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/phase2', phase2Routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Ryuk API - AI-Powered Manga Generation System',
    version: '4.0.0',
    phase: 'Phase 4 - Character State Management',
    docs: '/api/docs',
    health: '/api/health',
    phase2: '/api/phase2/capabilities',
    phase3: '/api/phase3/status',
    phase4: '/api/phase4/status',
  });
});

// API documentation route
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Ryuk API Documentation',
    version: '1.0.0',
    description: 'AI-powered manga generation system with sophisticated story graph architecture',
    endpoints: {
      nodes: {
        'GET /api/nodes': 'List all nodes with filtering and pagination',
        'POST /api/nodes': 'Create a new node',
        'GET /api/nodes/:id': 'Get a specific node by ID',
        'PUT /api/nodes/:id': 'Update a node',
        'DELETE /api/nodes/:id': 'Delete a node',
      },
      relationships: {
        'GET /api/relationships': 'List all relationships with filtering',
        'POST /api/relationships': 'Create a new relationship',
        'GET /api/relationships/:id': 'Get a specific relationship by ID',
        'PUT /api/relationships/:id': 'Update a relationship',
        'DELETE /api/relationships/:id': 'Delete a relationship',
      },
      graph: {
        'POST /api/graph/query': 'Execute custom Cypher queries',
        'GET /api/graph/traverse': 'Traverse graph with options',
        'GET /api/graph/stats': 'Get graph statistics',
        'POST /api/graph/validate': 'Validate graph structure',
      },
      auth: {
        'POST /api/auth/login': 'Login with credentials',
        'POST /api/auth/logout': 'Logout current session',
        'GET /api/auth/me': 'Get current user info',
        'POST /api/auth/google': 'Login with Google OAuth',
      },
      health: {
        'GET /api/health': 'Check system health',
        'GET /api/health/detailed': 'Detailed health check',
      },
    },
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date(),
  });
});

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    // Connect to databases
    await connectDatabases();

    // Get Neo4j driver for Phase 3 routes
    const { neo4jDriver } = await import('./database/connections');
    const phase3Router = createPhase3Router(neo4jDriver);
    app.use('/api/phase3', phase3Router);

    // Phase 4 Router
    const phase4Router = createPhase4Router(neo4jDriver);
    app.use('/api/phase4', phase4Router);

    // Initialize Redis cache service if enabled
    if (process.env.REDIS_ENABLED === 'true') {
      try {
        const cacheService = initializeCacheService({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        await cacheService.connect();
        logger.info('✅ Redis cache service initialized');
      } catch (error) {
        logger.warn('⚠️ Failed to initialize Redis cache service:', error);
        logger.info('🔄 Continuing without caching...');
      }
    } else {
      logger.info('🔄 Redis caching disabled (REDIS_ENABLED=false)');
    }

    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 Ryuk API server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close cache service
  try {
    await closeCacheService();
    logger.info('Cache service closed');
  } catch (error) {
    logger.error('Error closing cache service:', error);
  }

  // Close database connections
  try {
    const { neo4jDriver, redisClient } = await import('./database/connections');
    await neo4jDriver.close();
    if (redisClient) {
      redisClient.disconnect();
    }
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }

  process.exit(0);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();