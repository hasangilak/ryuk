import { Driver } from 'neo4j-driver';
import { MangaGenre } from './genre-classification-service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface KishotenketsuValidation {
  is_valid: boolean;
  completeness_score: number; // 0.0-1.0
  structure_integrity: {
    has_ki: boolean;
    has_sho: boolean;
    has_ten: boolean;
    has_ketsu: boolean;
    proper_sequence: boolean;
  };
  phase_quality: {
    ki_setup_quality: number;
    sho_development_quality: number;
    ten_twist_impact: number;
    ketsu_resolution_quality: number;
  };
  issues: string[];
  recommendations: string[];
}

export interface JoHaKyuValidation {
  is_valid: boolean;
  pacing_quality_score: number; // 0.0-1.0
  rhythm_consistency: number; // 0.0-1.0
  scale_analysis: {
    scale: string;
    has_jo: boolean;
    has_ha: boolean;
    has_kyu: boolean;
    pacing_balance: number;
  }[];
  issues: string[];
  recommendations: string[];
}

export interface CharacterNetworkValidation {
  is_valid: boolean;
  genre_adherence_score: number; // 0.0-1.0
  topology_analysis: {
    network_type: string;
    protagonist_centrality: number;
    network_density: number;
    clustering_coefficient: number;
    avg_path_length: number;
  };
  genre_expectations: {
    criterion: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
  issues: string[];
  recommendations: string[];
}

export interface PanelTransitionValidation {
  is_valid: boolean;
  flow_quality_score: number; // 0.0-1.0
  transition_distribution: Record<string, number>;
  flow_analysis: {
    scene_id: string;
    transition_count: number;
    avg_strength: number;
    visual_continuity: number;
    comprehension_score: number;
  }[];
  issues: string[];
  recommendations: string[];
}

export interface ComprehensiveValidation {
  overall_validity: boolean;
  authenticity_score: number; // 0.0-1.0
  kishōtenketsu: KishotenketsuValidation;
  jo_ha_kyu: JoHaKyuValidation;
  character_network: CharacterNetworkValidation;
  panel_transitions: PanelTransitionValidation;
  cultural_sensitivity: {
    is_respectful: boolean;
    sensitivity_score: number;
    concerns: string[];
  };
  overall_recommendations: string[];
}

// =============================================================================
// MANGA VALIDATION SERVICE
// =============================================================================

export class MangaValidationService {
  constructor(private driver: Driver) {}

  /**
   * Validate kishōtenketsu structure for a story
   */
  async validateKishotenketsuStructure(storyId: string): Promise<KishotenketsuValidation> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (story:Story {id: $storyId})
        OPTIONAL MATCH (story)-[:CONTAINS*]->(ki:Ki)
        OPTIONAL MATCH (story)-[:CONTAINS*]->(sho:Sho)
        OPTIONAL MATCH (story)-[:CONTAINS*]->(ten:Ten)
        OPTIONAL MATCH (story)-[:CONTAINS*]->(ketsu:Ketsu)
        WITH story,
             collect(DISTINCT ki) as ki_nodes,
             collect(DISTINCT sho) as sho_nodes,
             collect(DISTINCT ten) as ten_nodes,
             collect(DISTINCT ketsu) as ketsu_nodes
        RETURN
          size(ki_nodes) > 0 as has_ki,
          size(sho_nodes) > 0 as has_sho,
          size(ten_nodes) > 0 as has_ten,
          size(ketsu_nodes) > 0 as has_ketsu,
          ki_nodes,
          sho_nodes,
          ten_nodes,
          ketsu_nodes
        `,
        { storyId }
      );

      if (result.records.length === 0) {
        throw new Error('Story not found');
      }

      const record = result.records[0];
      const hasKi = record.get('has_ki');
      const hasSho = record.get('has_sho');
      const hasTen = record.get('has_ten');
      const hasKetsu = record.get('has_ketsu');

      const kiNodes = record.get('ki_nodes');
      const shoNodes = record.get('sho_nodes');
      const tenNodes = record.get('ten_nodes');
      const ketsuNodes = record.get('ketsu_nodes');

      const structureIntegrity = {
        has_ki: hasKi,
        has_sho: hasSho,
        has_ten: hasTen,
        has_ketsu: hasKetsu,
        proper_sequence: hasKi && hasSho && hasTen && hasKetsu,
      };

      // Calculate phase quality
      const phaseQuality = {
        ki_setup_quality: this.calculateKiQuality(kiNodes),
        sho_development_quality: this.calculateShoQuality(shoNodes),
        ten_twist_impact: this.calculateTenQuality(tenNodes),
        ketsu_resolution_quality: this.calculateKetsuQuality(ketsuNodes),
      };

      const completenessScore = this.calculateCompletenessScore(structureIntegrity, phaseQuality);
      const isValid = completenessScore >= 0.7 && structureIntegrity.proper_sequence;

      const issues: string[] = [];
      const recommendations: string[] = [];

      if (!hasKi) {
        issues.push('Missing Ki (Introduction) phase');
        recommendations.push('Add Ki nodes to establish story foundation');
      }
      if (!hasSho) {
        issues.push('Missing Shō (Development) phase');
        recommendations.push('Add Shō nodes for character and situation development');
      }
      if (!hasTen) {
        issues.push('Missing Ten (Twist) phase');
        recommendations.push('Add Ten nodes for narrative recontextualization');
      }
      if (!hasKetsu) {
        issues.push('Missing Ketsu (Conclusion) phase');
        recommendations.push('Add Ketsu nodes to resolve narrative with new understanding');
      }

      if (phaseQuality.ki_setup_quality < 0.6) {
        recommendations.push('Strengthen Ki phase with more establishment elements');
      }
      if (phaseQuality.ten_twist_impact < 0.6) {
        recommendations.push('Enhance Ten phase impact through better setup and surprise factor');
      }

      return {
        is_valid: isValid,
        completeness_score: completenessScore,
        structure_integrity: structureIntegrity,
        phase_quality: phaseQuality,
        issues,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate jo-ha-kyū pacing across all narrative scales
   */
  async validateJoHaKyuPacing(storyId: string): Promise<JoHaKyuValidation> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (story:Story {id: $storyId})-[:CONTAINS*]->(jhk:JoHaKyu)
        RETURN
          jhk.temporal_scale as scale,
          jhk.jo_ha_kyu_phase as phase,
          jhk.pacing_intensity as intensity,
          collect(jhk) as nodes
        ORDER BY jhk.temporal_scale
        `,
        { storyId }
      );

