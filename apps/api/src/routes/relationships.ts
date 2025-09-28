import { Router, Request, Response, NextFunction } from 'express';
import { RelationshipService } from '../services/relationshipService';
import { ValidationError } from '../middleware/errorHandler';
import { HTTP_STATUS_CODES, RelationshipType } from '@ryuk/shared';

const router = Router();
const relationshipService = new RelationshipService();

// GET /api/relationships - List relationships with filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      type,
      fromNodeId,
      toNodeId,
      page = '1',
      limit = '20',
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

    if (type && !['LEADS_TO', 'APPEARS_IN', 'TRIGGERS', 'REQUIRES', 'LOCATED_AT'].includes(type as string)) {
      throw new ValidationError('Invalid relationship type');
    }

    const result = await relationshipService.listRelationships({
      type: type as RelationshipType,
      fromNodeId: fromNodeId as string,
      toNodeId: toNodeId as string,
      page: pageNum,
      limit: limitNum,
    });

    res.json({
      success: true,
      data: result.relationships,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/relationships - Create a new relationship
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, fromNodeId, toNodeId, ...properties } = req.body;

    if (!type) {
      throw new ValidationError('Relationship type is required');
    }

    if (!['LEADS_TO', 'APPEARS_IN', 'TRIGGERS', 'REQUIRES', 'LOCATED_AT'].includes(type)) {
      throw new ValidationError('Invalid relationship type');
    }

    if (!fromNodeId || typeof fromNodeId !== 'string') {
      throw new ValidationError('Valid fromNodeId is required');
    }

    if (!toNodeId || typeof toNodeId !== 'string') {
      throw new ValidationError('Valid toNodeId is required');
    }

    if (fromNodeId === toNodeId) {
      throw new ValidationError('fromNodeId and toNodeId cannot be the same');
    }

    const relationship = await relationshipService.createRelationship({
      type: type as RelationshipType,
      fromNodeId,
      toNodeId,
      properties,
    });

    res.status(HTTP_STATUS_CODES.CREATED).json({
      success: true,
      data: relationship,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/relationships/:id - Get a specific relationship by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid relationship ID is required');
    }

    const relationship = await relationshipService.getRelationshipById(id);

    res.json({
      success: true,
      data: relationship,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/relationships/:id - Update a relationship
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid relationship ID is required');
    }

    // Prevent updating certain system fields
    delete updateData.id;
    delete updateData.type;
    delete updateData.fromNodeId;
    delete updateData.toNodeId;
    delete updateData.createdAt;

    const relationship = await relationshipService.updateRelationship(id, {
      properties: updateData,
    });

    res.json({
      success: true,
      data: relationship,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/relationships/:id - Delete a relationship
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid relationship ID is required');
    }

    await relationshipService.deleteRelationship(id);

    res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
});

export default router;