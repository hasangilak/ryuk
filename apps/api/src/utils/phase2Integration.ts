// Phase 2 Integration Utilities
// This file contains utilities to help Phase 2 services integrate with existing Phase 1 infrastructure

import { GraphService, CypherQueryRequest } from '../services/graphService';
import { NodeService } from '../services/nodeService';
import { RelationshipService } from '../services/relationshipService';

/**
 * Wrapper for GraphService.executeQuery to match Phase 2 service expectations
 */
export class Phase2GraphService extends GraphService {
  async executeQuery(query: string | CypherQueryRequest, parameters?: Record<string, any>): Promise<any> {
    if (typeof query === 'string') {
      return super.executeQuery({ query, parameters: parameters || {} });
    } else {
      return super.executeQuery(query);
    }
  }
}

/**
 * Wrapper for NodeService to match Phase 2 service expectations
 */
export class Phase2NodeService extends NodeService {
  /**
   * Get node by ID and type
   */
  async getNode(type: string, id: string): Promise<any> {
    const node = await this.getNodeById(id);
    if (node.type !== type) {
      throw new Error(`Node ${id} is not of type ${type}`);
    }
    return node;
  }

  /**
   * Create node with Phase 2 compatible signature
   */
  async createPhase2Node(type: string, data: any): Promise<any> {
    return super.createNode({ type: type as any, data });
  }

  /**
   * Update node with Phase 2 compatible signature
   */
  async updatePhase2Node(type: string, id: string, updates: any): Promise<any> {
    return super.updateNode(id, { data: updates });
  }
}

/**
 * Helper to create Phase 2 service instances with proper dependencies
 */
export function createPhase2Services() {
  const graphService = new Phase2GraphService();
  const nodeService = new Phase2NodeService();
  const relationshipService = new RelationshipService();

  return {
    graphService,
    nodeService,
    relationshipService,
  };
}

/**
 * Mock query result for development/testing
 */
export function createMockQueryResult(records: any[] = []): any {
  return {
    records: records.map(record => ({
      get: (key: string) => record[key],
      keys: Object.keys(record),
      length: Object.keys(record).length,
    })),
    summary: {
      counters: {
        nodesCreated: 0,
        nodesDeleted: 0,
        relationshipsCreated: 0,
        relationshipsDeleted: 0,
      },
    },
  };
}

/**
 * Convert Neo4j Integer to regular number
 */
export function toNumber(value: any): number {
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return value || 0;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Error codes for Phase 2 services
 */
export const PHASE2_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ID: 'DUPLICATE_ID',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PERFORMANCE_ERROR: 'PERFORMANCE_ERROR',
} as const;

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Helper to safely access Neo4j query results
 */
export function safeGetRecords(result: any): any[] {
  return result?.records || [];
}

/**
 * Helper to safely get single record
 */
export function safeGetSingleRecord(result: any, defaultValue: any = null): any {
  const records = safeGetRecords(result);
  return records.length > 0 ? records[0] : defaultValue;
}

/**
 * Helper to safely get record count
 */
export function safeGetRecordCount(result: any): number {
  const records = safeGetRecords(result);
  return records.length;
}