      const scaleGroups = new Map<string, any[]>();

      for (const record of result.records) {
        const scale = record.get('scale');
        const nodes = record.get('nodes');

        if (!scaleGroups.has(scale)) {
          scaleGroups.set(scale, []);
        }
        scaleGroups.get(scale)?.push(...nodes);
      }

      const scaleAnalysis: JoHaKyuValidation['scale_analysis'] = [];
      const issues: string[] = [];
      const recommendations: string[] = [];

      let totalPacingQuality = 0;
      let totalRhythmConsistency = 0;

      for (const [scale, nodes] of scaleGroups.entries()) {
        const hasJo = nodes.some((n: any) => n.properties.jo_ha_kyu_phase === 'jo');
        const hasHa = nodes.some((n: any) => n.properties.jo_ha_kyu_phase === 'ha');
        const hasKyu = nodes.some((n: any) => n.properties.jo_ha_kyu_phase === 'kyu');

        const joCount = nodes.filter((n: any) => n.properties.jo_ha_kyu_phase === 'jo').length;
        const haCount = nodes.filter((n: any) => n.properties.jo_ha_kyu_phase === 'ha').length;
        const kyuCount = nodes.filter((n: any) => n.properties.jo_ha_kyu_phase === 'kyu').length;

        const total = joCount + haCount + kyuCount;
        const idealJo = total * 0.3;
        const idealHa = total * 0.5;
        const idealKyu = total * 0.2;

        const joBalance = 1.0 - Math.abs(joCount - idealJo) / total;
        const haBalance = 1.0 - Math.abs(haCount - idealHa) / total;
        const kyuBalance = 1.0 - Math.abs(kyuCount - idealKyu) / total;

        const pacingBalance = (joBalance + haBalance + kyuBalance) / 3;

        scaleAnalysis.push({
          scale,
          has_jo: hasJo,
          has_ha: hasHa,
          has_kyu: hasKyu,
          pacing_balance: pacingBalance,
        });

        totalPacingQuality += pacingBalance;

        if (!hasJo || !hasHa || !hasKyu) {
          issues.push(`Incomplete jo-ha-kyū cycle at ${scale} scale`);
          recommendations.push(`Add missing phases at ${scale} scale`);
        }

        if (pacingBalance < 0.6) {
          recommendations.push(`Rebalance pacing at ${scale} scale for better rhythm`);
        }

        // Check rhythm consistency (intensity progression)
        const intensities = nodes.map((n: any) => n.properties.pacing_intensity);
        const rhythmConsistency = this.calculateRhythmConsistency(intensities);
        totalRhythmConsistency += rhythmConsistency;

        if (rhythmConsistency < 0.6) {
          recommendations.push(`Improve pacing intensity progression at ${scale} scale`);
        }
      }

