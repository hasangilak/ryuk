import { Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { getNeo4jDriver } from '../database/connections';
import { logger } from '../utils/logger';
import { DatabaseError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  validateNode,
  NodeType,
  BaseNode,
  SceneNode,
  CharacterNode,
  ChoiceNode,
  EventNode,
  LocationNode,
  ItemNode,
  StoryNode,
  KnotNode,
  StitchNode,
} from '@ryuk/shared';

export interface NodeWithType extends BaseNode {
  type: NodeType;
}

export interface CreateNodeRequest {
  type: NodeType;
  data: Partial<BaseNode>;
}

export interface UpdateNodeRequest {
  data: Partial<BaseNode>;
}

export interface ListNodesQuery {
  type?: NodeType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export class NodeService {
  private driver = getNeo4jDriver();

  async createNode(request: CreateNodeRequest): Promise<BaseNode> {
    const session = this.driver.session();
    try {
      // Generate ID if not provided
      const nodeData = {
        ...request.data,
        id: request.data.id || uuidv4(),
        type: request.type,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate the node data
      const validation = validateNode(request.type, nodeData);
      if (!validation.success) {
        throw new ValidationError(`Node validation failed: ${validation.error}`);
      }

      const validatedData = validation.data;

      // Create the node in Neo4j
      const result = await session.run(
        `
        CREATE (n:${request.type} $properties)
        RETURN n
        `,
        { properties: validatedData }
      );

      if (result.records.length === 0) {
        throw new DatabaseError('Failed to create node');
      }

      const createdNode = result.records[0].get('n').properties;
      logger.info(`Created ${request.type} node:`, { id: createdNode.id });

      return createdNode;
    } catch (error) {
      logger.error('Error creating node:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create node', error);
    } finally {
      await session.close();
    }
  }

  async getNodeById(id: string): Promise<NodeWithType> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (n) WHERE n.id = $id RETURN n, labels(n) as labels',
        { id }
      );

      if (result.records.length === 0) {
        throw new NotFoundError(`Node with id ${id} not found`);
      }

      const record = result.records[0];
      const node = record.get('n').properties;
      const labels = record.get('labels');

      // Add the type from labels (excluding base labels)
      node.type = labels.find((label: string) =>
        ['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item'].includes(label)
      );

      return node;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting node:', error);
      throw new DatabaseError('Failed to get node', error);
    } finally {
      await session.close();
    }
  }

  async updateNode(id: string, request: UpdateNodeRequest): Promise<NodeWithType> {
    const session = this.driver.session();
    try {
      // Get existing node first
      const existingNode = await this.getNodeById(id);

      // Merge with new data
      const updatedData = {
        ...existingNode,
        ...request.data,
        updatedAt: new Date(),
      };

      // Validate the updated node
      const validation = validateNode(existingNode.type as NodeType, updatedData);
      if (!validation.success) {
        throw new ValidationError(`Node validation failed: ${validation.error}`);
      }

      const validatedData = validation.data;

      // Update the node
      const result = await session.run(
        'MATCH (n) WHERE n.id = $id SET n = $properties RETURN n',
        { id, properties: validatedData }
      );

      if (result.records.length === 0) {
        throw new NotFoundError(`Node with id ${id} not found`);
      }

      const updatedNode = result.records[0].get('n').properties;
      logger.info(`Updated node:`, { id });

      return updatedNode;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error updating node:', error);
      throw new DatabaseError('Failed to update node', error);
    } finally {
      await session.close();
    }
  }

  async deleteNode(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      // Check if node exists and has relationships
      const checkResult = await session.run(
        'MATCH (n) WHERE n.id = $id OPTIONAL MATCH (n)-[r]-() RETURN n, count(r) as relationshipCount',
        { id }
      );

      if (checkResult.records.length === 0) {
        throw new NotFoundError(`Node with id ${id} not found`);
      }

      const relationshipCount = checkResult.records[0].get('relationshipCount').toNumber();

      if (relationshipCount > 0) {
        throw new ValidationError(
          `Cannot delete node with existing relationships. Found ${relationshipCount} relationships.`
        );
      }

      // Delete the node
      const result = await session.run(
        'MATCH (n) WHERE n.id = $id DELETE n RETURN count(n) as deletedCount',
        { id }
      );

      const deletedCount = result.records[0].get('deletedCount').toNumber();

      if (deletedCount === 0) {
        throw new NotFoundError(`Node with id ${id} not found`);
      }

      logger.info(`Deleted node:`, { id });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error deleting node:', error);
      throw new DatabaseError('Failed to delete node', error);
    } finally {
      await session.close();
    }
  }

  async listNodes(query: ListNodesQuery = {}): Promise<{
    nodes: NodeWithType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const session = this.driver.session();
    try {
      const {
        type,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
      } = query;

      const skip = (page - 1) * limit;

      // Build the query
      let whereClause = '';
      let orderClause = `ORDER BY n.${sortBy} ${sortOrder.toUpperCase()}`;
      const parameters: any = { skip, limit };

      if (type) {
        whereClause = `WHERE n:${type}`;
      }

      if (search) {
        const searchCondition = `(n.title CONTAINS $search OR n.name CONTAINS $search OR n.description CONTAINS $search)`;
        whereClause = whereClause
          ? `${whereClause} AND ${searchCondition}`
          : `WHERE ${searchCondition}`;
        parameters.search = search;
      }

      // Get total count
      const countResult = await session.run(
        `MATCH (n) ${whereClause} RETURN count(n) as total`,
        parameters
      );

      const total = countResult.records[0].get('total').toNumber();

      // Get nodes
      const result = await session.run(
        `
        MATCH (n) ${whereClause}
        RETURN n, labels(n) as labels
        ${orderClause}
        SKIP $skip LIMIT $limit
        `,
        parameters
      );

      const nodes = result.records.map(record => {
        const node = record.get('n').properties;
        const labels = record.get('labels');

        // Add the type from labels
        node.type = labels.find((label: string) =>
          ['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item'].includes(label)
        );

        return node;
      });

      return {
        nodes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing nodes:', error);
      throw new DatabaseError('Failed to list nodes', error);
    } finally {
      await session.close();
    }
  }

  async getNodesByType(type: NodeType): Promise<NodeWithType[]> {
    const result = await this.listNodes({ type, limit: 1000 });
    return result.nodes;
  }
}