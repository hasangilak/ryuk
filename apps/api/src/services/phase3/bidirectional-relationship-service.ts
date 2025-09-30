import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface BidirectionalRelationship {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relationship_type: string;
  semantic_impact: number; // 0.0-1.0
  retroactive_scope: string[]; // Node IDs affected
  meaning_transformation: {
    before_state: Record<string, any>;
    after_state: Record<string, any>;
  };
  revelation_trigger: string; // Ten node ID
  validation_requirements: string[];
  created_at: Date;
  updated_at: Date;
}

export interface RecontextualizationResult {
  affected_nodes: number;
  semantic_changes: Array<{
    node_id: string;
    node_type: string;
    original_meaning: string;
    new_meaning: string;
    impact_score: number;
  }>;
  propagation_depth: number;
  consistency_score: number; // 0.0-1.0
  warnings: string[];
}

export interface TimelineRecontextualization {
  timeline_id: string;
  revelation_node_id: string;
  affected_timeline_nodes: string[];
  temporal_consistency: number; // 0.0-1.0
  meaning_shifts: Array<{
    node_id: string;
    temporal_position: number;
    meaning_change: string;
  }>;
}

export interface RevelationPropagation {
  revelation_id: string;
  propagation_scope: 'local' | 'chapter' | 'arc' | 'global';
  affected_elements: string[];
  impact_intensity: number; // 0.0-1.0
  propagation_path: Array<{
    node_id: string;
    depth: number;
    impact: number;
  }>;
}

// =============================================================================
// BIDIRECTIONAL RELATIONSHIP SERVICE
// =============================================================================

export class BidirectionalRelationshipService {
  constructor(private driver: Driver) {}