      const scaleCount = scaleGroups.size;
      const avgPacingQuality = scaleCount > 0 ? totalPacingQuality / scaleCount : 0;
      const avgRhythmConsistency = scaleCount > 0 ? totalRhythmConsistency / scaleCount : 0;

      const isValid = avgPacingQuality >= 0.7 && avgRhythmConsistency >= 0.6;

      if (scaleCount === 0) {
        issues.push('No jo-ha-kyū pacing nodes found');
        recommendations.push('Implement jo-ha-kyū pacing structure');
      }

      return {
        is_valid: isValid,
        pacing_quality_score: avgPacingQuality,
        rhythm_consistency: avgRhythmConsistency,
        scale_analysis: scaleAnalysis,
        issues,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate character network topology for genre adherence
   */
  async validateCharacterNetwork(
    storyId: string,
    expectedGenre: MangaGenre
  ): Promise<CharacterNetworkValidation> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (story:Story {id: $storyId})-[:CONTAINS*]->(network:CharacterNetwork)
        RETURN
          network.network_type as network_type,
          network.protagonist_centrality as protagonist_centrality,
          network.network_density as network_density,
          network.clustering_coefficient as clustering_coefficient,
          network.avg_path_length as avg_path_length
        LIMIT 1
        `,
        { storyId }
      );

      if (result.records.length === 0) {
        return {
          is_valid: false,
          genre_adherence_score: 0,
          topology_analysis: {
            network_type: 'none',
            protagonist_centrality: 0,
            network_density: 0,
            clustering_coefficient: 0,
            avg_path_length: 0,
          },
          genre_expectations: [],
          issues: ['No character network found'],
          recommendations: ['Create character network topology for the story'],
        };
      }

      const record = result.records[0];
      const networkType = record.get('network_type');
      const protagonistCentrality = record.get('protagonist_centrality') || 0;
      const networkDensity = record.get('network_density') || 0;
      const clusteringCoefficient = record.get('clustering_coefficient') || 0;
      const avgPathLength = record.get('avg_path_length') || 0;

      const topologyAnalysis = {
        network_type: networkType,
        protagonist_centrality: protagonistCentrality,
        network_density: networkDensity,
        clustering_coefficient: clusteringCoefficient,
        avg_path_length: avgPathLength,
      };

      // Define genre expectations
      const expectations = this.getGenreNetworkExpectations(expectedGenre);
      const genreExpectations: CharacterNetworkValidation['genre_expectations'] = [];
      let adherenceScore = 0;
      const issues: string[] = [];
      const recommendations: string[] = [];

      for (const [criterion, expectation] of Object.entries(expectations)) {
        let passed = false;
        let actual = '';

        switch (criterion) {
          case 'network_type':
            actual = networkType;
            passed = networkType === expectation.expected;
            break;
          case 'protagonist_centrality':
            actual = protagonistCentrality.toFixed(2);
            passed = this.meetsThreshold(protagonistCentrality, expectation.threshold);
            break;
          case 'network_density':
            actual = networkDensity.toFixed(2);
            passed = this.meetsThreshold(networkDensity, expectation.threshold);
            break;
        }

        genreExpectations.push({
          criterion,
          expected: expectation.expected,
          actual,
          passed,
        });

        if (passed) {
          adherenceScore += 1;
        } else {
          issues.push(`${criterion}: Expected ${expectation.expected}, got ${actual}`);
          if (expectation.recommendation) {
            recommendations.push(expectation.recommendation);
          }
        }
      }

      adherenceScore = adherenceScore / Object.keys(expectations).length;
      const isValid = adherenceScore >= 0.7;

      return {
        is_valid: isValid,
        genre_adherence_score: adherenceScore,
        topology_analysis: topologyAnalysis,
        genre_expectations: genreExpectations,
        issues,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate panel transition flow quality
   */
  async validatePanelTransitions(storyId: string): Promise<PanelTransitionValidation> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (story:Story {id: $storyId})-[:CONTAINS*]->(scene)
        WHERE scene:Scene OR scene:Stitch
        OPTIONAL MATCH (scene)-[:CONTAINS*]->(content)
        WHERE content:ContentElement
        OPTIONAL MATCH (content)-[trans:PANEL_TRANSITION]->(next)
        WITH scene.id as scene_id,
             collect(DISTINCT trans) as transitions
        WHERE size(transitions) > 0
        RETURN
          scene_id,
          transitions,
          [t in transitions | t.transition_type] as types,
          [t in transitions | t.transition_strength] as strengths,
          [t in transitions | t.visual_continuity] as continuities
        `,
        { storyId }
      );

