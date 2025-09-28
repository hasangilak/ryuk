import { Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../database/connections';
import { logger } from '../utils/logger';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';
import { NodeType, RelationshipType } from '@ryuk/shared';

export interface GraphTraversalOptions {
  startNodeId: string;
  maxDepth?: number;
  relationshipTypes?: RelationshipType[];
  nodeTypes?: NodeType[];
  direction?: 'incoming' | 'outgoing' | 'both';
}

export interface GraphStats {
  nodeCount: number;
  relationshipCount: number;
  nodeTypeBreakdown: Record<NodeType, number>;
  relationshipTypeBreakdown: Record<RelationshipType, number>;
  averageDegree: number;
  maxDepth: number;
}

export interface CypherQueryRequest {
  query: string;
  parameters?: Record<string, any>;
}

export interface GraphValidationResult {
  isValid: boolean;
  issues: string[];
  orphanedNodes: string[];
  circularReferences: string[];
  missingReferences: string[];
}

export class GraphService {
  private driver = getNeo4jDriver();

  async executeQuery(request: CypherQueryRequest): Promise<any[]> {
    const session = this.driver.session();
    try {
      // Basic query validation to prevent destructive operations
      const query = request.query.trim().toLowerCase();

      if (query.includes('delete') || query.includes('remove') || query.includes('detach')) {
        throw new ValidationError('Destructive operations are not allowed through this endpoint');
      }

      if (!query.startsWith('match') && !query.startsWith('return') && !query.startsWith('with')) {
        throw new ValidationError('Only read operations (MATCH, RETURN, WITH) are allowed');
      }

      const result = await session.run(request.query, request.parameters || {});

      return result.records.map(record => {
        const recordObj: any = {};
        record.keys.forEach(key => {
          const value = record.get(key);

          // Handle Neo4j node and relationship objects
          if (value && typeof value === 'object') {
            if (value.properties) {
              recordObj[key] = value.properties;
            } else if (value.low !== undefined) {
              // Handle Neo4j integers
              recordObj[key] = value.toNumber ? value.toNumber() : value;
            } else {
              recordObj[key] = value;
            }
          } else {
            recordObj[key] = value;
          }
        });
        return recordObj;
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error executing query:', error);
      throw new DatabaseError('Failed to execute query', error);
    } finally {
      await session.close();
    }
  }

  async traverseGraph(options: GraphTraversalOptions): Promise<{
    nodes: any[];
    relationships: any[];
    paths: any[];
  }> {
    const session = this.driver.session();
    try {
      const {
        startNodeId,
        maxDepth = 3,
        relationshipTypes,
        nodeTypes,
        direction = 'outgoing',
      } = options;

      let relationshipPattern = '';
      let whereClause = '';
      const parameters: any = { startNodeId, maxDepth };

      // Build relationship pattern based on direction
      switch (direction) {
        case 'incoming':
          relationshipPattern = '<-[r]-';
          break;
        case 'outgoing':
          relationshipPattern = '-[r]->';
          break;
        case 'both':
          relationshipPattern = '-[r]-';
          break;
      }

      // Add relationship type filter
      if (relationshipTypes && relationshipTypes.length > 0) {
        const typeFilter = relationshipTypes.map(type => `r:${type}`).join('|');
        relationshipPattern = relationshipPattern.replace('[r]', `[r:${typeFilter}]`);
      }

      // Add node type filter
      const whereConditions: string[] = [];
      if (nodeTypes && nodeTypes.length > 0) {
        const nodeTypeConditions = nodeTypes.map(type => `node:${type}`).join(' OR ');
        whereConditions.push(`(${nodeTypeConditions})`);
      }

      if (whereConditions.length > 0) {
        whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      }

      const query = `
        MATCH path = (start)${relationshipPattern}(node)
        WHERE start.id = $startNodeId AND length(path) <= $maxDepth
        ${whereClause}
        RETURN nodes(path) as pathNodes, relationships(path) as pathRels, path
      `;

      const result = await session.run(query, parameters);

      const allNodes = new Map();
      const allRelationships = new Map();
      const paths: any[] = [];

      result.records.forEach(record => {
        const pathNodes = record.get('pathNodes');
        const pathRels = record.get('pathRels');
        const path = record.get('path');

        // Collect unique nodes
        pathNodes.forEach((node: any) => {
          if (!allNodes.has(node.properties.id)) {
            allNodes.set(node.properties.id, {
              ...node.properties,
              labels: node.labels,
            });
          }
        });

        // Collect unique relationships
        pathRels.forEach((rel: any) => {
          if (!allRelationships.has(rel.properties.id)) {
            allRelationships.set(rel.properties.id, {
              ...rel.properties,
              type: rel.type,
            });
          }
        });

        // Store path information
        paths.push({
          length: path.length,
          nodes: pathNodes.map((n: any) => n.properties.id),
          relationships: pathRels.map((r: any) => r.properties.id),
        });
      });

      return {
        nodes: Array.from(allNodes.values()),
        relationships: Array.from(allRelationships.values()),
        paths,
      };
    } catch (error) {
      logger.error('Error traversing graph:', error);
      throw new DatabaseError('Failed to traverse graph', error);
    } finally {
      await session.close();
    }
  }

  async getGraphStats(): Promise<GraphStats> {
    const session = this.driver.session();
    try {
      // Get basic counts
      const countsResult = await session.run(`
        MATCH (n)
        OPTIONAL MATCH ()-[r]->()
        RETURN
          count(DISTINCT n) as nodeCount,
          count(DISTINCT r) as relationshipCount
      `);

      const nodeCount = countsResult.records[0].get('nodeCount').toNumber();
      const relationshipCount = countsResult.records[0].get('relationshipCount').toNumber();

      // Get node type breakdown
      const nodeTypesResult = await session.run(`
        MATCH (n)
        UNWIND labels(n) as label
        WITH label, count(n) as count
        WHERE label IN ['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item']
        RETURN label, count
      `);

      const nodeTypeBreakdown: Record<NodeType, number> = {} as any;
      nodeTypesResult.records.forEach(record => {
        const label = record.get('label') as NodeType;
        const count = record.get('count').toNumber();
        nodeTypeBreakdown[label] = count;
      });

      // Get relationship type breakdown
      const relTypesResult = await session.run(`
        MATCH ()-[r]->()
        RETURN type(r) as relType, count(r) as count
      `);

      const relationshipTypeBreakdown: Record<RelationshipType, number> = {} as any;
      relTypesResult.records.forEach(record => {
        const relType = record.get('relType') as RelationshipType;
        const count = record.get('count').toNumber();
        relationshipTypeBreakdown[relType] = count;
      });

      // Calculate average degree
      const averageDegree = nodeCount > 0 ? (relationshipCount * 2) / nodeCount : 0;

      // Find maximum path length (depth)
      const maxDepthResult = await session.run(`
        MATCH p = ()-[*]->()
        RETURN max(length(p)) as maxDepth
      `);

      const maxDepth = maxDepthResult.records[0].get('maxDepth')?.toNumber() || 0;

      return {
        nodeCount,
        relationshipCount,
        nodeTypeBreakdown,
        relationshipTypeBreakdown,
        averageDegree: Number(averageDegree.toFixed(2)),
        maxDepth,
      };
    } catch (error) {
      logger.error('Error getting graph stats:', error);
      throw new DatabaseError('Failed to get graph statistics', error);
    } finally {
      await session.close();
    }
  }

  async validateGraphStructure(): Promise<GraphValidationResult> {
    const session = this.driver.session();
    try {
      const issues: string[] = [];
      const orphanedNodes: string[] = [];
      const circularReferences: string[] = [];
      const missingReferences: string[] = [];

      // Find orphaned nodes (nodes with no relationships)
      const orphanedResult = await session.run(`
        MATCH (n)
        WHERE NOT (n)-[]->() AND NOT ()-[]->(n)
        RETURN n.id as nodeId, labels(n) as labels
      `);

      orphanedResult.records.forEach(record => {
        const nodeId = record.get('nodeId');
        orphanedNodes.push(nodeId);
      });

      if (orphanedNodes.length > 0) {
        issues.push(`Found ${orphanedNodes.length} orphaned nodes with no relationships`);
      }

      // Find circular references (cycles in the graph)
      const cycleResult = await session.run(`
        MATCH (start)-[*1..10]->(start)
        RETURN DISTINCT start.id as nodeId
        LIMIT 100
      `);

      cycleResult.records.forEach(record => {
        const nodeId = record.get('nodeId');
        circularReferences.push(nodeId);
      });

      if (circularReferences.length > 0) {
        issues.push(`Found ${circularReferences.length} nodes involved in circular references`);
      }

      // Validate required relationships based on node types
      const invalidRelationshipsResult = await session.run(`
        MATCH (from)-[r]->(to)
        WITH from, r, to, labels(from) as fromLabels, labels(to) as toLabels, type(r) as relType
        WHERE NOT (
          (from:Scene AND to:Scene AND relType = 'LEADS_TO') OR
          (from:Scene AND to:Choice AND relType = 'LEADS_TO') OR
          (from:Choice AND to:Scene AND relType = 'LEADS_TO') OR
          (from:Character AND to:Scene AND relType = 'APPEARS_IN') OR
          (from:Character AND to:Event AND relType = 'APPEARS_IN') OR
          (from:Event AND to:Event AND relType = 'TRIGGERS') OR
          (from:Choice AND to:Event AND relType = 'TRIGGERS') OR
          (from:Scene AND to:Event AND relType = 'TRIGGERS') OR
          (from:Scene AND to:Event AND relType = 'REQUIRES') OR
          (from:Choice AND to:Event AND relType = 'REQUIRES') OR
          (from:Event AND to:Event AND relType = 'REQUIRES') OR
          (from:Scene AND to:Location AND relType = 'LOCATED_AT') OR
          (from:Character AND to:Location AND relType = 'LOCATED_AT') OR
          (from:Item AND to:Location AND relType = 'LOCATED_AT')
        )
        RETURN from.id as fromId, to.id as toId, relType
        LIMIT 100
      `);

      invalidRelationshipsResult.records.forEach(record => {
        const fromId = record.get('fromId');
        const toId = record.get('toId');
        const relType = record.get('relType');
        issues.push(`Invalid relationship: ${fromId} -[${relType}]-> ${toId}`);
      });

      const isValid = issues.length === 0;

      return {
        isValid,
        issues,
        orphanedNodes,
        circularReferences,
        missingReferences,
      };
    } catch (error) {
      logger.error('Error validating graph structure:', error);
      throw new DatabaseError('Failed to validate graph structure', error);
    } finally {
      await session.close();
    }
  }
}