import { Router, Request, Response, NextFunction } from 'express';
import { NodeService } from '../services/nodeService';
import { ValidationError } from '../middleware/errorHandler';
import { HTTP_STATUS_CODES, NodeType } from '@ryuk/shared';
import {
  nodesCacheMiddleware,
  singleNodeCacheMiddleware,
  nodeInvalidationMiddleware
} from '../middleware/caching';

const router = Router();
const nodeService = new NodeService();

// GET /api/nodes - List nodes with filtering and pagination
router.get('/', nodesCacheMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      type,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = req.query;

    // Validate query parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Page must be a positive integer');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (type && !['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item'].includes(type as string)) {
      throw new ValidationError('Invalid node type');
    }

    const result = await nodeService.listNodes({
      type: type as NodeType,
      page: pageNum,
      limit: limitNum,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      search: search as string,
    });

    res.json({
      success: true,
      data: result.nodes,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/nodes - Create a new node
router.post('/', nodeInvalidationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, ...nodeData } = req.body;

    if (!type) {
      throw new ValidationError('Node type is required');
    }

    if (!['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item'].includes(type)) {
      throw new ValidationError('Invalid node type');
    }

    const node = await nodeService.createNode({
      type: type as NodeType,
      data: nodeData,
    });

    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: node,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/nodes/:id - Get a specific node by ID
router.get('/:id', singleNodeCacheMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid node ID is required');
    }

    const node = await nodeService.getNodeById(id);

    res.json({
      success: true,
      data: node,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/nodes/:id - Update a node
router.put('/:id', nodeInvalidationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid node ID is required');
    }

    // Prevent updating certain system fields
    delete updateData.id;
    delete updateData.type;
    delete updateData.createdAt;

    const node = await nodeService.updateNode(id, {
      data: updateData,
    });

    res.json({
      success: true,
      data: node,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/nodes/:id - Delete a node
router.delete('/:id', nodeInvalidationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid node ID is required');
    }

    await nodeService.deleteNode(id);

    res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/nodes/:id/relationships - Get relationships for a specific node
router.get('/:id/relationships', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { direction = 'both' } = req.query;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid node ID is required');
    }

    if (!['incoming', 'outgoing', 'both'].includes(direction as string)) {
      throw new ValidationError('Direction must be one of: incoming, outgoing, both');
    }

    const { RelationshipService } = await import('../services/relationshipService');
    const relationshipService = new RelationshipService();

    const relationships = await relationshipService.getRelationshipsByNode(
      id,
      direction as 'incoming' | 'outgoing' | 'both'
    );

    res.json({
      success: true,
      data: relationships,
    });
  } catch (error) {
    next(error);
  }
});

export default router;