      if (result.records.length === 0) {
        return {
          is_valid: false,
          flow_quality_score: 0,
          transition_distribution: {},
          flow_analysis: [],
          issues: ['No panel transitions found'],
          recommendations: ['Add panel transitions between content elements'],
        };
      }

      const transitionDistribution: Record<string, number> = {};
      const flowAnalysis: PanelTransitionValidation['flow_analysis'] = [];
      let totalFlowQuality = 0;

      for (const record of result.records) {
        const sceneId = record.get('scene_id');
        const types = record.get('types');
        const strengths = record.get('strengths');
        const continuities = record.get('continuities');

        // Count transition types
        for (const type of types) {
          transitionDistribution[type] = (transitionDistribution[type] || 0) + 1;
        }

        // Calculate scene flow quality
        const avgStrength = strengths.reduce((sum: number, s: number) => sum + s, 0) / strengths.length;
        const avgContinuity = continuities.reduce((sum: number, c: number) => sum + c, 0) / continuities.length;

        // Comprehension score based on transition variety and strength
        const typeVariety = new Set(types).size;
        const comprehensionScore = (avgStrength + avgContinuity + (typeVariety / 6)) / 3;

        flowAnalysis.push({
          scene_id: sceneId,
          transition_count: types.length,
          avg_strength: avgStrength,
          visual_continuity: avgContinuity,
          comprehension_score: comprehensionScore,
        });

        totalFlowQuality += comprehensionScore;
      }

      const flowQualityScore = totalFlowQuality / result.records.length;
      const isValid = flowQualityScore >= 0.7;

      const issues: string[] = [];
      const recommendations: string[] = [];

      if (flowQualityScore < 0.7) {
        issues.push('Panel transition flow quality below acceptable threshold');
        recommendations.push('Review and improve panel transition strength and continuity');
      }

      // Check for good transition variety
      const totalTransitions = Object.values(transitionDistribution).reduce((sum, count) => sum + count, 0);
      const aspectToAspectCount = transitionDistribution['aspect-to-aspect'] || 0;
      const aspectRatio = aspectToAspectCount / totalTransitions;

      if (aspectRatio < 0.1) {
        recommendations.push('Consider adding more aspect-to-aspect transitions for mood exploration');
      }

