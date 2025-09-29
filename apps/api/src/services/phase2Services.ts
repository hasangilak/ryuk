// Phase 2 Services Integration
// Simplified Phase 2 functionality that properly integrates with Phase 1

import { NodeService } from './nodeService';
import { RelationshipService } from './relationshipService';
import { GraphService } from './graphService';
import { logger } from '../utils/logger';
import {
  createPhase2Services,
  Phase2GraphService,
  Phase2NodeService,
  PHASE2_ERROR_CODES,
  isValidUUID,
  validatePositiveNumber,
  safeGetRecords,
  safeGetSingleRecord,
  toNumber
} from '../utils/phase2Integration';

// =============================================================================
// SIMPLIFIED NARRATIVE CONSISTENCY SERVICE
// =============================================================================

export interface ConsistencyValidationResult {
  story_id: string;
  is_consistent: boolean;
  violations: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affected_nodes: string[];
  }>;
  confidence_score: number;
  validated_at: Date;
}

export class SimpleNarrativeConsistencyService {
  private graphService: Phase2GraphService;
  private nodeService: Phase2NodeService;

  constructor() {
    const services = createPhase2Services();
    this.graphService = services.graphService;
    this.nodeService = services.nodeService;
  }

  async validateStoryConsistency(storyId: string): Promise<ConsistencyValidationResult> {
    if (!isValidUUID(storyId)) {
      throw new Error(`${PHASE2_ERROR_CODES.VALIDATION_ERROR}: Invalid story ID format`);
    }

    logger.info(`Validating story consistency for ${storyId}`);

    try {
      // Basic consistency checks
      const violations: any[] = [];

      // Check for orphaned nodes
      const orphanQuery = `
        MATCH (story:Story {id: $storyId})
        MATCH (n)
        WHERE NOT (n)-[:BELONGS_TO*0..3]-(story)
        AND n <> story
        RETURN count(n) as orphaned_count
      `;

      const orphanResult = await this.graphService.executeQuery(orphanQuery, { storyId });
      const orphanedCount = toNumber(safeGetSingleRecord(orphanResult)?.get('orphaned_count'));

      if (orphanedCount > 0) {
        violations.push({
          type: 'orphaned_nodes',
          severity: 'medium' as const,
          description: `Found ${orphanedCount} orphaned nodes not connected to the story`,
          affected_nodes: [],
        });
      }

      // Check for missing relationships
      const isolatedQuery = `
        MATCH (story:Story {id: $storyId})<-[:BELONGS_TO*1..3]-(n)
        WHERE NOT (n)-[]-()
        RETURN count(n) as isolated_count
      `;

      const isolatedResult = await this.graphService.executeQuery(isolatedQuery, { storyId });
      const isolatedCount = toNumber(safeGetSingleRecord(isolatedResult)?.get('isolated_count'));

      if (isolatedCount > 0) {
        violations.push({
          type: 'isolated_nodes',
          severity: 'low' as const,
          description: `Found ${isolatedCount} isolated nodes with no relationships`,
          affected_nodes: [],
        });
      }

      // Calculate confidence score
      const totalIssues = violations.length;
      const confidenceScore = Math.max(0.1, 1.0 - (totalIssues * 0.2));

      return {
        story_id: storyId,
        is_consistent: violations.filter(v => v.severity === 'critical').length === 0,
        violations,
        confidence_score: confidenceScore,
        validated_at: new Date(),
      };

    } catch (error) {
      logger.error('Story consistency validation failed:', error);
      throw new Error(`${PHASE2_ERROR_CODES.DATABASE_ERROR}: Validation failed`);
    }
  }
}

// =============================================================================
// SIMPLIFIED CONTENT ELEMENT SERVICE
// =============================================================================

export interface ContentElement {
  id: string;
  parent_id: string;
  content_type: 'text' | 'image' | 'choice' | 'interaction';
  content_data: Record<string, any>;
  sequence_order: number;
  created_at: Date;
  updated_at: Date;
}

export class SimpleContentElementService {
  private graphService: Phase2GraphService;
  private nodeService: Phase2NodeService;

  constructor() {
    const services = createPhase2Services();
    this.graphService = services.graphService;
    this.nodeService = services.nodeService;
  }

  async createContentElement(data: {
    parent_id: string;
    content_type: string;
    content_data: Record<string, any>;
    sequence_order: number;
  }): Promise<ContentElement> {
    const elementId = crypto.randomUUID();
    const now = new Date();

    const element: ContentElement = {
      id: elementId,
      parent_id: data.parent_id,
      content_type: data.content_type as any,
      content_data: data.content_data,
      sequence_order: data.sequence_order,
      created_at: now,
      updated_at: now,
    };

    // Store in Neo4j
    const query = `
      CREATE (ce:ContentElement {
        id: $id,
        parent_id: $parent_id,
        content_type: $content_type,
        content_data: $content_data,
        sequence_order: $sequence_order,
        created_at: $created_at,
        updated_at: $updated_at
      })
      RETURN ce
    `;

    await this.graphService.executeQuery(query, element);
    logger.info(`Created content element ${elementId}`);

    return element;
  }

  async getContentElement(elementId: string): Promise<ContentElement | null> {
    const query = `
      MATCH (ce:ContentElement {id: $elementId})
      RETURN ce
    `;

    const result = await this.graphService.executeQuery(query, { elementId });
    const record = safeGetSingleRecord(result);

    if (!record) {
      return null;
    }

    return record.get('ce').properties as ContentElement;
  }
}

