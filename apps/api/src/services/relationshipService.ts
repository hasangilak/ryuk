import { Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { getNeo4jDriver } from '../database/connections';
import { logger } from '../utils/logger';
import { DatabaseError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  validateRelationship,
  validateNodeRelationshipCompatibility,
  RelationshipType,
  BaseRelationship,
  LeadsToRelationship,
  AppearsInRelationship,
  TriggersRelationship,
  RequiresRelationship,
  LocatedAtRelationship,
  ContainsRelationship,
  BelongsToRelationship,
  ConvergesToRelationship,
  GroupedWithRelationship,
  InfluencesRelationship,
  AppearsThroughoutRelationship,
  NodeType,
} from '@ryuk/shared';

export interface RelationshipWithType extends BaseRelationship {
  type: RelationshipType;
  fromNodeId: string;
  toNodeId: string;
}

import { NodeService } from './nodeService';

export interface CreateRelationshipRequest {
  type: RelationshipType;
  fromNodeId: string;
  toNodeId: string;
  properties?: Record<string, any>;
}

export interface UpdateRelationshipRequest {
  properties: Record<string, any>;
}

export interface ListRelationshipsQuery {
  type?: RelationshipType;
  fromNodeId?: string;
  toNodeId?: string;
  page?: number;
  limit?: number;
}

export class RelationshipService {
  private driver = getNeo4jDriver();
  private nodeService = new NodeService();

  async createRelationship(request: CreateRelationshipRequest): Promise<RelationshipWithType> {
    const session = this.driver.session();
    try {
      // Get the nodes to validate compatibility
      const [fromNode, toNode] = await Promise.all([
        this.nodeService.getNodeById(request.fromNodeId),
        this.nodeService.getNodeById(request.toNodeId),
      ]);

      // Validate node-relationship compatibility
      const compatibility = validateNodeRelationshipCompatibility(
        fromNode.type as NodeType,
        toNode.type as NodeType,
        request.type
      );

      if (!compatibility.valid) {
        throw new ValidationError(compatibility.error || 'Invalid relationship combination');
      }

      // Prepare relationship data
      const relationshipData = {
        id: uuidv4(),
        type: request.type,
        fromNodeId: request.fromNodeId,
        toNodeId: request.toNodeId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...request.properties,
      };

      // Validate the relationship data
      const validation = validateRelationship(request.type, relationshipData);
      if (!validation.success) {
        throw new ValidationError(`Relationship validation failed: ${validation.error}`);
      }

      const validatedData = validation.data;

      // Create the relationship in Neo4j
      const result = await session.run(
        `
        MATCH (from) WHERE from.id = $fromNodeId
        MATCH (to) WHERE to.id = $toNodeId
        CREATE (from)-[r:${request.type} $properties]->(to)
        RETURN r, from, to
        `,
        {
          fromNodeId: request.fromNodeId,
          toNodeId: request.toNodeId,
          properties: validatedData,
        }
      );

      if (result.records.length === 0) {
        throw new DatabaseError('Failed to create relationship');
      }

      const createdRelationship = result.records[0].get('r').properties;
      logger.info(`Created ${request.type} relationship:`, {
        id: createdRelationship.id,
        fromNodeId: request.fromNodeId,
        toNodeId: request.toNodeId,
      });

      return createdRelationship;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error creating relationship:', error);
      throw new DatabaseError('Failed to create relationship', error);
    } finally {
      await session.close();
    }
  }

  async getRelationshipById(id: string): Promise<RelationshipWithType> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (from)-[r]->(to)
        WHERE r.id = $id
        RETURN r, type(r) as relType, from.id as fromNodeId, to.id as toNodeId
        `,
        { id }
      );

      if (result.records.length === 0) {
        throw new NotFoundError(`Relationship with id ${id} not found`);
      }

      const record = result.records[0];
      const relationship = record.get('r').properties;
      relationship.type = record.get('relType');
      relationship.fromNodeId = record.get('fromNodeId');
      relationship.toNodeId = record.get('toNodeId');

      return relationship;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting relationship:', error);
      throw new DatabaseError('Failed to get relationship', error);
    } finally {
      await session.close();
    }
  }

  async updateRelationship(id: string, request: UpdateRelationshipRequest): Promise<RelationshipWithType> {
    const session = this.driver.session();
    try {
      // Get existing relationship first
      const existingRelationship = await this.getRelationshipById(id);

      // Merge with new data
      const updatedData = {
        ...existingRelationship,
        ...request.properties,
        updatedAt: new Date(),
      };

      // Validate the updated relationship
      const validation = validateRelationship(existingRelationship.type as RelationshipType, updatedData);
      if (!validation.success) {
        throw new ValidationError(`Relationship validation failed: ${validation.error}`);
      }

      const validatedData = validation.data;

      // Update the relationship
      const result = await session.run(
        `
        MATCH (from)-[r]->(to)
        WHERE r.id = $id
        SET r = $properties
        RETURN r, type(r) as relType, from.id as fromNodeId, to.id as toNodeId
        `,
        { id, properties: validatedData }
      );

      if (result.records.length === 0) {
        throw new NotFoundError(`Relationship with id ${id} not found`);
      }

      const record = result.records[0];
      const relationship = record.get('r').properties;
      relationship.type = record.get('relType');
      relationship.fromNodeId = record.get('fromNodeId');
      relationship.toNodeId = record.get('toNodeId');

      logger.info(`Updated relationship:`, { id });

      return relationship;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error updating relationship:', error);
      throw new DatabaseError('Failed to update relationship', error);
    } finally {
      await session.close();
    }
  }

  async deleteRelationship(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (from)-[r]->(to)
        WHERE r.id = $id
        DELETE r
        RETURN count(r) as deletedCount
        `,
        { id }
      );

      const deletedCount = result.records[0].get('deletedCount').toNumber();

      if (deletedCount === 0) {
        throw new NotFoundError(`Relationship with id ${id} not found`);
      }

      logger.info(`Deleted relationship:`, { id });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deleting relationship:', error);
      throw new DatabaseError('Failed to delete relationship', error);
    } finally {
      await session.close();
    }
  }

  async listRelationships(query: ListRelationshipsQuery = {}): Promise<{
    relationships: RelationshipWithType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const session = this.driver.session();
    try {
      const { type, fromNodeId, toNodeId, page = 1, limit = 20 } = query;
      const skip = (page - 1) * limit;

      let whereClause = '';
      const parameters: any = { skip, limit };

      const conditions: string[] = [];

      if (type) {
        conditions.push(`type(r) = $type`);
        parameters.type = type;
      }

      if (fromNodeId) {
        conditions.push(`from.id = $fromNodeId`);
        parameters.fromNodeId = fromNodeId;
      }

      if (toNodeId) {
        conditions.push(`to.id = $toNodeId`);
        parameters.toNodeId = toNodeId;
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Get total count
      const countResult = await session.run(
        `MATCH (from)-[r]->(to) ${whereClause} RETURN count(r) as total`,
        parameters
      );

      const total = countResult.records[0].get('total').toNumber();

      // Get relationships
      const result = await session.run(
        `
        MATCH (from)-[r]->(to) ${whereClause}
        RETURN r, type(r) as relType, from.id as fromNodeId, to.id as toNodeId
        ORDER BY r.createdAt DESC
        SKIP $skip LIMIT $limit
        `,
        parameters
      );

      const relationships = result.records.map(record => {
        const relationship = record.get('r').properties;
        relationship.type = record.get('relType');
        relationship.fromNodeId = record.get('fromNodeId');
        relationship.toNodeId = record.get('toNodeId');
        return relationship;
      });

      return {
        relationships,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing relationships:', error);
      throw new DatabaseError('Failed to list relationships', error);
    } finally {
      await session.close();
    }
  }

  async getRelationshipsByNode(nodeId: string, direction: 'incoming' | 'outgoing' | 'both' = 'both'): Promise<RelationshipWithType[]> {
    const session = this.driver.session();
    try {
      let matchClause = '';
      let returnClause = '';

      switch (direction) {
        case 'incoming':
          matchClause = 'MATCH (from)-[r]->(to) WHERE to.id = $nodeId';
          returnClause = 'RETURN r, type(r) as relType, from.id as fromNodeId, to.id as toNodeId';
          break;
        case 'outgoing':
          matchClause = 'MATCH (from)-[r]->(to) WHERE from.id = $nodeId';
          returnClause = 'RETURN r, type(r) as relType, from.id as fromNodeId, to.id as toNodeId';
          break;
        case 'both':
          matchClause = 'MATCH (n)-[r]-(other) WHERE n.id = $nodeId';
          returnClause = `
            RETURN r, type(r) as relType,
            CASE WHEN startNode(r).id = $nodeId THEN startNode(r).id ELSE endNode(r).id END as fromNodeId,
            CASE WHEN endNode(r).id = $nodeId THEN endNode(r).id ELSE startNode(r).id END as toNodeId
          `;
          break;
      }

      const result = await session.run(
        `${matchClause} ${returnClause} ORDER BY r.createdAt DESC`,
        { nodeId }
      );

      return result.records.map(record => {
        const relationship = record.get('r').properties;
        relationship.type = record.get('relType');
        relationship.fromNodeId = record.get('fromNodeId');
        relationship.toNodeId = record.get('toNodeId');
        return relationship;
      });
    } catch (error) {
      logger.error('Error getting relationships by node:', error);
      throw new DatabaseError('Failed to get relationships by node', error);
    } finally {
      await session.close();
    }
  }
}