import { Router, Request, Response, NextFunction } from 'express';
import { phase2Services } from '../services/phase2Services';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Simple async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Simple validation middleware
const validateRequest = (schema: { params?: z.ZodSchema; body?: z.ZodSchema }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.params) {
        schema.params.parse(req.params);
      }
      if (schema.body) {
        schema.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

const router = Router();

// =============================================================================
// PHASE 2 STATUS AND HEALTH
// =============================================================================

/**
 * Get Phase 2 system status and health
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  try {
    const performanceMetrics = await phase2Services.performanceOptimization.getPerformanceMetrics();
    const healthCheck = await phase2Services.performanceOptimization.healthCheck();

    res.json({
      status: 'Phase 2 Active',
      health: healthCheck,
      performance: performanceMetrics,
      services: {
        narrativeConsistency: 'active',
        contentElements: 'active',
        performanceOptimization: 'active',
        communityDetection: 'active',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Phase 2 health check failed:', error);
    res.status(500).json({
      status: 'Phase 2 Error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

// =============================================================================
// NARRATIVE CONSISTENCY VALIDATION
// =============================================================================

const validateStoryIdSchema = z.object({
  storyId: z.string().uuid(),
});

/**
 * Validate story consistency
 */
router.post('/consistency/validate/:storyId',
  validateRequest({ params: validateStoryIdSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { storyId } = req.params;

    logger.info(`Validating story consistency for ${storyId}`);

    const result = await phase2Services.narrativeConsistency.validateStoryConsistency(storyId);

    res.json({
      success: true,
      data: result,
    });
  })
);

// =============================================================================
// CONTENT ELEMENTS
// =============================================================================

const createContentElementSchema = z.object({
  parent_id: z.string().uuid(),
  content_type: z.enum(['text', 'image', 'choice', 'interaction']),
  content_data: z.record(z.any()),
  sequence_order: z.number().int().min(1),
});

/**
 * Create content element
 */
router.post('/content-elements',
  validateRequest({ body: createContentElementSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const contentElementData = req.body;

    logger.info(`Creating content element for parent ${contentElementData.parent_id}`);

    const contentElement = await phase2Services.contentElements.createContentElement(contentElementData);

    res.status(201).json({
      success: true,
      data: contentElement,
    });
  })
);

/**
 * Get content element by ID
 */
router.get('/content-elements/:elementId',
  validateRequest({ params: z.object({ elementId: z.string().uuid() }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { elementId } = req.params;

    const contentElement = await phase2Services.contentElements.getContentElement(elementId);

    if (!contentElement) {
      res.status(404).json({
        success: false,
        error: 'Content element not found',
      });
      return;
    }

    res.json({
      success: true,
      data: contentElement,
    });
  })
);

// =============================================================================
// COMMUNITY DETECTION
// =============================================================================

/**
 * Detect communities in a story
 */
router.post('/communities/detect/:storyId',
  validateRequest({ params: validateStoryIdSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { storyId } = req.params;

    logger.info(`Detecting communities for story ${storyId}`);

    const result = await phase2Services.communityDetection.detectCommunities(storyId);

    res.json({
      success: true,
      data: result,
    });
  })
);

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

/**
 * Get performance metrics
 */
router.get('/performance/metrics', asyncHandler(async (req: Request, res: Response) => {
  const metrics = await phase2Services.performanceOptimization.getPerformanceMetrics();

  res.json({
    success: true,
    data: metrics,
  });
}));

/**
 * Get system health check
 */
router.get('/performance/health-check', asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = await phase2Services.performanceOptimization.healthCheck();

  res.json({
    success: true,
    data: healthCheck,
  });
}));

// =============================================================================
// PHASE 2 CAPABILITIES
// =============================================================================

/**
 * Get Phase 2 capabilities and features
 */
router.get('/capabilities', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      phase: 'Phase 2 - Story Graph Architecture',
      version: '2.0.0',
      completion: '100%',
      capabilities: [
        {
          name: 'Narrative Consistency Validation',
          description: 'Validates story coherence and identifies inconsistencies',
          status: 'active',
          endpoints: [
            'POST /api/phase2/consistency/validate/{storyId}',
          ],
        },
        {
          name: 'Content Element Management',
          description: 'Manages rich multimedia content within story structures',
          status: 'active',
          endpoints: [
            'POST /api/phase2/content-elements',
            'GET /api/phase2/content-elements/{elementId}',
          ],
        },
        {
          name: 'Community Detection',
          description: 'Analyzes narrative relationships and character groupings',
          status: 'active',
          endpoints: [
            'POST /api/phase2/communities/detect/{storyId}',
          ],
        },
        {
          name: 'Performance Optimization',
          description: 'Monitors system performance and provides optimization insights',
          status: 'active',
          endpoints: [
            'GET /api/phase2/performance/metrics',
            'GET /api/phase2/performance/health-check',
          ],
        },
      ],
      advanced_features: [
        'Choice Template System (Documented)',
        'Viewpoint Switching (Documented)',
        'Parallel Timeline Management (Documented)',
        'Memory Management & Caching',
        'Real-time Performance Monitoring',
      ],
      architecture_components: [
        'Service Layer Integration',
        'Type-Safe API Design',
        'Comprehensive Error Handling',
        'Performance Optimization',
        'Extensible Plugin Architecture',
      ],
    },
  });
}));

export default router;