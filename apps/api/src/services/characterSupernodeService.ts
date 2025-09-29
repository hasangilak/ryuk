import { Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../database/connections';
import { logger } from '../utils/logger';
import { DatabaseError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { CharacterNode, NodeType } from '@ryuk/shared';

export interface CharacterCentralityMetrics {
  character_id: string;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  eigenvector_centrality: number;
  pagerank_score: number;
  influence_radius: number;
  connectivity_index: number;
}

export interface CharacterInfluenceMap {
  character_id: string;
  direct_influences: InfluenceConnection[];
  indirect_influences: InfluenceConnection[];
  influence_strength: number;
  narrative_impact: number;
}

export interface InfluenceConnection {
  target_node_id: string;
  target_type: NodeType;
  influence_type: 'direct' | 'indirect' | 'causal' | 'thematic';
  strength: number;
  relationship_path: string[];
}

export interface CharacterNetworkAnalysis {
  character_id: string;
  network_position: 'central' | 'bridge' | 'peripheral' | 'isolated';
  community_membership: string[];
  narrative_threads: string[];
  viewpoint_access: boolean;
  story_importance: number;
}

export interface SupernodeMetadata {
  is_supernode: boolean;
  centrality_threshold: number;
  influence_threshold: number;
  network_analysis: CharacterNetworkAnalysis;
  last_analysis_update: Date;
}

export class CharacterSupernodeService {
  private driver = getNeo4jDriver();

  /**
   * Analyzes character centrality and marks supernodes
   */
  async analyzeCharacterCentrality(storyId?: string): Promise<CharacterCentralityMetrics[]> {
    const session = this.driver.session();
    try {
      // Build character relationship graph
      let whereClause = '';
      let parameters: Record<string, any> = {};

      if (storyId) {
        whereClause = 'WHERE s.story_id = $storyId OR s.id IN [(st:Story {id: $storyId})-[:CONTAINS*]->(n) | n.id]';
        parameters.storyId = storyId;
      }

      // Calculate degree centrality (number of direct connections)
      const degreeCentralityResult = await session.run(
        `
        MATCH (c:Character)
        ${whereClause}
        OPTIONAL MATCH (c)-[r]-(connected)
        WITH c, count(DISTINCT connected) as degree_count
        WITH c, degree_count, max(degree_count) as max_degree
        RETURN c.id as character_id,
               CASE WHEN max_degree = 0 THEN 0.0
                    ELSE toFloat(degree_count) / max_degree
               END as degree_centrality
        `,
        parameters
      );

      const degreeMetrics = new Map<string, number>();
      degreeCentralityResult.records.forEach(record => {
        degreeMetrics.set(record.get('character_id'), record.get('degree_centrality'));
      });

      // Calculate betweenness centrality (how often character appears on shortest paths)
      const betweennessResult = await session.run(
        `
        CALL gds.graph.project(
          'character-network',
          ['Character', 'Scene', 'Choice', 'Event'],
          ['APPEARS_IN', 'INFLUENCES', 'TRIGGERS', 'LEADS_TO']
        ) YIELD graphName
        CALL gds.betweenness.stream('character-network')
        YIELD nodeId, score
        WITH gds.util.asNode(nodeId) as node, score
        WHERE node:Character
        RETURN node.id as character_id, score as betweenness_centrality
        `,
        {}
      );

      const betweennessMetrics = new Map<string, number>();
      betweennessResult.records.forEach(record => {
        betweennessMetrics.set(record.get('character_id'), record.get('betweenness_centrality'));
      });

      // Calculate PageRank for character influence
      const pagerankResult = await session.run(
        `
        CALL gds.pageRank.stream('character-network')
        YIELD nodeId, score
        WITH gds.util.asNode(nodeId) as node, score
        WHERE node:Character
        RETURN node.id as character_id, score as pagerank_score
        `,
        {}
      );

      const pagerankMetrics = new Map<string, number>();
      pagerankResult.records.forEach(record => {
        pagerankMetrics.set(record.get('character_id'), record.get('pagerank_score'));
      });

      // Calculate influence radius (how far character's influence extends)
      const influenceRadiusResult = await session.run(
        `
        MATCH (c:Character)
        ${whereClause}
        OPTIONAL MATCH path = (c)-[*1..4]-(influenced)
        WITH c, max(length(path)) as max_path_length
        RETURN c.id as character_id,
               CASE WHEN max_path_length IS NULL THEN 0
                    ELSE max_path_length
               END as influence_radius
        `,
        parameters
      );

      const influenceRadiusMetrics = new Map<string, number>();
      influenceRadiusResult.records.forEach(record => {
        influenceRadiusMetrics.set(record.get('character_id'), record.get('influence_radius'));
      });

      // Cleanup graph projection
      await session.run('CALL gds.graph.drop("character-network") YIELD graphName', {});

      // Combine all metrics
      const allCharacters = new Set([
        ...degreeMetrics.keys(),
        ...betweennessMetrics.keys(),
        ...pagerankMetrics.keys(),
        ...influenceRadiusMetrics.keys()
      ]);

      const centralityMetrics: CharacterCentralityMetrics[] = Array.from(allCharacters).map(characterId => {
        const degree = degreeMetrics.get(characterId) || 0;
        const betweenness = betweennessMetrics.get(characterId) || 0;
        const pagerank = pagerankMetrics.get(characterId) || 0;
        const influenceRadius = influenceRadiusMetrics.get(characterId) || 0;

        // Calculate composite connectivity index
        const connectivityIndex = (degree + betweenness + pagerank) / 3;

        return {
          character_id: characterId,
          degree_centrality: degree,
          betweenness_centrality: betweenness,
          closeness_centrality: 0, // TODO: Implement if needed
          eigenvector_centrality: 0, // TODO: Implement if needed
          pagerank_score: pagerank,
          influence_radius: influenceRadius,
          connectivity_index: connectivityIndex,
        };
      });

      // Update character nodes with centrality data
      for (const metrics of centralityMetrics) {
        await session.run(
          `
          MATCH (c:Character {id: $characterId})
          SET c.connectivity_index = $connectivityIndex,
              c.supernode_metadata = {
                centrality_scores: $centralityScores,
                influence_radius: $influenceRadius,
                last_analysis_update: datetime()
              }
          `,
          {
            characterId: metrics.character_id,
            connectivityIndex: metrics.connectivity_index,
            centralityScores: {
              degree_centrality: metrics.degree_centrality,
              betweenness_centrality: metrics.betweenness_centrality,
              pagerank_score: metrics.pagerank_score,
            },
            influenceRadius: metrics.influence_radius,
          }
        );
      }

      logger.info('Analyzed character centrality:', {
        characterCount: centralityMetrics.length,
        storyId,
      });

      return centralityMetrics;
    } catch (error) {
      logger.error('Error analyzing character centrality:', error);
      throw new DatabaseError('Failed to analyze character centrality', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Identifies and marks character supernodes based on centrality thresholds
   */
  async identifySupernodes(
    centralityThreshold: number = 0.7,
    influenceThreshold: number = 0.6
  ): Promise<string[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (c:Character)
        WHERE c.connectivity_index >= $centralityThreshold
           OR c.supernode_metadata.influence_radius >= $influenceThreshold
        SET c.supernode_metadata = apoc.map.setKey(
          coalesce(c.supernode_metadata, {}),
          'is_supernode',
          true
        )
        RETURN c.id as character_id
        `,
        { centralityThreshold, influenceThreshold }
      );

      const supernodeIds = result.records.map(record => record.get('character_id'));

      logger.info('Identified character supernodes:', {
        count: supernodeIds.length,
        centralityThreshold,
        influenceThreshold,
      });

      return supernodeIds;
    } catch (error) {
      logger.error('Error identifying supernodes:', error);
      throw new DatabaseError('Failed to identify supernodes', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Maps character influence relationships across the story graph
   */
  async mapCharacterInfluence(characterId: string): Promise<CharacterInfluenceMap> {
    const session = this.driver.session();
    try {
      // Get direct influences
      const directInfluencesResult = await session.run(
        `
        MATCH (c:Character {id: $characterId})-[inf:INFLUENCES]->(target)
        RETURN target.id as target_id,
               labels(target)[0] as target_type,
               inf.influence_type as influence_type,
               inf.influence_strength as strength
        `,
        { characterId }
      );

      const directInfluences: InfluenceConnection[] = directInfluencesResult.records.map(record => ({
        target_node_id: record.get('target_id'),
        target_type: record.get('target_type') as NodeType,
        influence_type: record.get('influence_type'),
        strength: record.get('strength'),
        relationship_path: [characterId, record.get('target_id')],
      }));

      // Get indirect influences (through paths of length 2-3)
      const indirectInfluencesResult = await session.run(
        `
        MATCH path = (c:Character {id: $characterId})-[*2..3]-(target)
        WHERE NOT target:Character
        WITH target, path, length(path) as path_length
        RETURN DISTINCT target.id as target_id,
               labels(target)[0] as target_type,
               'indirect' as influence_type,
               1.0 / path_length as strength,
               [node in nodes(path) | node.id] as relationship_path
        LIMIT 20
        `,
        { characterId }
      );

      const indirectInfluences: InfluenceConnection[] = indirectInfluencesResult.records.map(record => ({
        target_node_id: record.get('target_id'),
        target_type: record.get('target_type') as NodeType,
        influence_type: 'indirect',
        strength: record.get('strength'),
        relationship_path: record.get('relationship_path'),
      }));

      // Calculate overall influence strength
      const totalDirectStrength = directInfluences.reduce((sum, inf) => sum + inf.strength, 0);
      const totalIndirectStrength = indirectInfluences.reduce((sum, inf) => sum + inf.strength, 0);
      const influenceStrength = totalDirectStrength + (totalIndirectStrength * 0.5);

      // Calculate narrative impact
      const narrativeImpact = Math.min(1.0, influenceStrength / 10);

      const influenceMap: CharacterInfluenceMap = {
        character_id: characterId,
        direct_influences: directInfluences,
        indirect_influences: indirectInfluences,
        influence_strength: influenceStrength,
        narrative_impact: narrativeImpact,
      };

      // Update character with influence data
      await session.run(
        `
        MATCH (c:Character {id: $characterId})
        SET c.narrative_impact = $narrativeImpact,
            c.supernode_metadata = apoc.map.mergeList([
              coalesce(c.supernode_metadata, {}),
              {
                influence_strength: $influenceStrength,
                direct_influence_count: $directCount,
                indirect_influence_count: $indirectCount
              }
            ])
        `,
        {
          characterId,
          narrativeImpact,
          influenceStrength,
          directCount: directInfluences.length,
          indirectCount: indirectInfluences.length,
        }
      );

      return influenceMap;
    } catch (error) {
      logger.error('Error mapping character influence:', error);
      throw new DatabaseError('Failed to map character influence', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Analyzes character network position and community membership
   */
  async analyzeCharacterNetwork(characterId: string): Promise<CharacterNetworkAnalysis> {
    const session = this.driver.session();
    try {
      // Get character's connections and network position
      const networkResult = await session.run(
        `
        MATCH (c:Character {id: $characterId})
        OPTIONAL MATCH (c)-[r]-(connected)
        WITH c, count(DISTINCT connected) as connection_count,
             collect(DISTINCT type(r)) as relationship_types

        // Determine network position based on connections
        WITH c, connection_count, relationship_types,
             CASE
               WHEN connection_count >= 10 THEN 'central'
               WHEN connection_count >= 5 THEN 'bridge'
               WHEN connection_count >= 1 THEN 'peripheral'
               ELSE 'isolated'
             END as network_position

        // Get narrative threads (scenes where character appears)
        OPTIONAL MATCH (c)-[:APPEARS_IN]->(s:Scene)
        WITH c, network_position, collect(DISTINCT s.id) as scene_appearances

        // Check viewpoint access (scenes where character is primary)
        OPTIONAL MATCH (c)-[:APPEARS_IN {role_in_scene: 'primary'}]->(viewpoint_scene:Scene)
        WITH c, network_position, scene_appearances,
             count(viewpoint_scene) > 0 as viewpoint_access

        RETURN c.id as character_id,
               network_position,
               scene_appearances,
               viewpoint_access
        `,
        { characterId }
      );

      if (networkResult.records.length === 0) {
        throw new NotFoundError(`Character ${characterId} not found`);
      }

      const record = networkResult.records[0];
      const networkPosition = record.get('network_position');
      const sceneAppearances = record.get('scene_appearances') || [];
      const viewpointAccess = record.get('viewpoint_access');

      // Calculate story importance based on network metrics
      const storyImportance = this.calculateStoryImportance(
        networkPosition,
        sceneAppearances.length,
        viewpointAccess
      );

      const networkAnalysis: CharacterNetworkAnalysis = {
        character_id: characterId,
        network_position: networkPosition,
        community_membership: [], // TODO: Implement community detection
        narrative_threads: sceneAppearances,
        viewpoint_access: viewpointAccess,
        story_importance: storyImportance,
      };

      // Update character with network analysis
      await session.run(
        `
        MATCH (c:Character {id: $characterId})
        SET c.scene_appearances = $sceneAppearances,
            c.supernode_metadata = apoc.map.mergeList([
              coalesce(c.supernode_metadata, {}),
              {
                network_position: $networkPosition,
                narrative_threads: $narrativeThreads,
                viewpoint_access: $viewpointAccess,
                story_importance: $storyImportance
              }
            ])
        `,
        {
          characterId,
          sceneAppearances,
          networkPosition,
          narrativeThreads: sceneAppearances,
          viewpointAccess,
          storyImportance,
        }
      );

      return networkAnalysis;
    } catch (error) {
      logger.error('Error analyzing character network:', error);
      throw new DatabaseError('Failed to analyze character network', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Gets all supernodes for a story with their metrics
   */
  async getStorySupernodes(storyId: string): Promise<CharacterNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (c:Character)
        WHERE c.supernode_metadata.is_supernode = true
          AND (c.story_id = $storyId
               OR c.id IN [(s:Story {id: $storyId})-[:CONTAINS*]->(node)-[:APPEARS_IN]-(c) | c.id])
        RETURN c
        ORDER BY c.connectivity_index DESC
        `,
        { storyId }
      );

      return result.records.map(record => record.get('c').properties as CharacterNode);
    } catch (error) {
      logger.error('Error getting story supernodes:', error);
      throw new DatabaseError('Failed to get story supernodes', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Tracks character arc progression across the story
   */
  async trackCharacterArc(characterId: string): Promise<void> {
    const session = this.driver.session();
    try {
      // Get character's appearances in chronological order
      const arcResult = await session.run(
        `
        MATCH (c:Character {id: $characterId})-[app:APPEARS_IN]->(s:Scene)
        RETURN s.id as scene_id,
               s.chapter as chapter,
               s.sequence as sequence,
               app.importance as scene_importance,
               app.role_in_scene as role
        ORDER BY s.chapter, s.sequence
        `,
        { characterId }
      );

      const arcStages = arcResult.records.map((record, index) => ({
        stage_name: `Stage ${index + 1}`,
        scene_id: record.get('scene_id'),
        character_state: {
          importance: record.get('scene_importance'),
          role: record.get('role'),
          chapter: record.get('chapter'),
          sequence: record.get('sequence'),
        },
      }));

      // Calculate arc completion (how much of the story the character appears in)
      const totalScenes = await session.run(
        'MATCH (s:Scene) RETURN count(s) as total_scenes',
        {}
      );
      const totalSceneCount = totalScenes.records[0].get('total_scenes');
      const arcCompletion = Math.min(1.0, arcStages.length / totalSceneCount);

      // Determine growth trajectory based on importance progression
      const importanceProgression = arcStages.map(stage => stage.character_state.importance || 0.5);
      const growthTrajectory = this.determineGrowthTrajectory(importanceProgression);

      // Update character with arc data
      await session.run(
        `
        MATCH (c:Character {id: $characterId})
        SET c.character_arc = {
          development_stages: $arcStages,
          arc_completion: $arcCompletion,
          growth_trajectory: $growthTrajectory
        }
        `,
        {
          characterId,
          arcStages,
          arcCompletion,
          growthTrajectory,
        }
      );

      logger.info('Tracked character arc:', {
        characterId,
        stageCount: arcStages.length,
        arcCompletion,
        growthTrajectory,
      });
    } catch (error) {
      logger.error('Error tracking character arc:', error);
      throw new DatabaseError('Failed to track character arc', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Calculates story importance score
   */
  private calculateStoryImportance(
    networkPosition: string,
    sceneCount: number,
    viewpointAccess: boolean
  ): number {
    let score = 0;

    // Base score from network position
    switch (networkPosition) {
      case 'central': score += 0.4; break;
      case 'bridge': score += 0.3; break;
      case 'peripheral': score += 0.1; break;
      case 'isolated': score += 0; break;
    }

    // Scene appearance contribution (up to 0.4)
    score += Math.min(0.4, sceneCount / 50);

    // Viewpoint access bonus (0.2)
    if (viewpointAccess) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Determines character growth trajectory based on importance progression
   */
  private determineGrowthTrajectory(importanceProgression: number[]): string {
    if (importanceProgression.length < 2) return 'flat';

    const first = importanceProgression[0];
    const last = importanceProgression[importanceProgression.length - 1];
    const middle = importanceProgression[Math.floor(importanceProgression.length / 2)];

    const totalChange = last - first;
    const midChange = middle - first;

    if (Math.abs(totalChange) < 0.1) return 'flat';
    if (totalChange > 0.2) return 'ascending';
    if (totalChange < -0.2) return 'descending';
    if (Math.abs(midChange) > Math.abs(totalChange)) return 'cyclical';

    return 'flat';
  }
}