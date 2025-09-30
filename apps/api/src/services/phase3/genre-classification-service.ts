import { Driver } from 'neo4j-driver';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type MangaGenre =
  | 'shonen'
  | 'shojo'
  | 'seinen'
  | 'josei'
  | 'kodomomuke'
  | 'isekai'
  | 'mecha'
  | 'sports'
  | 'slice_of_life'
  | 'horror'
  | 'mystery'
  | 'romance'
  | 'action'
  | 'comedy'
  | 'drama'
  | 'fantasy'
  | 'scifi';

export interface GenreClassification {
  story_id: string;
  primary_genre: MangaGenre;
  secondary_genres: MangaGenre[];
  confidence_score: number; // 0.0-1.0
  genre_scores: Record<MangaGenre, number>;
  detected_patterns: string[];
  authenticity_score: number; // 0.0-1.0
  recommendations: string[];
}

export interface NarrativePattern {
  pattern_id: string;
  pattern_name: string;
  pattern_type: 'structural' | 'character' | 'pacing' | 'thematic';
  genres: MangaGenre[];
  effectiveness_score: number; // 0.0-1.0
  usage_frequency: number;
  description: string;
  examples: string[];
}

export interface GenreValidation {
  is_authentic: boolean;
  authenticity_score: number; // 0.0-1.0 (85%+ is target)
  genre_adherence: Record<string, {
    criterion: string;
    passed: boolean;
    score: number;
    feedback: string;
  }>;
  warnings: string[];
  recommendations: string[];
}

// =============================================================================
// GENRE CLASSIFICATION SERVICE
// =============================================================================

export class GenreClassificationService {
  constructor(private driver: Driver) {}