// =============================================================================
// SIMPLIFIED PERFORMANCE OPTIMIZATION SERVICE
// =============================================================================

export interface PerformanceMetrics {
  memory_usage: {
    heap_used: number;
    heap_total: number;
  };
  system_health: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
  };
  cache_performance: {
    hit_ratio: number;
    total_requests: number;
  };
}

export class SimplePerformanceOptimizationService {
  private metricsHistory: PerformanceMetrics[] = [];

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    const metrics: PerformanceMetrics = {
      memory_usage: {
        heap_used: memUsage.heapUsed,
        heap_total: memUsage.heapTotal,
      },
      system_health: {
        status: this.determineHealthStatus(memUsage),
        uptime: uptime,
      },
      cache_performance: {
        hit_ratio: 0.75, // Simplified
        total_requests: 1000, // Simplified
      },
    };

    // Keep history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-50);
    }

    return metrics;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{ name: string; status: 'pass' | 'fail'; message: string }>;
  }> {
    const checks = [];
    const memUsage = process.memoryUsage();
    const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    checks.push({
      name: 'Memory Usage',
      status: memoryPercent < 80 ? 'pass' as const : 'fail' as const,
      message: `Memory usage: ${memoryPercent.toFixed(1)}%`,
    });

    checks.push({
      name: 'System Uptime',
      status: 'pass' as const,
      message: `Uptime: ${Math.floor(process.uptime())} seconds`,
    });

    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const status = failedChecks === 0 ? 'healthy' : failedChecks === 1 ? 'warning' : 'critical';

    return { status, checks };
  }

  private determineHealthStatus(memUsage: NodeJS.MemoryUsage): 'healthy' | 'warning' | 'critical' {
    const usage = memUsage.heapUsed / memUsage.heapTotal;
    if (usage > 0.9) return 'critical';
    if (usage > 0.8) return 'warning';
    return 'healthy';
  }
}

// =============================================================================
// SIMPLIFIED COMMUNITY DETECTION SERVICE
// =============================================================================

export interface Community {
  id: string;
  name: string;
  members: Array<{ node_id: string; node_type: string }>;
  community_type: string;
  created_at: Date;
}

export class SimpleCommunityDetectionService {
  private graphService: Phase2GraphService;

  constructor() {
    const services = createPhase2Services();
    this.graphService = services.graphService;
  }

  async detectCommunities(storyId: string): Promise<{
    story_id: string;
    communities: Community[];
    total_communities: number;
  }> {
    if (!isValidUUID(storyId)) {
      throw new Error(`${PHASE2_ERROR_CODES.VALIDATION_ERROR}: Invalid story ID format`);
    }

    logger.info(`Detecting communities for story ${storyId}`);

    try {
      // Simple community detection: group by node type and relationships
      const query = `
        MATCH (story:Story {id: $storyId})<-[:BELONGS_TO*1..3]-(n)
        OPTIONAL MATCH (n)-[r]-(related)
        WHERE related <> n
        RETURN labels(n)[0] as node_type, n.id as node_id, count(related) as connection_count
        ORDER BY connection_count DESC
      `;

      const result = await this.graphService.executeQuery(query, { storyId });
      const records = safeGetRecords(result);

      // Group nodes by type to form basic communities
      const nodesByType = new Map<string, any[]>();

      for (const record of records) {
        const nodeType = record.get('node_type');
        const nodeId = record.get('node_id');
        const connectionCount = toNumber(record.get('connection_count'));

        if (!nodesByType.has(nodeType)) {
          nodesByType.set(nodeType, []);
        }

        nodesByType.get(nodeType)!.push({
          node_id: nodeId,
          node_type: nodeType,
          connection_count: connectionCount,
        });
      }

      // Create communities from groups
      const communities: Community[] = [];

      for (const [nodeType, nodes] of nodesByType) {
        if (nodes.length >= 2) { // Only create communities with 2+ members
          communities.push({
            id: crypto.randomUUID(),
            name: `${nodeType} Community`,
            members: nodes.map(n => ({ node_id: n.node_id, node_type: n.node_type })),
            community_type: nodeType.toLowerCase(),
            created_at: new Date(),
          });
        }
      }

      return {
        story_id: storyId,
        communities,
        total_communities: communities.length,
      };

    } catch (error) {
      logger.error('Community detection failed:', error);
      throw new Error(`${PHASE2_ERROR_CODES.DATABASE_ERROR}: Community detection failed`);
    }
  }
}

// =============================================================================
// PHASE 2 SERVICE FACTORY
// =============================================================================

export class Phase2ServiceFactory {
  static createNarrativeConsistencyService(): SimpleNarrativeConsistencyService {
    return new SimpleNarrativeConsistencyService();
  }

  static createContentElementService(): SimpleContentElementService {
    return new SimpleContentElementService();
  }

  static createPerformanceOptimizationService(): SimplePerformanceOptimizationService {
    return new SimplePerformanceOptimizationService();
  }

  static createCommunityDetectionService(): SimpleCommunityDetectionService {
    return new SimpleCommunityDetectionService();
  }

  static createAllServices() {
    return {
      narrativeConsistency: this.createNarrativeConsistencyService(),
      contentElements: this.createContentElementService(),
      performanceOptimization: this.createPerformanceOptimizationService(),
      communityDetection: this.createCommunityDetectionService(),
    };
  }
}

// Export singleton instances
export const phase2Services = Phase2ServiceFactory.createAllServices();