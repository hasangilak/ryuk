import { z } from 'zod';
import { AnyNode, NodeType } from './nodes';
import { AnyRelationship, RelationshipType } from './relationships';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: Date;
};

// =============================================================================
// PAGINATION TYPES
// =============================================================================

export const PaginationParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// =============================================================================
// QUERY FILTER TYPES
// =============================================================================

export const NodeFilterSchema = z.object({
  node_type: z.array(z.enum(['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item'])).optional(),
  created_after: z.date().optional(),
  created_before: z.date().optional(),
  search: z.string().optional(),
  properties: z.record(z.string(), z.any()).optional(),
});

export type NodeFilter = z.infer<typeof NodeFilterSchema>;

export const RelationshipFilterSchema = z.object({
  relationship_type: z.array(z.enum(['LEADS_TO', 'APPEARS_IN', 'TRIGGERS', 'REQUIRES', 'LOCATED_AT'])).optional(),
  from_node: z.string().uuid().optional(),
  to_node: z.string().uuid().optional(),
  created_after: z.date().optional(),
  created_before: z.date().optional(),
});

export type RelationshipFilter = z.infer<typeof RelationshipFilterSchema>;

// =============================================================================
// GRAPH QUERY TYPES
// =============================================================================

export const GraphQuerySchema = z.object({
  cypher: z.string(),
  parameters: z.record(z.string(), z.any()).optional(),
  include_stats: z.boolean().default(false),
});

export type GraphQuery = z.infer<typeof GraphQuerySchema>;

export interface GraphQueryResult {
  records: Array<Record<string, any>>;
  summary?: {
    query_type: string;
    counters: Record<string, number>;
    result_available_after: number;
    result_consumed_after: number;
  };
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

export interface BulkCreateNodesRequest {
  nodes: Array<{
    type: NodeType;
    data: any;
  }>;
}

export interface BulkCreateRelationshipsRequest {
  relationships: Array<{
    type: RelationshipType;
    data: any;
  }>;
}

export interface BulkOperationResult {
  created: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

// =============================================================================
// GRAPH STATISTICS
// =============================================================================

export interface GraphStatistics {
  nodes: {
    total: number;
    by_type: Record<NodeType, number>;
  };
  relationships: {
    total: number;
    by_type: Record<RelationshipType, number>;
  };
  performance: {
    avg_query_time: number;
    total_queries: number;
    cache_hit_ratio: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    last_checked: Date;
  };
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// =============================================================================
// EXPORT/IMPORT TYPES
// =============================================================================

export interface ExportOptions {
  format: 'json' | 'cypher' | 'graphml';
  include_nodes: boolean;
  include_relationships: boolean;
  node_types?: NodeType[];
  relationship_types?: RelationshipType[];
  compress: boolean;
}

export interface ImportOptions {
  format: 'json' | 'cypher' | 'graphml';
  merge_strategy: 'create' | 'merge' | 'replace';
  validate: boolean;
  dry_run: boolean;
}

export interface ExportResult {
  file_url: string;
  file_size: number;
  format: string;
  exported_at: Date;
  statistics: {
    nodes_exported: number;
    relationships_exported: number;
  };
}

export interface ImportResult {
  success: boolean;
  statistics: {
    nodes_created: number;
    nodes_updated: number;
    relationships_created: number;
    relationships_updated: number;
  };
  errors: string[];
  warnings: string[];
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'DUPLICATE_ID',
  'RELATIONSHIP_CONSTRAINT_VIOLATION',
  'DATABASE_ERROR',
  'AUTHENTICATION_ERROR',
  'AUTHORIZATION_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_SERVER_ERROR',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    neo4j: {
      status: 'up' | 'down';
      response_time: number;
      version?: string;
    };
    postgres: {
      status: 'up' | 'down';
      response_time: number;
      version?: string;
    };
    redis: {
      status: 'up' | 'down';
      response_time: number;
      version?: string;
    };
  };
  timestamp: Date;
}