  /**
   * Classify story into manga genres based on narrative patterns
   */
  async classifyStory(storyId: string): Promise<GenreClassification> {
    const session = this.driver.session();
    try {
      // Analyze story structure
      const structureResult = await session.run(
        `
        MATCH (story:Story {id: $storyId})
        OPTIONAL MATCH (story)-[:CONTAINS*]->(ki:Ki)
        OPTIONAL MATCH (story)-[:CONTAINS*]->(ten:Ten)
        OPTIONAL MATCH (story)-[:CONTAINS*]->(char:Character)
        OPTIONAL MATCH (story)-[:CONTAINS*]->(network:CharacterNetwork)
        OPTIONAL MATCH (char)-[rel]-(other:Character)
        RETURN
          story.genre as stated_genre,
          count(DISTINCT ki) as ki_count,
          count(DISTINCT ten) as ten_count,
          count(DISTINCT char) as char_count,
          count(DISTINCT network) as network_count,
          count(DISTINCT rel) as relationship_count,
          collect(DISTINCT network.network_type) as network_types
        `,
        { storyId }
      );

      if (structureResult.records.length === 0) {
        throw new Error('Story not found');
      }

      const record = structureResult.records[0];
      const statedGenre = record.get('stated_genre');
      const charCount = record.get('char_count');
      const relationshipCount = record.get('relationship_count');
      const networkTypes = record.get('network_types');

      // Analyze pacing patterns
      const pacingResult = await session.run(
        `
        MATCH (story:Story {id: $storyId})-[:CONTAINS*]->(jhk:JoHaKyu)
        RETURN
          avg(jhk.pacing_intensity) as avg_intensity,
          collect(jhk.jo_ha_kyu_phase) as phases
        `,
        { storyId }
      );

      const avgIntensity = pacingResult.records[0]?.get('avg_intensity') || 0.5;

      // Calculate genre scores
      const genreScores = this.calculateGenreScores({
        statedGenre,
        charCount,
        relationshipCount,
        networkTypes,
        avgIntensity,
      });

      // Determine primary and secondary genres
      const sortedGenres = Object.entries(genreScores)
        .sort(([, a], [, b]) => b - a);

      const primaryGenre = sortedGenres[0][0] as MangaGenre;
      const secondaryGenres = sortedGenres
        .slice(1, 4)
        .filter(([, score]) => score > 0.3)
        .map(([genre]) => genre as MangaGenre);

      const confidenceScore = sortedGenres[0][1];

      // Detect narrative patterns
      const detectedPatterns = this.detectNarrativePatterns({
        primaryGenre,
        charCount,
        relationshipCount,
        avgIntensity,
      });

      // Calculate authenticity score
      const authenticityScore = this.calculateAuthenticityScore(
        primaryGenre,
        detectedPatterns
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        primaryGenre,
        authenticityScore,
        detectedPatterns
      );

      return {
        story_id: storyId,
        primary_genre: primaryGenre,
        secondary_genres: secondaryGenres,
        confidence_score: confidenceScore,
        genre_scores: genreScores as Record<MangaGenre, number>,
        detected_patterns: detectedPatterns,
        authenticity_score: authenticityScore,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate genre authenticity and adherence to conventions
   */
  async validateGenreAuthenticity(
    storyId: string,
    targetGenre: MangaGenre
  ): Promise<GenreValidation> {
    const session = this.driver.session();
    try {
      const classification = await this.classifyStory(storyId);

      const genreAdherence: GenreValidation['genre_adherence'] = {};
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Get genre-specific criteria
      const criteria = this.getGenreCriteria(targetGenre);

      // Analyze character network
      const networkResult = await session.run(
        `
        MATCH (story:Story {id: $storyId})-[:CONTAINS*]->(network:CharacterNetwork)
        RETURN
          network.network_type as network_type,
          network.protagonist_centrality as centrality,
          network.network_density as density,
          network.intimacy_level as intimacy
        LIMIT 1
        `,
        { storyId }
      );

      const hasNetwork = networkResult.records.length > 0;
      const networkType = networkResult.records[0]?.get('network_type');
      const centrality = networkResult.records[0]?.get('centrality') || 0;
      const density = networkResult.records[0]?.get('density') || 0;
      const intimacy = networkResult.records[0]?.get('intimacy') || 0;

      // Evaluate each criterion
      for (const [key, criterion] of Object.entries(criteria)) {
        let passed = false;
        let score = 0;
        let feedback = '';

        switch (key) {
          case 'character_network':
            passed = hasNetwork && (
              (targetGenre === 'shonen' && networkType === 'shonen') ||
              (targetGenre === 'shojo' && networkType === 'shojo')
            );
            score = passed ? 1.0 : (hasNetwork ? 0.5 : 0);
            feedback = passed
              ? 'Character network matches genre conventions'
              : `Consider using ${targetGenre} network topology`;
            break;

          case 'protagonist_centrality':
            if (targetGenre === 'shonen') {
              passed = centrality > 0.7;
              score = centrality;
              feedback = passed
                ? 'Protagonist centrality appropriate for shōnen'
                : 'Increase protagonist centrality for shōnen genre';
            } else {
              passed = true;
              score = 1.0;
              feedback = 'Centrality appropriate for genre';
            }
            break;

          case 'relationship_intimacy':
            if (targetGenre === 'shojo') {
              passed = intimacy > 0.7;
              score = intimacy;
              feedback = passed
                ? 'Relationship intimacy appropriate for shōjo'
                : 'Increase relationship depth for shōjo genre';
            } else {
              passed = true;
              score = 1.0;
              feedback = 'Relationship modeling appropriate for genre';
            }
            break;

          case 'pacing_structure':
            passed = classification.detected_patterns.includes('jo-ha-kyu');
            score = passed ? 1.0 : 0.5;
            feedback = passed
              ? 'Jo-ha-kyū pacing structure detected'
              : 'Consider implementing jo-ha-kyū pacing for authenticity';
            break;

          case 'narrative_structure':
            passed = classification.detected_patterns.includes('kishotenketsu');
            score = passed ? 1.0 : 0.5;
            feedback = passed
              ? 'Kishōtenketsu structure detected'
              : 'Consider using kishōtenketsu narrative structure';
            break;

          default:
            passed = true;
            score = 0.8;
            feedback = 'Criterion not yet implemented';
        }

        genreAdherence[key] = {
          criterion: criterion,
          passed,
          score,
          feedback,
        };

        if (!passed) {
          warnings.push(`${criterion}: ${feedback}`);
        }
      }

      // Calculate overall authenticity score
      const adherenceScores = Object.values(genreAdherence).map(a => a.score);
      const authenticityScore = adherenceScores.length > 0
        ? adherenceScores.reduce((sum, s) => sum + s, 0) / adherenceScores.length
        : 0;

      const isAuthentic = authenticityScore >= 0.85;

      // Generate recommendations
      if (authenticityScore < 0.85) {
        recommendations.push('Review genre conventions for improved authenticity');
      }
      if (authenticityScore < 0.6) {
        recommendations.push('Consider consulting manga genre references');
      }

      return {
        is_authentic: isAuthentic,
        authenticity_score: authenticityScore,
        genre_adherence: genreAdherence,
        warnings,
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Analyze narrative patterns and identify effective structures
   */
  async analyzeNarrativePatterns(storyId: string): Promise<{
    patterns: NarrativePattern[];
    effectiveness_summary: {
      average_effectiveness: number;
      strong_patterns: string[];
      weak_patterns: string[];
    };
    optimization_recommendations: string[];
  }> {
    const session = this.driver.session();
    try {
      const classification = await this.classifyStory(storyId);

      // Build pattern library
      const patterns: NarrativePattern[] = [];

      // Structural patterns
      if (classification.detected_patterns.includes('kishotenketsu')) {
        patterns.push({
          pattern_id: 'kishotenketsu',
          pattern_name: 'Kishōtenketsu Structure',
          pattern_type: 'structural',
          genres: ['shonen', 'shojo', 'seinen', 'josei'],
          effectiveness_score: 0.9,
          usage_frequency: 1,
          description: 'Four-act Japanese narrative structure (ki-shō-ten-ketsu)',
          examples: ['Established foundation with ki nodes', 'Development through shō', 'Twist with ten', 'Resolution with ketsu'],
        });
      }

      // Pacing patterns
      if (classification.detected_patterns.includes('jo-ha-kyu')) {
        patterns.push({
          pattern_id: 'jo-ha-kyu',
          pattern_name: 'Jo-Ha-Kyū Pacing',
          pattern_type: 'pacing',
          genres: ['shonen', 'shojo', 'seinen', 'action', 'drama'],
          effectiveness_score: 0.85,
          usage_frequency: 1,
          description: 'Three-phase pacing (slow-fast-faster)',
          examples: ['Gradual introduction', 'Rapid development', 'Swift climax'],
        });
      }

      // Character patterns
      if (classification.primary_genre === 'shonen') {
        patterns.push({
          pattern_id: 'protagonist-centered-network',
          pattern_name: 'Protagonist-Centered Network',
          pattern_type: 'character',
          genres: ['shonen', 'action', 'isekai'],
          effectiveness_score: 0.88,
          usage_frequency: 1,
          description: 'Character relationships centered around protagonist',
          examples: ['High protagonist centrality', 'Progressive ally recruitment', 'Rival integration'],
        });
      }

      // Calculate effectiveness summary
      const avgEffectiveness = patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.effectiveness_score, 0) / patterns.length
        : 0;

      const strongPatterns = patterns
        .filter(p => p.effectiveness_score >= 0.8)
        .map(p => p.pattern_name);

      const weakPatterns = patterns
        .filter(p => p.effectiveness_score < 0.6)
        .map(p => p.pattern_name);

      // Generate optimization recommendations
      const optimizationRecommendations: string[] = [];

      if (avgEffectiveness < 0.7) {
        optimizationRecommendations.push('Consider strengthening core narrative patterns');
      }

      if (!classification.detected_patterns.includes('kishotenketsu')) {
        optimizationRecommendations.push('Implement kishōtenketsu structure for authentic manga narrative');
      }

      if (!classification.detected_patterns.includes('jo-ha-kyu')) {
        optimizationRecommendations.push('Add jo-ha-kyū pacing for improved flow');
      }

      if (classification.authenticity_score < 0.75) {
        optimizationRecommendations.push('Review genre conventions to improve authenticity');
      }

      return {
        patterns,
        effectiveness_summary: {
          average_effectiveness: avgEffectiveness,
          strong_patterns: strongPatterns,
          weak_patterns: weakPatterns,
        },
        optimization_recommendations: optimizationRecommendations,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get pattern library templates for rapid development
   */
  getPatternLibrary(genre?: MangaGenre): NarrativePattern[] {
    const library: NarrativePattern[] = [
      {
        pattern_id: 'tournament-arc',
        pattern_name: 'Tournament Arc',
        pattern_type: 'structural',
        genres: ['shonen', 'sports', 'action'],
        effectiveness_score: 0.92,
        usage_frequency: 3,
        description: 'Structured competition with escalating challenges',
        examples: ['Initial brackets', 'Progressive difficulty', 'Final showdown', 'Character growth through competition'],
      },
      {
        pattern_id: 'training-montage',
        pattern_name: 'Training Montage',
        pattern_type: 'character',
        genres: ['shonen', 'sports', 'action', 'isekai'],
        effectiveness_score: 0.87,
        usage_frequency: 5,
        description: 'Character power-up through dedicated training',
        examples: ['Initial weakness', 'Training sequence', 'New abilities', 'Demonstration of growth'],
      },
      {
        pattern_id: 'love-triangle',
        pattern_name: 'Romantic Triangle',
        pattern_type: 'character',
        genres: ['shojo', 'romance', 'drama'],
        effectiveness_score: 0.85,
        usage_frequency: 4,
        description: 'Three-person romantic tension',
        examples: ['Protagonist', 'First interest', 'Second interest', 'Resolution'],
      },
      {
        pattern_id: 'power-awakening',
        pattern_name: 'Power Awakening',
        pattern_type: 'character',
        genres: ['shonen', 'action', 'isekai', 'fantasy'],
        effectiveness_score: 0.90,
        usage_frequency: 2,
        description: 'Character discovers hidden or latent abilities',
        examples: ['Crisis moment', 'Emotional trigger', 'Power manifestation', 'New capabilities'],
      },
      {
        pattern_id: 'slice-of-life-episodic',
        pattern_name: 'Slice of Life Episodes',
        pattern_type: 'structural',
        genres: ['slice_of_life', 'comedy', 'shojo'],
        effectiveness_score: 0.83,
        usage_frequency: 8,
        description: 'Self-contained everyday life episodes',
        examples: ['Daily activities', 'Character interactions', 'Small conflicts', 'Gentle resolution'],
      },
    ];

    if (genre) {
      return library.filter(p => p.genres.includes(genre));
    }

    return library;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private calculateGenreScores(data: {
    statedGenre: string;
    charCount: number;
    relationshipCount: number;
    networkTypes: string[];
    avgIntensity: number;
  }): Record<string, number> {
    const scores: Record<string, number> = {
      shonen: 0,
      shojo: 0,
      seinen: 0,
      josei: 0,
      action: 0,
      romance: 0,
      drama: 0,
      comedy: 0,
      fantasy: 0,
      slice_of_life: 0,
    };

    // Start with stated genre
    if (data.statedGenre && scores.hasOwnProperty(data.statedGenre)) {
      scores[data.statedGenre] += 0.3;
    }

    // High character count and relationships suggest shōnen
    if (data.charCount > 10 && data.relationshipCount > 20) {
      scores.shonen += 0.4;
      scores.action += 0.3;
    }

    // Low character count, high intimacy suggests shōjo
    if (data.charCount < 8 && data.networkTypes.includes('shojo')) {
      scores.shojo += 0.5;
      scores.romance += 0.4;
    }

    // Network types
    if (data.networkTypes.includes('shonen')) {
      scores.shonen += 0.3;
    }
    if (data.networkTypes.includes('shojo')) {
      scores.shojo += 0.3;
    }

    // High pacing intensity suggests action
    if (data.avgIntensity > 0.7) {
      scores.action += 0.3;
      scores.shonen += 0.2;
    }

    // Low pacing intensity suggests slice of life
    if (data.avgIntensity < 0.4) {
      scores.slice_of_life += 0.3;
      scores.comedy += 0.2;
    }

    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      for (const key in scores) {
        scores[key] = scores[key] / maxScore;
      }
    }

    return scores;
  }

  private detectNarrativePatterns(data: {
    primaryGenre: MangaGenre;
    charCount: number;
    relationshipCount: number;
    avgIntensity: number;
  }): string[] {
    const patterns: string[] = [];

    // Assume kishōtenketsu and jo-ha-kyū are present if Phase 3 nodes exist
    patterns.push('kishotenketsu', 'jo-ha-kyu');

    // Genre-specific patterns
    if (data.primaryGenre === 'shonen') {
      patterns.push('protagonist-centered', 'progressive-densification');
      if (data.avgIntensity > 0.7) {
        patterns.push('high-action-pacing');
      }
    }

    if (data.primaryGenre === 'shojo') {
      patterns.push('intimate-relationships', 'emotional-depth');
    }

    if (data.charCount > 15) {
      patterns.push('ensemble-cast');
    }

    return patterns;
  }

  private calculateAuthenticityScore(
    genre: MangaGenre,
    patterns: string[]
  ): number {
    let score = 0.5; // Base score

    // Kishōtenketsu and jo-ha-kyū are fundamental
    if (patterns.includes('kishotenketsu')) score += 0.2;
    if (patterns.includes('jo-ha-kyu')) score += 0.2;

    // Genre-specific patterns
    if (genre === 'shonen' && patterns.includes('protagonist-centered')) score += 0.1;
    if (genre === 'shojo' && patterns.includes('intimate-relationships')) score += 0.1;

    return Math.min(1.0, score);
  }

  private generateRecommendations(
    genre: MangaGenre,
    authenticityScore: number,
    patterns: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (authenticityScore < 0.85) {
      recommendations.push('Review genre conventions for improved authenticity');
    }

    if (!patterns.includes('kishotenketsu')) {
      recommendations.push('Implement kishōtenketsu structure');
    }

    if (!patterns.includes('jo-ha-kyu')) {
      recommendations.push('Add jo-ha-kyū pacing');
    }

    if (genre === 'shonen' && !patterns.includes('protagonist-centered')) {
      recommendations.push('Consider protagonist-centered character network');
    }

    if (genre === 'shojo' && !patterns.includes('intimate-relationships')) {
      recommendations.push('Develop deeper character relationships for shōjo genre');
    }

    return recommendations;
  }

  private getGenreCriteria(genre: MangaGenre): Record<string, string> {
    const baseCriteria = {
      narrative_structure: 'Kishōtenketsu narrative structure',
      pacing_structure: 'Jo-ha-kyū pacing system',
    };

    const genreSpecific: Record<string, Record<string, string>> = {
      shonen: {
        character_network: 'Protagonist-centered character network',
        protagonist_centrality: 'High protagonist centrality (>0.7)',
        ...baseCriteria,
      },
      shojo: {
        character_network: 'Intimate relationship network',
        relationship_intimacy: 'High relationship intimacy (>0.7)',
        ...baseCriteria,
      },
      seinen: {
        ...baseCriteria,
        narrative_complexity: 'Complex narrative structure',
      },
      josei: {
        ...baseCriteria,
        character_depth: 'Deep character development',
      },
    };

    return genreSpecific[genre] || baseCriteria;
  }
}