import { getNeo4jDriver } from '../database/connections';
import { logger } from '../utils/logger';
import { CharacterNode, SceneNode, ChoiceNode } from '@ryuk/shared';

export interface ConsistencyViolation {
  id: string;
  type: 'character_behavior' | 'timeline_conflict' | 'state_contradiction' | 'trait_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_nodes: string[];
  suggested_fix: string;
  created_at: Date;
}

export interface ConsistencyRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'character_trait' | 'behavior_pattern' | 'timeline_rule' | 'state_rule';
  rule_logic: string; // JavaScript-like expression
  enabled: boolean;
  created_at: Date;
}

export interface CharacterConsistencyProfile {
  character_id: string;
  core_traits: string[];
  behavior_patterns: Record<string, any>;
  forbidden_actions: string[];
  required_relationships: string[];
  timeline_states: Record<string, any>;
}

export interface ValidationResult {
  is_consistent: boolean;
  violations: ConsistencyViolation[];
  warnings: ConsistencyViolation[];
  confidence_score: number; // 0-1
  validation_timestamp: Date;
}

export class NarrativeConsistencyService {
  private driver = getNeo4jDriver();

  async validateStoryConsistency(storyId: string): Promise<ValidationResult> {
    const session = this.driver.session();

    try {
      logger.info(`Starting consistency validation for story: ${storyId}`);

      const violations: ConsistencyViolation[] = [];
      const warnings: ConsistencyViolation[] = [];

      // Run all consistency checks
      const characterViolations = await this.validateCharacterConsistency(storyId);
      const timelineViolations = await this.validateTimelineConsistency(storyId);
      const stateViolations = await this.validateStateConsistency(storyId);
      const traitViolations = await this.validateTraitConsistency(storyId);

      // Categorize violations by severity
      const allViolations = [
        ...characterViolations,
        ...timelineViolations,
        ...stateViolations,
        ...traitViolations
      ];

      for (const violation of allViolations) {
        if (violation.severity === 'critical' || violation.severity === 'high') {
          violations.push(violation);
        } else {
          warnings.push(violation);
        }
      }

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(violations, warnings);

      return {
        is_consistent: violations.length === 0,
        violations,
        warnings,
        confidence_score: confidenceScore,
        validation_timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error validating story consistency:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async validateCharacterConsistency(storyId: string): Promise<ConsistencyViolation[]> {
    const session = this.driver.session();
    const violations: ConsistencyViolation[] = [];

    try {
      // Get all characters in the story
      const charactersResult = await session.run(`
        MATCH (s:Story {id: $storyId})-[:CONTAINS*]->(scene:Scene)
        MATCH (character:Character)-[:APPEARS_IN]->(scene)
        RETURN DISTINCT character
      `, { storyId });

      for (const record of charactersResult.records) {
        const character = record.get('character').properties as CharacterNode;

        // Check for contradictory behaviors
        const behaviorViolations = await this.checkCharacterBehaviorConsistency(character.id);
        violations.push(...behaviorViolations);

        // Check trait consistency
        const traitViolations = await this.checkCharacterTraitConsistency(character.id);
        violations.push(...traitViolations);

        // Check relationship consistency
        const relationshipViolations = await this.checkCharacterRelationshipConsistency(character.id);
        violations.push(...relationshipViolations);
      }

      return violations;

    } catch (error) {
      logger.error('Error validating character consistency:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async validateTimelineConsistency(storyId: string): Promise<ConsistencyViolation[]> {
    const session = this.driver.session();
    const violations: ConsistencyViolation[] = [];

    try {
      // Check for timeline conflicts
      const timelineResult = await session.run(`
        MATCH (s:Story {id: $storyId})-[:CONTAINS*]->(scene:Scene)
        WHERE exists(scene.narrative_time)
        WITH scene
        ORDER BY scene.narrative_time
        WITH collect(scene) as scenes
        UNWIND range(0, size(scenes)-2) as i
        WITH scenes[i] as current_scene, scenes[i+1] as next_scene
        WHERE current_scene.narrative_time >= next_scene.narrative_time
        RETURN current_scene, next_scene
      `, { storyId });

      for (const record of timelineResult.records) {
        const currentScene = record.get('current_scene').properties;
        const nextScene = record.get('next_scene').properties;

        violations.push({
          id: `timeline_${currentScene.id}_${nextScene.id}`,
          type: 'timeline_conflict',
          severity: 'high',
          description: `Timeline conflict: Scene "${currentScene.title}" (time: ${currentScene.narrative_time}) occurs after scene "${nextScene.title}" (time: ${nextScene.narrative_time})`,
          affected_nodes: [currentScene.id, nextScene.id],
          suggested_fix: 'Adjust narrative_time values to maintain chronological order',
          created_at: new Date()
        });
      }

      return violations;

    } catch (error) {
      logger.error('Error validating timeline consistency:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async validateStateConsistency(storyId: string): Promise<ConsistencyViolation[]> {
    const session = this.driver.session();
    const violations: ConsistencyViolation[] = [];

    try {
      // Check for state contradictions in character development
      const stateResult = await session.run(`
        MATCH (s:Story {id: $storyId})-[:CONTAINS*]->(scene:Scene)
        MATCH (character:Character)-[:APPEARS_IN]->(scene)
        WHERE exists(character.character_state_history)
        WITH character, scene
        ORDER BY scene.sequence
        WITH character, collect({scene: scene, state: character.character_state_history}) as states
        WHERE size(states) > 1
        RETURN character, states
      `, { storyId });

      for (const record of stateResult.records) {
        const character = record.get('character').properties;
        const states = record.get('states');

        // Analyze state progression for contradictions
        for (let i = 1; i < states.length; i++) {
          const previousState = states[i - 1].state;
          const currentState = states[i].state;

          // Check for impossible state transitions
          const contradiction = this.detectStateContradiction(previousState, currentState);
          if (contradiction) {
            violations.push({
              id: `state_${character.id}_${i}`,
              type: 'state_contradiction',
              severity: 'medium',
              description: `Character "${character.name}" has contradictory states: ${contradiction}`,
              affected_nodes: [character.id, states[i].scene.id],
              suggested_fix: 'Review character development and ensure logical state progression',
              created_at: new Date()
            });
          }
        }
      }

      return violations;

    } catch (error) {
      logger.error('Error validating state consistency:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async validateTraitConsistency(storyId: string): Promise<ConsistencyViolation[]> {
    const session = this.driver.session();
    const violations: ConsistencyViolation[] = [];

    try {
      // Check for actions that contradict character traits
      const traitResult = await session.run(`
        MATCH (s:Story {id: $storyId})-[:CONTAINS*]->(scene:Scene)
        MATCH (character:Character)-[:APPEARS_IN]->(scene)
        MATCH (scene)-[:CONTAINS]->(choice:Choice)
        WHERE character.personality_traits IS NOT NULL
        RETURN character, scene, choice
      `, { storyId });

      for (const record of traitResult.records) {
        const character = record.get('character').properties;
        const scene = record.get('scene').properties;
        const choice = record.get('choice').properties;

        // Check if choice contradicts character traits
        const contradiction = this.checkTraitChoiceContradiction(character, choice);
        if (contradiction) {
          violations.push({
            id: `trait_${character.id}_${choice.id}`,
            type: 'trait_violation',
            severity: 'medium',
            description: `Character "${character.name}" with traits [${character.personality_traits.join(', ')}] makes contradictory choice: "${choice.text}"`,
            affected_nodes: [character.id, choice.id, scene.id],
            suggested_fix: contradiction.suggestion,
            created_at: new Date()
          });
        }
      }

      return violations;

    } catch (error) {
      logger.error('Error validating trait consistency:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  private async checkCharacterBehaviorConsistency(characterId: string): Promise<ConsistencyViolation[]> {
    const session = this.driver.session();
    const violations: ConsistencyViolation[] = [];

    try {
      // Check for contradictory behaviors across scenes
      const behaviorResult = await session.run(`
        MATCH (character:Character {id: $characterId})-[appears:APPEARS_IN]->(scene:Scene)
        WHERE exists(appears.role_in_scene)
        WITH character, collect({scene: scene, role: appears.role_in_scene}) as behaviors
        RETURN character, behaviors
      `, { characterId });

      if (behaviorResult.records.length > 0) {
        const character = behaviorResult.records[0].get('character').properties;
        const behaviors = behaviorResult.records[0].get('behaviors');

        // Analyze behavior patterns for contradictions
        const contradictions = this.analyzeBehaviorPatterns(behaviors);
        for (const contradiction of contradictions) {
          violations.push({
            id: `behavior_${characterId}_${Date.now()}`,
            type: 'character_behavior',
            severity: 'medium',
            description: `Character "${character.name}" exhibits contradictory behavior: ${contradiction.description}`,
            affected_nodes: contradiction.affected_scenes,
            suggested_fix: contradiction.suggestion,
            created_at: new Date()
          });
        }
      }

      return violations;

    } catch (error) {
      logger.error('Error checking character behavior consistency:', error);
      return violations;
    } finally {
      await session.close();
    }
  }

  private async checkCharacterTraitConsistency(characterId: string): Promise<ConsistencyViolation[]> {
    // Implementation for trait consistency checking
    return []; // Placeholder
  }

  private async checkCharacterRelationshipConsistency(characterId: string): Promise<ConsistencyViolation[]> {
    // Implementation for relationship consistency checking
    return []; // Placeholder
  }

  private detectStateContradiction(previousState: any, currentState: any): string | null {
    // Simple state contradiction detection
    if (previousState && currentState) {
      for (const [key, prevValue] of Object.entries(previousState)) {
        const currValue = currentState[key];
        if (currValue !== undefined && this.isContradictoryStateChange(key, prevValue, currValue)) {
          return `${key} changed from ${prevValue} to ${currValue} impossibly`;
        }
      }
    }
    return null;
  }

  private isContradictoryStateChange(key: string, prevValue: any, currValue: any): boolean {
    // Define impossible state changes
    const impossibleChanges: Record<string, (prev: any, curr: any) => boolean> = {
      'age': (prev, curr) => curr < prev, // Age cannot decrease
      'alive': (prev, curr) => prev === false && curr === true, // Cannot resurrect
      'skill_level': (prev, curr) => curr < prev - 2, // Skills don't drop dramatically
    };

    const checker = impossibleChanges[key];
    return checker ? checker(prevValue, currValue) : false;
  }

  private checkTraitChoiceContradiction(character: any, choice: any): { suggestion: string } | null {
    const traits = character.personality_traits || [];
    const choiceText = choice.text?.toLowerCase() || '';

    // Define trait-choice contradictions
    const contradictions = [
      {
        trait: 'brave',
        conflicts: ['run away', 'hide', 'surrender'],
        suggestion: 'Consider a more courageous choice that aligns with brave personality'
      },
      {
        trait: 'honest',
        conflicts: ['lie', 'deceive', 'trick'],
        suggestion: 'This choice contradicts the honest nature - consider truthful alternatives'
      },
      {
        trait: 'loyal',
        conflicts: ['betray', 'abandon', 'desert'],
        suggestion: 'This choice conflicts with loyalty - consider options that show dedication'
      }
    ];

    for (const contradiction of contradictions) {
      if (traits.includes(contradiction.trait)) {
        for (const conflict of contradiction.conflicts) {
          if (choiceText.includes(conflict)) {
            return { suggestion: contradiction.suggestion };
          }
        }
      }
    }

    return null;
  }

  private analyzeBehaviorPatterns(behaviors: any[]): any[] {
    const contradictions = [];

    // Simple contradiction detection
    const roles = behaviors.map(b => b.role);
    if (roles.includes('hero') && roles.includes('villain')) {
      contradictions.push({
        description: 'Character plays both hero and villain roles',
        affected_scenes: behaviors.map(b => b.scene.id),
        suggestion: 'Clarify character motivation or create character development arc'
      });
    }

    return contradictions;
  }

  private calculateConfidenceScore(violations: ConsistencyViolation[], warnings: ConsistencyViolation[]): number {
    let score = 1.0;

    // Reduce score based on violations
    score -= violations.length * 0.1; // Each violation reduces by 10%
    score -= warnings.length * 0.05; // Each warning reduces by 5%

    // Apply severity multipliers
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score -= 0.2;
          break;
        case 'high':
          score -= 0.1;
          break;
        case 'medium':
          score -= 0.05;
          break;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  async createConsistencyRule(rule: Omit<ConsistencyRule, 'id' | 'created_at'>): Promise<ConsistencyRule> {
    const session = this.driver.session();

    try {
      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await session.run(`
        CREATE (rule:ConsistencyRule {
          id: $id,
          name: $name,
          description: $description,
          rule_type: $rule_type,
          rule_logic: $rule_logic,
          enabled: $enabled,
          created_at: datetime()
        })
        RETURN rule
      `, {
        id: ruleId,
        name: rule.name,
        description: rule.description,
        rule_type: rule.rule_type,
        rule_logic: rule.rule_logic,
        enabled: rule.enabled
      });

      const createdRule = result.records[0].get('rule').properties;
      return {
        ...createdRule,
        created_at: new Date(createdRule.created_at)
      };

    } catch (error) {
      logger.error('Error creating consistency rule:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getConsistencyRules(): Promise<ConsistencyRule[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(`
        MATCH (rule:ConsistencyRule)
        WHERE rule.enabled = true
        RETURN rule
        ORDER BY rule.created_at DESC
      `);

      return result.records.map(record => {
        const rule = record.get('rule').properties;
        return {
          ...rule,
          created_at: new Date(rule.created_at)
        };
      });

    } catch (error) {
      logger.error('Error fetching consistency rules:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async generateConsistencyReport(storyId: string): Promise<{
    summary: {
      total_violations: number;
      critical_violations: number;
      consistency_score: number;
      validation_date: Date;
    };
    violations_by_type: Record<string, number>;
    top_violations: ConsistencyViolation[];
    recommendations: string[];
  }> {
    const validationResult = await this.validateStoryConsistency(storyId);

    const violationsByType = validationResult.violations.reduce((acc, violation) => {
      acc[violation.type] = (acc[violation.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criticalViolations = validationResult.violations.filter(v => v.severity === 'critical').length;

    const topViolations = validationResult.violations
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10);

    const recommendations = this.generateRecommendations(validationResult.violations);

    return {
      summary: {
        total_violations: validationResult.violations.length,
        critical_violations: criticalViolations,
        consistency_score: validationResult.confidence_score,
        validation_date: validationResult.validation_timestamp
      },
      violations_by_type: violationsByType,
      top_violations: topViolations,
      recommendations
    };
  }

  private generateRecommendations(violations: ConsistencyViolation[]): string[] {
    const recommendations = new Set<string>();

    for (const violation of violations) {
      switch (violation.type) {
        case 'character_behavior':
          recommendations.add('Review character motivations and ensure consistent behavior patterns');
          break;
        case 'timeline_conflict':
          recommendations.add('Check narrative timeline order and adjust scene sequencing');
          break;
        case 'state_contradiction':
          recommendations.add('Validate character development arcs for logical progression');
          break;
        case 'trait_violation':
          recommendations.add('Ensure character choices align with established personality traits');
          break;
      }
    }

    return Array.from(recommendations);
  }
}