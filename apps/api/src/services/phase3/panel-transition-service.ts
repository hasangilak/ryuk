import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  PanelTransitionNode,
  CreatePanelTransitionNode,
  UpdatePanelTransitionNode,
  PanelTransitionType,
} from '@ryuk/shared';

export class PanelTransitionService {
  constructor(private driver: Driver) {}

  // =============================================================================
  // PANEL TRANSITION NODE OPERATIONS
  // =============================================================================

  async createPanelTransition(data: CreatePanelTransitionNode): Promise<PanelTransitionNode> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        CREATE (pt:PanelTransition {
          id: $id,
          from_content_id: $from_content_id,
          to_content_id: $to_content_id,
          transition_type: $transition_type,
          transition_strength: $transition_strength,
          visual_continuity: $visual_continuity,
          temporal_relationship: $temporal_relationship,
          narrative_purpose: $narrative_purpose,
          aspect_exploration: $aspect_exploration,
          transition_metadata: $transition_metadata,
          validation_data: $validation_data,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN pt
        `,
        {
          id,
          from_content_id: data.from_content_id,
          to_content_id: data.to_content_id,
          transition_type: data.transition_type,
          transition_strength: data.transition_strength || 0.5,
          visual_continuity: data.visual_continuity || 0.5,
          temporal_relationship: data.temporal_relationship,
          narrative_purpose: data.narrative_purpose,
          aspect_exploration: JSON.stringify(data.aspect_exploration || null),
          transition_metadata: JSON.stringify(data.transition_metadata || {}),
          validation_data: JSON.stringify(data.validation_data || null),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      const node = result.records[0]?.get('pt').properties;
      return this.parsePanelTransitionNode(node);
    } finally {
      await session.close();
    }
  }

  async getPanelTransition(id: string): Promise<PanelTransitionNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (pt:PanelTransition {id: $id}) RETURN pt',
        { id }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('pt').properties;
      return this.parsePanelTransitionNode(node);
    } finally {
      await session.close();
    }
  }

  async getTransitionsFromContent(contentId: string): Promise<PanelTransitionNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (pt:PanelTransition {from_content_id: $contentId}) RETURN pt ORDER BY pt.created_at',
        { contentId }
      );

      return result.records.map(r => this.parsePanelTransitionNode(r.get('pt').properties));
    } finally {
      await session.close();
    }
  }

  async getTransitionsToContent(contentId: string): Promise<PanelTransitionNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (pt:PanelTransition {to_content_id: $contentId}) RETURN pt ORDER BY pt.created_at',
        { contentId }
      );

      return result.records.map(r => this.parsePanelTransitionNode(r.get('pt').properties));
    } finally {
      await session.close();
    }
  }

  async updatePanelTransition(id: string, updates: Partial<UpdatePanelTransitionNode>): Promise<PanelTransitionNode> {
    const session = this.driver.session();
    try {
      const setClauses: string[] = [];
      const params: Record<string, any> = { id, updated_at: new Date().toISOString() };

      const updateableFields = [
        'transition_type',
        'transition_strength',
        'visual_continuity',
        'temporal_relationship',
        'narrative_purpose',
      ];

      updateableFields.forEach(field => {
        if (updates[field as keyof UpdatePanelTransitionNode] !== undefined) {
          setClauses.push(`pt.${field} = $${field}`);
          params[field] = updates[field as keyof UpdatePanelTransitionNode];
        }
      });

      const jsonFields = ['aspect_exploration', 'transition_metadata', 'validation_data'];
      jsonFields.forEach(field => {
        if (updates[field as keyof UpdatePanelTransitionNode] !== undefined) {
          setClauses.push(`pt.${field} = $${field}`);
          params[field] = JSON.stringify(updates[field as keyof UpdatePanelTransitionNode]);
        }
      });

      setClauses.push('pt.updated_at = datetime($updated_at)');

      const query = `
        MATCH (pt:PanelTransition {id: $id})
        SET ${setClauses.join(', ')}
        RETURN pt
      `;

      const result = await session.run(query, params);
      const node = result.records[0]?.get('pt').properties;
      return this.parsePanelTransitionNode(node);
    } finally {
      await session.close();
    }
  }

  async deletePanelTransition(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('MATCH (pt:PanelTransition {id: $id}) DELETE pt', { id });
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // TRANSITION ANALYSIS OPERATIONS
  // =============================================================================

  async analyzeTransitionFlow(sceneId: string): Promise<{
    transition_types: Record<PanelTransitionType, number>;
    avg_transition_strength: number;
    avg_visual_continuity: number;
    temporal_distribution: Record<string, number>;
    aspect_to_aspect_usage: number;
    flow_quality: number;
    recommendations: string[];
  }> {
    const session = this.driver.session();
    try {
      // Get all content elements in the scene and their transitions
      const result = await session.run(
        `
        MATCH (ce:ContentElement)-[:BELONGS_TO]->(scene:Scene {id: $sceneId})
        OPTIONAL MATCH (pt:PanelTransition)
        WHERE pt.from_content_id = ce.id OR pt.to_content_id = ce.id
        RETURN ce, collect(DISTINCT pt) as transitions
        `,
        { sceneId }
      );

      const allTransitions: PanelTransitionNode[] = [];
      result.records.forEach(record => {
        const transitions = record.get('transitions');
        transitions.forEach((t: any) => {
          if (t) {
            allTransitions.push(this.parsePanelTransitionNode(t.properties));
          }
        });
      });

      if (allTransitions.length === 0) {
        return {
          transition_types: {} as Record<PanelTransitionType, number>,
          avg_transition_strength: 0,
          avg_visual_continuity: 0,
          temporal_distribution: {},
          aspect_to_aspect_usage: 0,
          flow_quality: 0,
          recommendations: ['Add panel transitions to improve scene flow'],
        };
      }

      // Analyze transition types
      const transition_types: Record<string, number> = {};
      let totalStrength = 0;
      let totalContinuity = 0;
      let aspectToAspectCount = 0;

      allTransitions.forEach(t => {
        transition_types[t.transition_type] = (transition_types[t.transition_type] || 0) + 1;
        totalStrength += t.transition_strength;
        totalContinuity += t.visual_continuity;
        if (t.transition_type === 'aspect_to_aspect') {
          aspectToAspectCount++;
        }
      });

      const avg_transition_strength = totalStrength / allTransitions.length;
      const avg_visual_continuity = totalContinuity / allTransitions.length;
      const aspect_to_aspect_usage = aspectToAspectCount / allTransitions.length;

      // Temporal distribution
      const temporal_distribution: Record<string, number> = {};
      allTransitions.forEach(t => {
        temporal_distribution[t.temporal_relationship] = (temporal_distribution[t.temporal_relationship] || 0) + 1;
      });

      // Calculate flow quality
      const flow_quality = this.calculateFlowQuality(allTransitions);

      // Generate recommendations
      const recommendations = this.generateTransitionRecommendations(
        transition_types,
        aspect_to_aspect_usage,
        avg_visual_continuity,
        flow_quality
      );

      return {
        transition_types: transition_types as Record<PanelTransitionType, number>,
        avg_transition_strength,
        avg_visual_continuity,
        temporal_distribution,
        aspect_to_aspect_usage,
        flow_quality,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  async validateTransition(transitionId: string): Promise<{
    valid: boolean;
    transition_appropriateness: number;
    narrative_flow_quality: number;
    reader_comprehension_prediction: number;
    issues: string[];
    suggestions: string[];
  }> {
    const transition = await this.getPanelTransition(transitionId);
    if (!transition) {
      return {
        valid: false,
        transition_appropriateness: 0,
        narrative_flow_quality: 0,
        reader_comprehension_prediction: 0,
        issues: ['Transition not found'],
        suggestions: [],
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check transition type appropriateness
    let transition_appropriateness = 0.7; // Base score
    if (transition.transition_type === 'aspect_to_aspect') {
      if (!transition.aspect_exploration) {
        issues.push('Aspect-to-aspect transition missing exploration data');
        transition_appropriateness -= 0.3;
      } else {
        transition_appropriateness += 0.2;
      }
    }

    // Check visual continuity
    let narrative_flow_quality = transition.visual_continuity;
    if (transition.visual_continuity < 0.3 && transition.transition_type !== 'non_sequitur') {
      issues.push('Low visual continuity may confuse readers');
      suggestions.push('Increase visual continuity or add transitional elements');
    }

    // Check reader comprehension
    let reader_comprehension_prediction = 0.8;
    if (transition.transition_type === 'non_sequitur') {
      reader_comprehension_prediction = 0.4;
      suggestions.push('Non-sequitur transitions require strong narrative justification');
    }

    const cognitiveLoad = transition.transition_metadata.cognitive_load || 0.5;
    if (cognitiveLoad > 0.7) {
      reader_comprehension_prediction -= 0.2;
      suggestions.push('High cognitive load; consider simplifying transition');
    }

    // Update validation data
    await this.updatePanelTransition(transitionId, {
      validation_data: {
        transition_appropriateness,
        narrative_flow_quality,
        reader_comprehension_prediction,
      },
    });

    return {
      valid: issues.length === 0,
      transition_appropriateness,
      narrative_flow_quality,
      reader_comprehension_prediction,
      issues,
      suggestions,
    };
  }

  // =============================================================================
  // ASPECT-TO-ASPECT SPECIFIC OPERATIONS
  // =============================================================================

  async createAspectToAspectTransition(
    fromContentId: string,
    toContentId: string,
    aspectType: 'mood' | 'atmosphere' | 'sensory' | 'emotional' | 'thematic',
    explorationDepth: number,
    atmosphericElements: string[]
  ): Promise<PanelTransitionNode> {
    return this.createPanelTransition({
      from_content_id: fromContentId,
      to_content_id: toContentId,
      transition_type: 'aspect_to_aspect',
      transition_strength: 0.6,
      visual_continuity: 0.8,
      temporal_relationship: 'simultaneous',
      narrative_purpose: 'atmosphere',
      aspect_exploration: {
        aspect_type: aspectType,
        exploration_depth: explorationDepth,
        mood_coherence: 0.8,
        atmospheric_elements: atmosphericElements,
        sensory_focus: [],
      },
      transition_metadata: {
        gutter_size: 'medium',
        reader_inference_required: explorationDepth,
        cognitive_load: 0.4,
        emotional_impact: explorationDepth * 0.9,
      },
    });
  }

  async analyzeAspectExploration(sceneId: string): Promise<{
    aspect_coverage: Record<string, number>;
    exploration_depth: number;
    mood_coherence: number;
    atmospheric_richness: number;
    recommendations: string[];
  }> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (ce:ContentElement)-[:BELONGS_TO]->(scene:Scene {id: $sceneId})
        OPTIONAL MATCH (pt:PanelTransition {transition_type: 'aspect_to_aspect'})
        WHERE pt.from_content_id = ce.id OR pt.to_content_id = ce.id
        RETURN collect(DISTINCT pt) as aspect_transitions
        `,
        { sceneId }
      );

      const aspectTransitions = result.records[0]?.get('aspect_transitions').map((t: any) =>
        t ? this.parsePanelTransitionNode(t.properties) : null
      ).filter((t: any) => t !== null) || [];

      if (aspectTransitions.length === 0) {
        return {
          aspect_coverage: {},
          exploration_depth: 0,
          mood_coherence: 0,
          atmospheric_richness: 0,
          recommendations: ['Add aspect-to-aspect transitions to explore mood and atmosphere'],
        };
      }

      const aspect_coverage: Record<string, number> = {};
      let totalDepth = 0;
      let totalCoherence = 0;
      let atmosphericElementsCount = 0;

      aspectTransitions.forEach((t: PanelTransitionNode) => {
        if (t.aspect_exploration) {
          const aspectType = t.aspect_exploration.aspect_type || 'unknown';
          aspect_coverage[aspectType] = (aspect_coverage[aspectType] || 0) + 1;
          totalDepth += t.aspect_exploration.exploration_depth || 0;
          totalCoherence += t.aspect_exploration.mood_coherence || 0;
          atmosphericElementsCount += t.aspect_exploration.atmospheric_elements?.length || 0;
        }
      });

      const exploration_depth = totalDepth / aspectTransitions.length;
      const mood_coherence = totalCoherence / aspectTransitions.length;
      const atmospheric_richness = atmosphericElementsCount / aspectTransitions.length;

      const recommendations: string[] = [];
      if (exploration_depth < 0.5) {
        recommendations.push('Increase exploration depth for more immersive atmosphere');
      }
      if (mood_coherence < 0.6) {
        recommendations.push('Improve mood coherence across aspect-to-aspect transitions');
      }
      if (Object.keys(aspect_coverage).length < 3) {
        recommendations.push('Explore more aspect types (mood, atmosphere, sensory, emotional, thematic)');
      }

      return {
        aspect_coverage,
        exploration_depth,
        mood_coherence,
        atmospheric_richness,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private calculateFlowQuality(transitions: PanelTransitionNode[]): number {
    if (transitions.length === 0) return 0;

    let qualityScore = 0;
    let count = 0;

    transitions.forEach(t => {
      // Reward appropriate transition types
      const typeScore = this.getTransitionTypeScore(t.transition_type);
      // Reward good visual continuity
      const continuityScore = t.visual_continuity;
      // Reward clear narrative purpose
      const purposeScore = t.narrative_purpose ? 0.8 : 0.5;

      qualityScore += (typeScore + continuityScore + purposeScore) / 3;
      count++;
    });

    return count > 0 ? qualityScore / count : 0;
  }

  private getTransitionTypeScore(type: PanelTransitionType): number {
    const scores: Record<PanelTransitionType, number> = {
      moment_to_moment: 0.7,
      action_to_action: 0.9,
      subject_to_subject: 0.8,
      scene_to_scene: 0.85,
      aspect_to_aspect: 0.95, // Manga-specific, highly valued
      non_sequitur: 0.5,
    };
    return scores[type] || 0.5;
  }

  private generateTransitionRecommendations(
    transitionTypes: Record<string, number>,
    aspectUsage: number,
    visualContinuity: number,
    flowQuality: number
  ): string[] {
    const recs: string[] = [];

    if (aspectUsage < 0.2) {
      recs.push('Increase use of aspect-to-aspect transitions for richer atmospheric storytelling');
    }

    if (visualContinuity < 0.5) {
      recs.push('Improve visual continuity between panels to enhance reader comprehension');
    }

    if (flowQuality < 0.6) {
      recs.push('Overall flow quality is low; review transition types and narrative purposes');
    }

    const actionToAction = transitionTypes['action_to_action'] || 0;
    const total = Object.values(transitionTypes).reduce((sum, count) => sum + count, 0);
    if (total > 0 && actionToAction / total > 0.7) {
      recs.push('High action-to-action usage; consider varying transition types for pacing');
    }

    return recs;
  }

  private parsePanelTransitionNode(props: any): PanelTransitionNode {
    return {
      id: props.id,
      from_content_id: props.from_content_id,
      to_content_id: props.to_content_id,
      transition_type: props.transition_type,
      transition_strength: props.transition_strength,
      visual_continuity: props.visual_continuity,
      temporal_relationship: props.temporal_relationship,
      narrative_purpose: props.narrative_purpose,
      aspect_exploration: JSON.parse(props.aspect_exploration || 'null'),
      transition_metadata: JSON.parse(props.transition_metadata || '{}'),
      validation_data: JSON.parse(props.validation_data || 'null'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }
}