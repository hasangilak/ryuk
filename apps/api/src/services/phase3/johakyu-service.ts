import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  JoHaKyuNode,
  CreateJoHaKyuNode,
  UpdateJoHaKyuNode,
  JoHaKyuPhase,
  TemporalScale,
} from '@ryuk/shared';

export class JoHaKyuService {
  constructor(private driver: Driver) {}

  // =============================================================================
  // JOHAKYU NODE OPERATIONS
  // =============================================================================

  async createJoHaKyuNode(data: CreateJoHaKyuNode): Promise<JoHaKyuNode> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        CREATE (j:JoHaKyu {
          id: $id,
          story_id: $story_id,
          parent_node_id: $parent_node_id,
          temporal_scale: $temporal_scale,
          phase: $phase,
          title: $title,
          description: $description,
          pacing_intensity: $pacing_intensity,
          rhythm_pattern: $rhythm_pattern,
          parent_scale_reference: $parent_scale_reference,
          child_scales: $child_scales,
          fractal_coordination: $fractal_coordination,
          phase_characteristics: $phase_characteristics,
          transition_markers: $transition_markers,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN j
        `,
        {
          id,
          story_id: data.story_id,
          parent_node_id: data.parent_node_id || null,
          temporal_scale: data.temporal_scale,
          phase: data.phase,
          title: data.title,
          description: data.description,
          pacing_intensity: data.pacing_intensity || 0.5,
          rhythm_pattern: JSON.stringify(data.rhythm_pattern || []),
          parent_scale_reference: data.parent_scale_reference || null,
          child_scales: JSON.stringify(data.child_scales || []),
          fractal_coordination: JSON.stringify(data.fractal_coordination || null),
          phase_characteristics: JSON.stringify(data.phase_characteristics || {}),
          transition_markers: JSON.stringify(data.transition_markers || []),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      const node = result.records[0]?.get('j').properties;
      return this.parseJoHaKyuNode(node);
    } finally {
      await session.close();
    }
  }

  async getJoHaKyuNode(id: string): Promise<JoHaKyuNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (j:JoHaKyu {id: $id}) RETURN j',
        { id }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('j').properties;
      return this.parseJoHaKyuNode(node);
    } finally {
      await session.close();
    }
  }

  async updateJoHaKyuNode(id: string, updates: Partial<UpdateJoHaKyuNode>): Promise<JoHaKyuNode> {
    const session = this.driver.session();
    try {
      const setClauses: string[] = [];
      const params: Record<string, any> = { id, updated_at: new Date().toISOString() };

      const updateableFields = ['title', 'description', 'phase', 'pacing_intensity'];

      updateableFields.forEach(field => {
        if (updates[field as keyof UpdateJoHaKyuNode] !== undefined) {
          setClauses.push(`j.${field} = $${field}`);
          params[field] = updates[field as keyof UpdateJoHaKyuNode];
        }
      });

      if (updates.rhythm_pattern) {
        setClauses.push('j.rhythm_pattern = $rhythm_pattern');
        params.rhythm_pattern = JSON.stringify(updates.rhythm_pattern);
      }
      if (updates.child_scales) {
        setClauses.push('j.child_scales = $child_scales');
        params.child_scales = JSON.stringify(updates.child_scales);
      }
      if (updates.fractal_coordination) {
        setClauses.push('j.fractal_coordination = $fractal_coordination');
        params.fractal_coordination = JSON.stringify(updates.fractal_coordination);
      }
      if (updates.phase_characteristics) {
        setClauses.push('j.phase_characteristics = $phase_characteristics');
        params.phase_characteristics = JSON.stringify(updates.phase_characteristics);
      }
      if (updates.transition_markers) {
        setClauses.push('j.transition_markers = $transition_markers');
        params.transition_markers = JSON.stringify(updates.transition_markers);
      }

      setClauses.push('j.updated_at = datetime($updated_at)');

      const query = `
        MATCH (j:JoHaKyu {id: $id})
        SET ${setClauses.join(', ')}
        RETURN j
      `;

      const result = await session.run(query, params);
      const node = result.records[0]?.get('j').properties;
      return this.parseJoHaKyuNode(node);
    } finally {
      await session.close();
    }
  }

  async deleteJoHaKyuNode(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('MATCH (j:JoHaKyu {id: $id}) DETACH DELETE j', { id });
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // MULTI-RESOLUTION PACING OPERATIONS
  // =============================================================================

  async getJoHaKyuHierarchy(storyId: string): Promise<{
    byScale: Record<TemporalScale, JoHaKyuNode[]>;
    hierarchy: JoHaKyuNode[];
  }> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (j:JoHaKyu {story_id: $storyId})
        RETURN j
        ORDER BY
          CASE j.temporal_scale
            WHEN 'story' THEN 1
            WHEN 'arc' THEN 2
            WHEN 'chapter' THEN 3
            WHEN 'stitch' THEN 4
            WHEN 'scene' THEN 5
            WHEN 'panel' THEN 6
          END,
          CASE j.phase
            WHEN 'jo' THEN 1
            WHEN 'ha' THEN 2
            WHEN 'kyu' THEN 3
          END
        `,
        { storyId }
      );

      const nodes = result.records.map(r => this.parseJoHaKyuNode(r.get('j').properties));

      const byScale: Record<string, JoHaKyuNode[]> = {};
      nodes.forEach(node => {
        if (!byScale[node.temporal_scale]) {
          byScale[node.temporal_scale] = [];
        }
        byScale[node.temporal_scale].push(node);
      });

      return {
        byScale: byScale as Record<TemporalScale, JoHaKyuNode[]>,
        hierarchy: nodes,
      };
    } finally {
      await session.close();
    }
  }

  async analyzeJoHaKyuPacing(storyId: string): Promise<{
    overall_pacing: {
      story_intensity: number;
      phase_distribution: Record<JoHaKyuPhase, number>;
      fractal_coherence: number;
    };
    scale_analysis: Array<{
      scale: TemporalScale;
      node_count: number;
      avg_intensity: number;
      phase_balance: Record<JoHaKyuPhase, number>;
    }>;
    recommendations: string[];
  }> {
    const hierarchy = await this.getJoHaKyuHierarchy(storyId);
    const recommendations: string[] = [];

    // Calculate overall story intensity
    const storyNodes = hierarchy.byScale['story'] || [];
    const story_intensity = storyNodes.length > 0
      ? storyNodes.reduce((sum, n) => sum + n.pacing_intensity, 0) / storyNodes.length
      : 0.5;

    // Calculate phase distribution across all scales
    const allNodes = hierarchy.hierarchy;
    const phaseCount: Record<string, number> = { jo: 0, ha: 0, kyu: 0 };
    allNodes.forEach(node => phaseCount[node.phase]++);

    const total = allNodes.length || 1;
    const phase_distribution: Record<JoHaKyuPhase, number> = {
      jo: phaseCount.jo / total,
      ha: phaseCount.ha / total,
      kyu: phaseCount.kyu / total,
    };

    // Calculate fractal coherence
    let totalCoherence = 0;
    let coherenceCount = 0;
    allNodes.forEach(node => {
      if (node.fractal_coordination) {
        totalCoherence += node.fractal_coordination.cross_scale_harmony;
        coherenceCount++;
      }
    });
    const fractal_coherence = coherenceCount > 0 ? totalCoherence / coherenceCount : 0;

    // Analyze each scale
    const scale_analysis = Object.entries(hierarchy.byScale).map(([scale, nodes]) => {
      const scalePhaseCount: Record<string, number> = { jo: 0, ha: 0, kyu: 0 };
      nodes.forEach(node => scalePhaseCount[node.phase]++);

      const avg_intensity = nodes.reduce((sum, n) => sum + n.pacing_intensity, 0) / nodes.length;

      return {
        scale: scale as TemporalScale,
        node_count: nodes.length,
        avg_intensity,
        phase_balance: {
          jo: scalePhaseCount.jo / nodes.length,
          ha: scalePhaseCount.ha / nodes.length,
          kyu: scalePhaseCount.kyu / nodes.length,
        } as Record<JoHaKyuPhase, number>,
      };
    });

    // Generate recommendations
    if (phase_distribution.jo < 0.15) {
      recommendations.push('Consider adding more Jo (slow introduction) phases for better pacing foundation');
    }
    if (phase_distribution.kyu < 0.15) {
      recommendations.push('Add more Kyū (swift climax) phases to provide satisfying resolutions');
    }
    if (fractal_coherence < 0.6) {
      recommendations.push('Improve fractal coordination between different temporal scales');
    }

    // Check for missing scales
    const expectedScales: TemporalScale[] = ['story', 'chapter', 'scene'];
    expectedScales.forEach(scale => {
      if (!hierarchy.byScale[scale] || hierarchy.byScale[scale].length === 0) {
        recommendations.push(`Add Jo-Ha-Kyū pacing structure at ${scale} level`);
      }
    });

    return {
      overall_pacing: {
        story_intensity,
        phase_distribution,
        fractal_coherence,
      },
      scale_analysis,
      recommendations,
    };
  }

  async createJoHaKyuCycle(
    storyId: string,
    parentNodeId: string | undefined,
    scale: TemporalScale,
    title: string
  ): Promise<{
    jo: JoHaKyuNode;
    ha: JoHaKyuNode;
    kyu: JoHaKyuNode;
  }> {
    // Create a complete Jo-Ha-Kyū cycle
    const jo = await this.createJoHaKyuNode({
      story_id: storyId,
      parent_node_id: parentNodeId,
      temporal_scale: scale,
      phase: 'jo',
      title: `${title} - Jo (Introduction)`,
      description: 'Slow introduction and gradual buildup',
      pacing_intensity: 0.3,
      rhythm_pattern: [],
      parent_scale_reference: parentNodeId,
      child_scales: [],
      phase_characteristics: {
        jo_properties: {
          buildup_rate: 0.3,
          establishment_depth: 0.8,
          preparation_quality: 0.7,
        },
      },
      transition_markers: [],
    });

    const ha = await this.createJoHaKyuNode({
      story_id: storyId,
      parent_node_id: parentNodeId,
      temporal_scale: scale,
      phase: 'ha',
      title: `${title} - Ha (Development)`,
      description: 'Rapid development and acceleration',
      pacing_intensity: 0.7,
      rhythm_pattern: [],
      parent_scale_reference: parentNodeId,
      child_scales: [],
      phase_characteristics: {
        ha_properties: {
          acceleration_rate: 0.8,
          complication_density: 0.7,
          momentum_score: 0.75,
        },
      },
      transition_markers: [],
    });

    const kyu = await this.createJoHaKyuNode({
      story_id: storyId,
      parent_node_id: parentNodeId,
      temporal_scale: scale,
      phase: 'kyu',
      title: `${title} - Kyū (Climax)`,
      description: 'Swift climax and resolution',
      pacing_intensity: 0.95,
      rhythm_pattern: [],
      parent_scale_reference: parentNodeId,
      child_scales: [],
      phase_characteristics: {
        kyu_properties: {
          resolution_speed: 0.9,
          climax_impact: 0.85,
          conclusion_satisfaction: 0.8,
        },
      },
      transition_markers: [],
    });

    return { jo, ha, kyu };
  }

  async calculateFractalCoordination(nodeId: string): Promise<{
    parent_phase_alignment: number;
    child_phases_coherence: number;
    cross_scale_harmony: number;
  }> {
    const session = this.driver.session();
    try {
      const node = await this.getJoHaKyuNode(nodeId);
      if (!node) {
        throw new Error(`JoHaKyu node ${nodeId} not found`);
      }

      let parent_phase_alignment = 1.0;
      let child_phases_coherence = 1.0;

      // Check parent alignment
      if (node.parent_scale_reference) {
        const parent = await this.getJoHaKyuNode(node.parent_scale_reference);
        if (parent) {
          // Calculate alignment based on phase matching and intensity
          const phaseAlignment = parent.phase === node.phase ? 1.0 : 0.5;
          const intensityAlignment = 1 - Math.abs(parent.pacing_intensity - node.pacing_intensity);
          parent_phase_alignment = (phaseAlignment + intensityAlignment) / 2;
        }
      }

      // Check child coherence
      if (node.child_scales.length > 0) {
        let totalCoherence = 0;
        for (const childId of node.child_scales) {
          const child = await this.getJoHaKyuNode(childId);
          if (child) {
            const phaseCoherence = child.phase === node.phase ? 1.0 : 0.5;
            totalCoherence += phaseCoherence;
          }
        }
        child_phases_coherence = totalCoherence / node.child_scales.length;
      }

      const cross_scale_harmony = (parent_phase_alignment + child_phases_coherence) / 2;

      // Update the node with new coordination data
      await this.updateJoHaKyuNode(nodeId, {
        fractal_coordination: {
          parent_phase_alignment,
          child_phases_coherence,
          cross_scale_harmony,
        },
      });

      return {
        parent_phase_alignment,
        child_phases_coherence,
        cross_scale_harmony,
      };
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private parseJoHaKyuNode(props: any): JoHaKyuNode {
    return {
      id: props.id,
      story_id: props.story_id,
      parent_node_id: props.parent_node_id,
      temporal_scale: props.temporal_scale,
      phase: props.phase,
      title: props.title,
      description: props.description,
      pacing_intensity: props.pacing_intensity,
      rhythm_pattern: JSON.parse(props.rhythm_pattern || '[]'),
      parent_scale_reference: props.parent_scale_reference,
      child_scales: JSON.parse(props.child_scales || '[]'),
      fractal_coordination: JSON.parse(props.fractal_coordination || 'null'),
      phase_characteristics: JSON.parse(props.phase_characteristics || '{}'),
      transition_markers: JSON.parse(props.transition_markers || '[]'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }
}