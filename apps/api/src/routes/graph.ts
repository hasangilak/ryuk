import { Router, Request, Response, NextFunction } from 'express';
import { GraphService } from '../services/graphService';
import { ValidationError } from '../middleware/errorHandler';
import { NodeType, RelationshipType } from '@ryuk/shared';

const router = Router();
const graphService = new GraphService();

// POST /api/graph/query - Execute custom Cypher queries
router.post('/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, parameters } = req.body;

    if (!query || typeof query !== 'string') {
      throw new ValidationError('Valid Cypher query is required');
    }

    const result = await graphService.executeQuery({
      query,
      parameters: parameters || {},
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/graph/traverse - Traverse graph with options
router.get('/traverse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      startNodeId,
      maxDepth = '3',
      relationshipTypes,
      nodeTypes,
      direction = 'outgoing',
    } = req.query;

    if (!startNodeId || typeof startNodeId !== 'string') {
      throw new ValidationError('Valid startNodeId is required');
    }

    const maxDepthNum = parseInt(maxDepth as string, 10);
    if (isNaN(maxDepthNum) || maxDepthNum < 1 || maxDepthNum > 10) {
      throw new ValidationError('maxDepth must be between 1 and 10');
    }

    if (!['incoming', 'outgoing', 'both'].includes(direction as string)) {
      throw new ValidationError('Direction must be one of: incoming, outgoing, both');
    }

    // Parse relationship types
    let parsedRelationshipTypes: RelationshipType[] | undefined;
    if (relationshipTypes) {
      const types = (relationshipTypes as string).split(',');
      const validTypes = ['LEADS_TO', 'APPEARS_IN', 'TRIGGERS', 'REQUIRES', 'LOCATED_AT'];

      for (const type of types) {
        if (!validTypes.includes(type.trim())) {
          throw new ValidationError(`Invalid relationship type: ${type}`);
        }
      }

      parsedRelationshipTypes = types.map(t => t.trim()) as RelationshipType[];
    }

    // Parse node types
    let parsedNodeTypes: NodeType[] | undefined;
    if (nodeTypes) {
      const types = (nodeTypes as string).split(',');
      const validTypes = ['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item'];

      for (const type of types) {
        if (!validTypes.includes(type.trim())) {
          throw new ValidationError(`Invalid node type: ${type}`);
        }
      }

      parsedNodeTypes = types.map(t => t.trim()) as NodeType[];
    }

    const result = await graphService.traverseGraph({
      startNodeId,
      maxDepth: maxDepthNum,
      relationshipTypes: parsedRelationshipTypes,
      nodeTypes: parsedNodeTypes,
      direction: direction as 'incoming' | 'outgoing' | 'both',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/graph/stats - Get graph statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await graphService.getGraphStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/graph/validate - Validate graph structure
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = await graphService.validateGraphStructure();

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    next(error);
  }
});

export default router;