import { Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../database/connections';
import { logger } from '../utils/logger';
import { DatabaseError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { ChoiceNode, NodeType } from '@ryuk/shared';

export interface ConvergentPath {
  id: string;
  destination_scene_id: string;
  choice_paths: ChoicePath[];
  convergence_weight: number;
  state_merge_rules: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ChoicePath {
  choice_id: string;
  path_weight: number;
  path_conditions: string[];
  narrative_impact: number;
}

export interface ConvergentPathAnalytics {
  path_id: string;
  total_selections: number;
  path_distribution: Record<string, number>;
  avg_convergence_time: number;
  player_satisfaction_scores: number[];
}

export interface CreateConvergentPathRequest {
  destination_scene_id: string;
  choice_paths: ChoicePath[];
  convergence_weight?: number;
  state_merge_rules?: Record<string, any>;
}

export interface PathTraversalResult {
  success: boolean;
  final_state: Record<string, any>;
  path_taken: string;
  narrative_impact: number;
}

export class ConvergentPathService {
  private driver = getNeo4jDriver();

  /**
   * Creates a convergent path system where multiple choices lead to the same destination
   */
  async createConvergentPath(request: CreateConvergentPathRequest): Promise<ConvergentPath> {
    const session = this.driver.session();
    try {
      // Validate that destination scene exists
      const sceneExists = await this.validateSceneExists(request.destination_scene_id, session);
      if (!sceneExists) {
        throw new NotFoundError(`Destination scene ${request.destination_scene_id} not found`);
      }

      // Validate that all choice nodes exist
      for (const path of request.choice_paths) {
        const choiceExists = await this.validateChoiceExists(path.choice_id, session);
        if (!choiceExists) {
          throw new NotFoundError(`Choice ${path.choice_id} not found`);
        }
      }

      // Create convergent path in database
      const convergentPath: ConvergentPath = {
        id: crypto.randomUUID(),
        destination_scene_id: request.destination_scene_id,
        choice_paths: request.choice_paths,
        convergence_weight: request.convergence_weight || 1.0,
        state_merge_rules: request.state_merge_rules || {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store convergent path metadata
      await session.run(
        `
        CREATE (cp:ConvergentPath $properties)
        RETURN cp
        `,
        { properties: convergentPath }
      );

      // Create CONVERGES_TO relationships for each choice path
      for (const path of request.choice_paths) {
        await session.run(
          `
          MATCH (c:Choice {id: $choiceId}), (s:Scene {id: $sceneId})
          CREATE (c)-[:CONVERGES_TO {
            convergence_weight: $convergenceWeight,
            path_significance: $pathWeight,
            state_merge_rules: $stateMergeRules,
            path_conditions: $pathConditions,
            created_at: datetime(),
            updated_at: datetime()
          }]->(s)
          `,
          {
            choiceId: path.choice_id,
            sceneId: request.destination_scene_id,
            convergenceWeight: convergentPath.convergence_weight,
            pathWeight: path.path_weight,
            stateMergeRules: convergentPath.state_merge_rules,
            pathConditions: path.path_conditions,
          }
        );

        // Update choice node with convergent path data
        await session.run(
          `
          MATCH (c:Choice {id: $choiceId})
          SET c.convergent_weight = $convergentWeight,
              c.destination_scenes = CASE
                WHEN c.destination_scenes IS NULL THEN [$sceneId]
                ELSE c.destination_scenes + $sceneId
              END,
              c.updated_at = datetime()
          `,
          {
            choiceId: path.choice_id,
            convergentWeight: path.path_weight,
            sceneId: request.destination_scene_id,
          }
        );
      }

      logger.info('Created convergent path:', {
        pathId: convergentPath.id,
        destinationScene: request.destination_scene_id,
        choiceCount: request.choice_paths.length
      });

      return convergentPath;
    } catch (error) {
      logger.error('Error creating convergent path:', error);
      throw new DatabaseError('Failed to create convergent path', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Analyzes convergent path usage and player behavior
   */
  async getConvergentPathAnalytics(pathId: string): Promise<ConvergentPathAnalytics> {
    const session = this.driver.session();
    try {
      // Get convergent path details
      const pathResult = await session.run(
        'MATCH (cp:ConvergentPath {id: $pathId}) RETURN cp',
        { pathId }
      );

      if (pathResult.records.length === 0) {
        throw new NotFoundError(`Convergent path ${pathId} not found`);
      }

      const convergentPath = pathResult.records[0].get('cp').properties as ConvergentPath;

      // Analyze choice selection patterns
      const analyticsResult = await session.run(
        `
        MATCH (cp:ConvergentPath {id: $pathId})
        MATCH (c:Choice)-[:CONVERGES_TO]->(s:Scene {id: cp.destination_scene_id})
        OPTIONAL MATCH (c)-[sel:SELECTED_BY]->(:Reader)
        WITH c, count(sel) as selection_count
        RETURN
          collect({choice_id: c.id, selections: selection_count}) as path_distribution,
          sum(selection_count) as total_selections
        `,
        { pathId }
      );

      const analytics = analyticsResult.records[0];
      const pathDistribution = analytics.get('path_distribution').reduce((acc: Record<string, number>, item: any) => {
        acc[item.choice_id] = item.selections;
        return acc;
      }, {});

      return {
        path_id: pathId,
        total_selections: analytics.get('total_selections') || 0,
        path_distribution: pathDistribution,
        avg_convergence_time: 0, // TODO: Calculate from reader journey data
        player_satisfaction_scores: [], // TODO: Get from player feedback data
      };
    } catch (error) {
      logger.error('Error getting convergent path analytics:', error);
      throw new DatabaseError('Failed to get convergent path analytics', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Simulates path traversal and state merging for convergent paths
   */
  async simulatePathTraversal(
    choiceId: string,
    playerState: Record<string, any>
  ): Promise<PathTraversalResult> {
    const session = this.driver.session();
    try {
      // Get convergent path information for this choice
      const pathResult = await session.run(
        `
        MATCH (c:Choice {id: $choiceId})-[conv:CONVERGES_TO]->(s:Scene)
        RETURN c, conv, s
        `,
        { choiceId }
      );

      if (pathResult.records.length === 0) {
        throw new NotFoundError(`No convergent path found for choice ${choiceId}`);
      }

      const record = pathResult.records[0];
      const choice = record.get('c').properties;
      const convergence = record.get('conv').properties;
      const scene = record.get('s').properties;

      // Apply state merge rules
      const stateMergeRules = convergence.state_merge_rules || {};
      let finalState = { ...playerState };

      // Apply convergence-specific state changes
      for (const [key, rule] of Object.entries(stateMergeRules)) {
        if (typeof rule === 'object' && rule !== null && 'type' in rule) {
          const ruleObj = rule as { type: string; value?: any };
          if (ruleObj.type === 'merge') {
            finalState[key] = { ...finalState[key], ...ruleObj.value };
          } else if (ruleObj.type === 'set') {
            finalState[key] = ruleObj.value;
          }
        } else {
          finalState[key] = rule;
        }
      }

      // Calculate narrative impact based on path weight and choice effects
      const baseImpact = choice.weight || 0.5;
      const pathImpact = convergence.path_significance || 5;
      const narrativeImpact = (baseImpact + pathImpact / 10) / 2;

      return {
        success: true,
        final_state: finalState,
        path_taken: `${choiceId}->${scene.id}`,
        narrative_impact: narrativeImpact,
      };
    } catch (error) {
      logger.error('Error simulating path traversal:', error);
      return {
        success: false,
        final_state: playerState,
        path_taken: '',
        narrative_impact: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Gets all convergent paths that lead to a specific scene
   */
  async getConvergentPathsForScene(sceneId: string): Promise<ConvergentPath[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (cp:ConvergentPath {destination_scene_id: $sceneId})
        RETURN cp
        ORDER BY cp.created_at DESC
        `,
        { sceneId }
      );

      return result.records.map(record => record.get('cp').properties as ConvergentPath);
    } catch (error) {
      logger.error('Error getting convergent paths for scene:', error);
      throw new DatabaseError('Failed to get convergent paths for scene', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Validates that a scene exists
   */
  private async validateSceneExists(sceneId: string, session: Session): Promise<boolean> {
    const result = await session.run(
      'MATCH (s:Scene {id: $sceneId}) RETURN count(s) as count',
      { sceneId }
    );
    return result.records[0].get('count') > 0;
  }

  /**
   * Validates that a choice exists
   */
  private async validateChoiceExists(choiceId: string, session: Session): Promise<boolean> {
    const result = await session.run(
      'MATCH (c:Choice {id: $choiceId}) RETURN count(c) as count',
      { choiceId }
    );
    return result.records[0].get('count') > 0;
  }

  /**
   * Updates convergent path weights based on player analytics
   */
  async optimizeConvergentPaths(sceneId: string): Promise<void> {
    const session = this.driver.session();
    try {
      // Get analytics for all convergent paths to this scene
      const paths = await this.getConvergentPathsForScene(sceneId);

      for (const path of paths) {
        const analytics = await this.getConvergentPathAnalytics(path.id);

        // Optimize weights based on selection patterns
        if (analytics.total_selections > 10) {
          const totalSelections = analytics.total_selections;

          for (const choicePath of path.choice_paths) {
            const selectionCount = analytics.path_distribution[choicePath.choice_id] || 0;
            const selectionRatio = selectionCount / totalSelections;

            // Adjust weight based on popularity
            const optimizedWeight = Math.min(1.0, selectionRatio * 1.5);

            await session.run(
              `
              MATCH (c:Choice {id: $choiceId})-[conv:CONVERGES_TO]->(s:Scene {id: $sceneId})
              SET conv.path_significance = $optimizedWeight,
                  conv.updated_at = datetime()
              `,
              {
                choiceId: choicePath.choice_id,
                sceneId,
                optimizedWeight,
              }
            );
          }
        }
      }

      logger.info('Optimized convergent paths for scene:', { sceneId, pathCount: paths.length });
    } catch (error) {
      logger.error('Error optimizing convergent paths:', error);
      throw new DatabaseError('Failed to optimize convergent paths', error);
    } finally {
      await session.close();
    }
  }
}