      return {
        is_valid: isValid,
        flow_quality_score: flowQualityScore,
        transition_distribution: transitionDistribution,
        flow_analysis: flowAnalysis,
        issues,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Comprehensive manga structure validation
   */
  async validateMangaStructure(
    storyId: string,
    genre: MangaGenre
  ): Promise<ComprehensiveValidation> {
    // Run all validations in parallel
    const [
      kishōtenketsu,
      joHaKyu,
      characterNetwork,
      panelTransitions,
    ] = await Promise.all([
      this.validateKishotenketsuStructure(storyId),
      this.validateJoHaKyuPacing(storyId),
      this.validateCharacterNetwork(storyId, genre),
      this.validatePanelTransitions(storyId),
    ]);

    // Calculate overall authenticity score
    const authenticityScore = (
      kishōtenketsu.completeness_score +
      joHaKyu.pacing_quality_score +
      characterNetwork.genre_adherence_score +
      panelTransitions.flow_quality_score
    ) / 4;

    const overallValidity =
      kishōtenketsu.is_valid &&
      joHaKyu.is_valid &&
      characterNetwork.is_valid &&
      panelTransitions.is_valid;

    // Cultural sensitivity check (simplified)
    const culturalSensitivity = {
      is_respectful: true,
      sensitivity_score: 0.9,
      concerns: [] as string[],
    };

    // Aggregate recommendations
    const overallRecommendations: string[] = [];

    if (authenticityScore < 0.85) {
      overallRecommendations.push('Overall manga authenticity could be improved');
    }

    if (!kishōtenketsu.is_valid) {
      overallRecommendations.push('Strengthen kishōtenketsu structure');
    }

    if (!joHaKyu.is_valid) {
      overallRecommendations.push('Improve jo-ha-kyū pacing consistency');
    }

    if (!characterNetwork.is_valid) {
      overallRecommendations.push(`Adjust character network to match ${genre} genre conventions`);
    }

    if (!panelTransitions.is_valid) {
      overallRecommendations.push('Enhance panel transition flow and continuity');
    }

    return {
      overall_validity: overallValidity,
      authenticity_score: authenticityScore,
      kishōtenketsu,
      jo_ha_kyu: joHaKyu,
      character_network: characterNetwork,
      panel_transitions: panelTransitions,
      cultural_sensitivity: culturalSensitivity,
      overall_recommendations: overallRecommendations,
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private calculateKiQuality(kiNodes: any[]): number {
    if (kiNodes.length === 0) return 0;

    const avgSetupCompleteness = kiNodes.reduce((sum, node) => {
      return sum + (node.properties.setup_completeness || 0);
    }, 0) / kiNodes.length;

    return avgSetupCompleteness;
  }

  private calculateShoQuality(shoNodes: any[]): number {
    if (shoNodes.length === 0) return 0;

    const avgTensionBuildup = shoNodes.reduce((sum, node) => {
      return sum + (node.properties.tension_buildup || 0);
    }, 0) / shoNodes.length;

    return avgTensionBuildup;
  }

  private calculateTenQuality(tenNodes: any[]): number {
    if (tenNodes.length === 0) return 0;

    const avgSurpriseFactor = tenNodes.reduce((sum, node) => {
      return sum + (node.properties.surprise_factor || 0);
    }, 0) / tenNodes.length;

    return avgSurpriseFactor;
  }

  private calculateKetsuQuality(ketsuNodes: any[]): number {
    if (ketsuNodes.length === 0) return 0;

    const avgClosureLevel = ketsuNodes.reduce((sum, node) => {
      return sum + (node.properties.closure_level || 0);
    }, 0) / ketsuNodes.length;

    return avgClosureLevel;
  }

  private calculateCompletenessScore(
    integrity: KishotenketsuValidation['structure_integrity'],
    quality: KishotenketsuValidation['phase_quality']
  ): number {
    const integrityScore = [
      integrity.has_ki,
      integrity.has_sho,
      integrity.has_ten,
      integrity.has_ketsu,
      integrity.proper_sequence,
    ].filter(Boolean).length / 5;

    const qualityScore = (
      quality.ki_setup_quality +
      quality.sho_development_quality +
      quality.ten_twist_impact +
      quality.ketsu_resolution_quality
    ) / 4;

    return (integrityScore + qualityScore) / 2;
  }

  private calculateRhythmConsistency(intensities: number[]): number {
    if (intensities.length < 2) return 1.0;

    // Check for general upward trend (jo → ha → kyū)
    let trendScore = 0;
    for (let i = 1; i < intensities.length; i++) {
      if (intensities[i] >= intensities[i - 1]) {
        trendScore++;
      }
    }

    return trendScore / (intensities.length - 1);
  }

  private getGenreNetworkExpectations(genre: MangaGenre): Record<string, any> {
    const expectations: Record<MangaGenre, Record<string, any>> = {
      shonen: {
        network_type: {
          expected: 'shonen',
          threshold: null,
          recommendation: 'Use shōnen character network topology',
        },
        protagonist_centrality: {
          expected: '>0.7',
          threshold: { operator: '>', value: 0.7 },
          recommendation: 'Increase protagonist centrality for shōnen genre',
        },
        network_density: {
          expected: '>0.5',
          threshold: { operator: '>', value: 0.5 },
          recommendation: 'Increase character connection density for shōnen',
        },
      },
      shojo: {
        network_type: {
          expected: 'shojo',
          threshold: null,
          recommendation: 'Use shōjo character network topology',
        },
        protagonist_centrality: {
          expected: '0.4-0.7',
          threshold: { operator: 'range', min: 0.4, max: 0.7 },
          recommendation: 'Balance protagonist centrality for shōjo genre',
        },
        network_density: {
          expected: '<0.5',
          threshold: { operator: '<', value: 0.5 },
          recommendation: 'Maintain sparse network for intimate shōjo relationships',
        },
      },
    } as any;

    return expectations[genre] || expectations.shonen;
  }

  private meetsThreshold(value: number, threshold: any): boolean {
    if (!threshold) return true;

    switch (threshold.operator) {
      case '>':
        return value > threshold.value;
      case '<':
        return value < threshold.value;
      case '>=':
        return value >= threshold.value;
      case '<=':
        return value <= threshold.value;
      case 'range':
        return value >= threshold.min && value <= threshold.max;
      default:
        return true;
    }
  }
}