  /**
   * Create a bidirectional relationship enabling retroactive semantic modification
   */
  async createBidirectionalRelationship(data: {
    from_node_id: string;
    to_node_id: string;
    relationship_type: string;
    semantic_impact: number;
    retroactive_scope: string[];
    meaning_transformation: {
      before_state: Record<string, any>;
      after_state: Record<string, any>;
    };
    revelation_trigger: string;
    validation_requirements?: string[];
  }): Promise<BidirectionalRelationship> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        MATCH (from), (to)
        WHERE from.id = $from_node_id AND to.id = $to_node_id
        CREATE (from)-[r:RECONTEXTUALIZES {
          id: $id,
          relationship_type: $relationship_type,
          semantic_impact: $semantic_impact,
          retroactive_scope: $retroactive_scope,
          meaning_transformation: $meaning_transformation,
          revelation_trigger: $revelation_trigger,
          validation_requirements: $validation_requirements,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        }]->(to)
        RETURN r, from.id as from_node_id, to.id as to_node_id
        `,
        {
          id,
          from_node_id: data.from_node_id,
          to_node_id: data.to_node_id,
          relationship_type: data.relationship_type,
          semantic_impact: data.semantic_impact,
          retroactive_scope: JSON.stringify(data.retroactive_scope),
          meaning_transformation: JSON.stringify(data.meaning_transformation),
          revelation_trigger: data.revelation_trigger,
          validation_requirements: JSON.stringify(data.validation_requirements || []),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      if (result.records.length === 0) {
        throw new Error('Failed to create bidirectional relationship');
      }

      const record = result.records[0];
      const rel = record.get('r').properties;

      return {
        id: rel.id,
        from_node_id: record.get('from_node_id'),
        to_node_id: record.get('to_node_id'),
        relationship_type: rel.relationship_type,
        semantic_impact: rel.semantic_impact,
        retroactive_scope: JSON.parse(rel.retroactive_scope),
        meaning_transformation: JSON.parse(rel.meaning_transformation),
        revelation_trigger: rel.revelation_trigger,
        validation_requirements: JSON.parse(rel.validation_requirements),
        created_at: new Date(rel.created_at),
        updated_at: new Date(rel.updated_at),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Apply retroactive semantic modification based on a revelation (Ten node)
   */
  async applyRetroactiveModification(
    tenNodeId: string
  ): Promise<RecontextualizationResult> {
    const session = this.driver.session();
    try {
      // Get the Ten node and its recontextualization targets
      const tenResult = await session.run(
        `
        MATCH (ten:Ten {id: $tenNodeId})
        RETURN ten.recontextualization_targets as targets,
               ten.revelation_scope as scope,
               ten.surprise_factor as impact
        `,
        { tenNodeId }
      );

      if (tenResult.records.length === 0) {
        throw new Error('Ten node not found');
      }

      const targets = JSON.parse(tenResult.records[0].get('targets') || '[]');
      const scope = tenResult.records[0].get('scope');
      const impact = tenResult.records[0].get('impact');

      const semanticChanges: RecontextualizationResult['semantic_changes'] = [];
      const warnings: string[] = [];

      // Apply semantic modification to each target
      for (const targetId of targets) {
        const targetResult = await session.run(
          `
          MATCH (n {id: $targetId})
          RETURN n, labels(n)[0] as nodeType
          `,
          { targetId }
        );

        if (targetResult.records.length > 0) {
          const node = targetResult.records[0].get('n').properties;
          const nodeType = targetResult.records[0].get('nodeType');

          semanticChanges.push({
            node_id: targetId,
            node_type: nodeType,
            original_meaning: node.description || '',
            new_meaning: `[Recontextualized by revelation ${tenNodeId}]`,
            impact_score: impact * 0.8, // Weighted by surprise factor
          });

          // Create bidirectional relationship
          await session.run(
            `
            MATCH (ten:Ten {id: $tenNodeId}), (target {id: $targetId})
            CREATE (ten)-[:RECONTEXTUALIZES {
              semantic_impact: $impact,
              applied_at: datetime($appliedAt)
            }]->(target)
            `,
            {
              tenNodeId,
              targetId,
              impact,
              appliedAt: new Date().toISOString(),
            }
          );
        } else {
          warnings.push(`Target node ${targetId} not found`);
        }
      }

      // Calculate propagation depth
      const depthResult = await session.run(
        `
        MATCH path = (ten:Ten {id: $tenNodeId})-[:RECONTEXTUALIZES*]->(n)
        RETURN max(length(path)) as maxDepth
        `,
        { tenNodeId }
      );

      const propagationDepth = depthResult.records[0]?.get('maxDepth') || 1;

      // Calculate consistency score
      const consistencyScore = this.calculateConsistencyScore(
        semanticChanges.length,
        warnings.length
      );

      return {
        affected_nodes: semanticChanges.length,
        semantic_changes: semanticChanges,
        propagation_depth: propagationDepth,
        consistency_score: consistencyScore,
        warnings,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Recontextualize timeline based on revelation
   */
  async recontextualizeTimeline(
    tenNodeId: string,
    storyId: string
  ): Promise<TimelineRecontextualization> {
    const session = this.driver.session();
    try {
      // Get all nodes in temporal order that are affected
      const result = await session.run(
        `
        MATCH (story:Story {id: $storyId})-[:CONTAINS*]->(n)
        WHERE n.id IN (
          SELECT target FROM (
            MATCH (ten:Ten {id: $tenNodeId})
            RETURN ten.recontextualization_targets as targets
          )
          UNWIND targets as target
        )
        WITH n, labels(n)[0] as nodeType
        ORDER BY CASE
          WHEN exists(n.sequence) THEN n.sequence
          WHEN exists(n.sequence_order) THEN n.sequence_order
          ELSE 999999
        END
        RETURN collect({
          id: n.id,
          type: nodeType,
          temporal_position: coalesce(n.sequence, n.sequence_order, 0)
        }) as affectedNodes
        `,
        { tenNodeId, storyId }
      );

      const affectedNodes = result.records[0]?.get('affectedNodes') || [];

      const meaningShifts = affectedNodes.map((node: any, index: number) => ({
        node_id: node.id,
        temporal_position: node.temporal_position,
        meaning_change: `Recontextualized by Ten revelation at position ${index + 1}`,
      }));

      // Calculate temporal consistency
      const temporalConsistency = this.calculateTemporalConsistency(affectedNodes);

      return {
        timeline_id: storyId,
        revelation_node_id: tenNodeId,
        affected_timeline_nodes: affectedNodes.map((n: any) => n.id),
        temporal_consistency: temporalConsistency,
        meaning_shifts: meaningShifts,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Propagate plot revelation throughout story graph
   */
  async propagateRevelation(
    tenNodeId: string,
    propagationScope: RevelationPropagation['propagation_scope'] = 'arc'
  ): Promise<RevelationPropagation> {
    const session = this.driver.session();
    try {
      // Determine search depth based on scope
      const depthMap = {
        local: 2,
        chapter: 5,
        arc: 10,
        global: 999,
      };
      const maxDepth = depthMap[propagationScope];

      // Propagate through graph
      const result = await session.run(
        `
        MATCH path = (ten:Ten {id: $tenNodeId})-[*1..${maxDepth}]-(n)
        WHERE NOT n:Ten
        WITH DISTINCT n, min(length(path)) as depth
        RETURN collect({
          node_id: n.id,
          depth: depth,
          impact: 1.0 / (1.0 + depth * 0.3)
        }) as propagationPath
        `,
        { tenNodeId }
      );

      const propagationPath = result.records[0]?.get('propagationPath') || [];

      // Calculate average impact intensity
      const avgImpact = propagationPath.length > 0
        ? propagationPath.reduce((sum: number, p: any) => sum + p.impact, 0) / propagationPath.length
        : 0;

      return {
        revelation_id: tenNodeId,
        propagation_scope: propagationScope,
        affected_elements: propagationPath.map((p: any) => p.node_id),
        impact_intensity: avgImpact,
        propagation_path: propagationPath,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate that adequate setup exists for a twist/revelation
   */
  async validateRevelationSetup(tenNodeId: string): Promise<{
    isValid: boolean;
    setupCompleteness: number; // 0.0-1.0
    missingElements: string[];
    warnings: string[];
  }> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (ten:Ten {id: $tenNodeId})
        OPTIONAL MATCH (ki:Ki)-[:ESTABLISHES_FOUNDATION_FOR]->(ten)
        OPTIONAL MATCH (sho:Sho)-[:PLANTS_SEED_FOR]->(ten)
        RETURN
          ten.setup_validation as requiredElements,
          collect(DISTINCT ki.id) as kiNodes,
          collect(DISTINCT sho.id) as shoNodes,
          count(DISTINCT ki) + count(DISTINCT sho) as setupCount
        `,
        { tenNodeId }
      );

      if (result.records.length === 0) {
        return {
          isValid: false,
          setupCompleteness: 0,
          missingElements: ['Ten node not found'],
          warnings: ['Unable to validate setup'],
        };
      }

      const record = result.records[0];
      const requiredElements = JSON.parse(record.get('requiredElements') || '[]');
      const setupCount = record.get('setupCount');

      const setupCompleteness = requiredElements.length > 0
        ? Math.min(setupCount / requiredElements.length, 1.0)
        : (setupCount > 0 ? 1.0 : 0.0);

      const isValid = setupCompleteness >= 0.6; // At least 60% setup required

      const missingElements: string[] = [];
      const warnings: string[] = [];

      if (setupCompleteness < 0.6) {
        missingElements.push('Insufficient setup for revelation');
        warnings.push('Consider adding more Ki or Shō nodes to establish foundation');
      }

      if (setupCompleteness < 0.3) {
        warnings.push('CRITICAL: Very weak setup may result in confusing twist');
      }

      return {
        isValid,
        setupCompleteness,
        missingElements,
        warnings,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get all bidirectional relationships for a node
   */
  async getBidirectionalRelationships(nodeId: string): Promise<BidirectionalRelationship[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (from)-[r:RECONTEXTUALIZES]->(to)
        WHERE from.id = $nodeId OR to.id = $nodeId
        RETURN r, from.id as from_node_id, to.id as to_node_id
        `,
        { nodeId }
      );

      return result.records.map(record => {
        const rel = record.get('r').properties;
        return {
          id: rel.id,
          from_node_id: record.get('from_node_id'),
          to_node_id: record.get('to_node_id'),
          relationship_type: rel.relationship_type,
          semantic_impact: rel.semantic_impact,
          retroactive_scope: JSON.parse(rel.retroactive_scope),
          meaning_transformation: JSON.parse(rel.meaning_transformation),
          revelation_trigger: rel.revelation_trigger,
          validation_requirements: JSON.parse(rel.validation_requirements),
          created_at: new Date(rel.created_at),
          updated_at: new Date(rel.updated_at),
        };
      });
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private calculateConsistencyScore(changesCount: number, warningsCount: number): number {
    if (changesCount === 0) return 1.0;

    const warningPenalty = warningsCount * 0.1;
    const baseScore = Math.max(0.5, 1.0 - warningPenalty);

    return Math.min(1.0, baseScore);
  }

  private calculateTemporalConsistency(affectedNodes: any[]): number {
    if (affectedNodes.length === 0) return 1.0;

    // Check if temporal positions are sequential
    const positions = affectedNodes.map((n: any) => n.temporal_position).sort((a, b) => a - b);
    let gaps = 0;

    for (let i = 1; i < positions.length; i++) {
      if (positions[i] - positions[i-1] > 3) {
        gaps++;
      }
    }

    // More gaps = lower consistency
    const gapPenalty = gaps * 0.15;
    return Math.max(0.4, 1.0 - gapPenalty);
  }
}