import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  CharacterNetworkNode,
  CreateCharacterNetworkNode,
  UpdateCharacterNetworkNode,
  MangaGenre,
} from '@ryuk/shared';

export class CharacterNetworkService {
  constructor(private driver: Driver) {}

  // =============================================================================
  // CHARACTER NETWORK NODE OPERATIONS
  // =============================================================================

  async createCharacterNetworkNode(data: CreateCharacterNetworkNode): Promise<CharacterNetworkNode> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        CREATE (cn:CharacterNetwork {
          id: $id,
          story_id: $story_id,
          genre: $genre,
          character_id: $character_id,
          shonen_properties: $shonen_properties,
          shojo_properties: $shojo_properties,
          small_world_metrics: $small_world_metrics,
          topology_analysis: $topology_analysis,
          connection_patterns: $connection_patterns,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN cn
        `,
        {
          id,
          story_id: data.story_id,
          genre: data.genre,
          character_id: data.character_id,
          shonen_properties: JSON.stringify(data.shonen_properties || null),
          shojo_properties: JSON.stringify(data.shojo_properties || null),
          small_world_metrics: JSON.stringify(data.small_world_metrics || null),
          topology_analysis: JSON.stringify(data.topology_analysis || null),
          connection_patterns: JSON.stringify(data.connection_patterns || []),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      const node = result.records[0]?.get('cn').properties;
      return this.parseCharacterNetworkNode(node);
    } finally {
      await session.close();
    }
  }

  async getCharacterNetworkNode(id: string): Promise<CharacterNetworkNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (cn:CharacterNetwork {id: $id}) RETURN cn',
        { id }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('cn').properties;
      return this.parseCharacterNetworkNode(node);
    } finally {
      await session.close();
    }
  }

  async getCharacterNetworkByCharacter(characterId: string): Promise<CharacterNetworkNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (cn:CharacterNetwork {character_id: $characterId}) RETURN cn',
        { characterId }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('cn').properties;
      return this.parseCharacterNetworkNode(node);
    } finally {
      await session.close();
    }
  }

  async updateCharacterNetworkNode(id: string, updates: Partial<UpdateCharacterNetworkNode>): Promise<CharacterNetworkNode> {
    const session = this.driver.session();
    try {
      const setClauses: string[] = [];
      const params: Record<string, any> = { id, updated_at: new Date().toISOString() };

      if (updates.genre !== undefined) {
        setClauses.push('cn.genre = $genre');
        params.genre = updates.genre;
      }

      const jsonFields = [
        'shonen_properties',
        'shojo_properties',
        'small_world_metrics',
        'topology_analysis',
        'connection_patterns',
      ];

      jsonFields.forEach(field => {
        if (updates[field as keyof UpdateCharacterNetworkNode] !== undefined) {
          setClauses.push(`cn.${field} = $${field}`);
          params[field] = JSON.stringify(updates[field as keyof UpdateCharacterNetworkNode]);
        }
      });

      setClauses.push('cn.updated_at = datetime($updated_at)');

      const query = `
        MATCH (cn:CharacterNetwork {id: $id})
        SET ${setClauses.join(', ')}
        RETURN cn
      `;

      const result = await session.run(query, params);
      const node = result.records[0]?.get('cn').properties;
      return this.parseCharacterNetworkNode(node);
    } finally {
      await session.close();
    }
  }

  async deleteCharacterNetworkNode(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('MATCH (cn:CharacterNetwork {id: $id}) DETACH DELETE cn', { id });
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // NETWORK ANALYSIS OPERATIONS
  // =============================================================================

  async analyzeStoryNetwork(storyId: string, genre: MangaGenre): Promise<{
    network_summary: {
      total_characters: number;
      avg_connections: number;
      network_density: number;
      clustering_coefficient: number;
    };
    genre_specific: any;
    small_world_properties: {
      is_small_world: boolean;
      avg_path_length: number;
      clustering_coefficient: number;
      small_world_coefficient: number;
    };
    recommendations: string[];
  }> {
    const session = this.driver.session();
    try {
      // Get all characters in the story
      const result = await session.run(
        `
        MATCH (c:Character)-[:APPEARS_IN]->(s:Scene)-[:BELONGS_TO*]->(story:Story {id: $storyId})
        WITH DISTINCT c
        OPTIONAL MATCH (cn:CharacterNetwork {character_id: c.id})
        RETURN c, cn
        `,
        { storyId }
      );

      const characters = result.records.map(r => ({
        character: r.get('c').properties,
        network: r.get('cn') ? this.parseCharacterNetworkNode(r.get('cn').properties) : null,
      }));

      const total_characters = characters.length;
      const recommendations: string[] = [];

      // Calculate basic network metrics
      let total_connections = 0;
      let total_clustering = 0;
      let clustering_count = 0;

      characters.forEach(({ network }) => {
        if (network) {
          total_connections += network.connection_patterns.length;
          if (network.small_world_metrics) {
            total_clustering += network.small_world_metrics.clustering_coefficient;
            clustering_count++;
          }
        }
      });

      const avg_connections = total_characters > 0 ? total_connections / total_characters : 0;
      const max_connections = total_characters * (total_characters - 1) / 2;
      const network_density = max_connections > 0 ? total_connections / max_connections : 0;
      const clustering_coefficient = clustering_count > 0 ? total_clustering / clustering_count : 0;

      // Genre-specific analysis
      let genre_specific: any = {};
      if (genre === 'shonen') {
        genre_specific = await this.analyzeShonenNetwork(storyId, characters);
      } else if (genre === 'shojo') {
        genre_specific = await this.analyzeShojoNetwork(storyId, characters);
      }

      // Small-world analysis
      const avg_path_length = this.estimateAveragePathLength(total_characters, avg_connections);
      const small_world_coefficient = this.calculateSmallWorldCoefficient(clustering_coefficient, avg_path_length);
      const is_small_world = small_world_coefficient > 1;

      // Generate recommendations
      if (genre === 'shonen' && network_density < 0.3) {
        recommendations.push('Increase network density to match typical Shōnen protagonist-centered patterns');
      }
      if (genre === 'shojo' && network_density > 0.5) {
        recommendations.push('Consider reducing network density to create more intimate Shōjo-style relationships');
      }
      if (!is_small_world) {
        recommendations.push('Network lacks small-world properties; add bridge connections between character groups');
      }
      if (clustering_coefficient < 0.4) {
        recommendations.push('Increase local clustering to create more cohesive character groups');
      }

      return {
        network_summary: {
          total_characters,
          avg_connections,
          network_density,
          clustering_coefficient,
        },
        genre_specific,
        small_world_properties: {
          is_small_world,
          avg_path_length,
          clustering_coefficient,
          small_world_coefficient,
        },
        recommendations,
      };
    } finally {
      await session.close();
    }
  }

  private async analyzeShonenNetwork(storyId: string, characters: any[]): Promise<any> {
    // Find protagonist
    const protagonist = characters.find(c => c.character.role === 'protagonist');

    if (!protagonist) {
      return {
        protagonist_found: false,
        recommendation: 'Ensure a clear protagonist is defined for Shōnen network analysis',
      };
    }

    const protagonistNetwork = characters.find(c => c.character.id === protagonist.character.id)?.network;

    let protagonist_centrality = 0;
    let avg_ally_cluster_size = 0;
    let rival_connection_strength = 0;

    if (protagonistNetwork?.shonen_properties) {
      protagonist_centrality = protagonistNetwork.shonen_properties.protagonist_centrality || 0;
      avg_ally_cluster_size = protagonistNetwork.shonen_properties.ally_cluster_size || 0;
      rival_connection_strength = protagonistNetwork.shonen_properties.rival_connection_strength || 0;
    }

    return {
      protagonist_found: true,
      protagonist_centrality,
      avg_ally_cluster_size,
      rival_connection_strength,
      growth_pattern: protagonistNetwork?.shonen_properties?.growth_pattern || 'linear',
      recommendations: this.getShonenRecommendations(protagonist_centrality, avg_ally_cluster_size),
    };
  }

  private async analyzeShojoNetwork(storyId: string, characters: any[]): Promise<any> {
    let total_intimacy = 0;
    let total_emotional_depth = 0;
    let romantic_triangles = 0;
    let count = 0;

    characters.forEach(({ network }) => {
      if (network?.shojo_properties) {
        total_intimacy += network.shojo_properties.intimacy_level || 0;
        total_emotional_depth += network.shojo_properties.emotional_depth || 0;
        if (network.shojo_properties.romantic_triangle_present) {
          romantic_triangles++;
        }
        count++;
      }
    });

    const avg_intimacy = count > 0 ? total_intimacy / count : 0;
    const avg_emotional_depth = count > 0 ? total_emotional_depth / count : 0;

    return {
      avg_intimacy_level: avg_intimacy,
      avg_emotional_depth: avg_emotional_depth,
      romantic_triangles_count: romantic_triangles,
      recommendations: this.getShojoRecommendations(avg_intimacy, avg_emotional_depth),
    };
  }

  private getShonenRecommendations(centrality: number, allyClusterSize: number): string[] {
    const recs: string[] = [];

    if (centrality < 0.6) {
      recs.push('Increase protagonist centrality to create stronger Shōnen network structure');
    }
    if (allyClusterSize < 3) {
      recs.push('Expand protagonist ally cluster to typical Shōnen team size (3-5 characters)');
    }

    return recs;
  }

  private getShojoRecommendations(intimacy: number, emotionalDepth: number): string[] {
    const recs: string[] = [];

    if (intimacy < 0.6) {
      recs.push('Increase relationship intimacy levels for more authentic Shōjo narrative');
    }
    if (emotionalDepth < 0.5) {
      recs.push('Develop deeper emotional relationships between characters');
    }

    return recs;
  }

  // =============================================================================
  // CENTRALITY CALCULATIONS
  // =============================================================================

  async calculateCentralityMetrics(characterId: string, storyId: string): Promise<{
    degree_centrality: number;
    betweenness_centrality: number;
    closeness_centrality: number;
    eigenvector_centrality: number;
    pagerank_score: number;
  }> {
    const session = this.driver.session();
    try {
      // Get all character connections in the story
      const result = await session.run(
        `
        MATCH (c1:Character {id: $characterId})-[r:APPEARS_IN|INFLUENCES|GROUPED_WITH]-(c2:Character)
        WHERE c1.id <> c2.id
        RETURN count(DISTINCT c2) as degree
        `,
        { characterId }
      );

      const degree = result.records[0]?.get('degree').toNumber() || 0;

      // Simple degree centrality (normalized by total characters - 1)
      const totalCharsResult = await session.run(
        `
        MATCH (c:Character)-[:APPEARS_IN]->(s:Scene)-[:BELONGS_TO*]->(story:Story {id: $storyId})
        RETURN count(DISTINCT c) as total
        `,
        { storyId }
      );

      const totalChars = totalCharsResult.records[0]?.get('total').toNumber() || 1;
      const degree_centrality = totalChars > 1 ? degree / (totalChars - 1) : 0;

      // Simplified betweenness (would need full graph traversal for accuracy)
      const betweenness_centrality = degree_centrality * 0.8;

      // Simplified closeness
      const closeness_centrality = degree_centrality * 0.9;

      // Simplified eigenvector (protagonist gets higher score)
      const charResult = await session.run(
        'MATCH (c:Character {id: $characterId}) RETURN c.role as role',
        { characterId }
      );
      const role = charResult.records[0]?.get('role') || 'supporting';
      const eigenvector_centrality = role === 'protagonist' ? degree_centrality * 1.2 : degree_centrality * 0.7;

      // Simplified PageRank
      const pagerank_score = eigenvector_centrality * 0.85;

      return {
        degree_centrality,
        betweenness_centrality: Math.min(betweenness_centrality, 1),
        closeness_centrality: Math.min(closeness_centrality, 1),
        eigenvector_centrality: Math.min(eigenvector_centrality, 1),
        pagerank_score: Math.min(pagerank_score, 1),
      };
    } finally {
      await session.close();
    }
  }

  async calculateSmallWorldMetrics(characterId: string, storyId: string): Promise<{
    clustering_coefficient: number;
    average_path_length: number;
    small_world_coefficient: number;
    bridge_connections: string[];
    local_clustering: number;
  }> {
    const session = this.driver.session();
    try {
      // Get character's neighbors
      const neighborsResult = await session.run(
        `
        MATCH (c:Character {id: $characterId})--(neighbor:Character)
        WHERE c.id <> neighbor.id
        RETURN collect(DISTINCT neighbor.id) as neighbors
        `,
        { characterId }
      );

      const neighbors: string[] = neighborsResult.records[0]?.get('neighbors') || [];

      if (neighbors.length < 2) {
        return {
          clustering_coefficient: 0,
          average_path_length: 0,
          small_world_coefficient: 0,
          bridge_connections: [],
          local_clustering: 0,
        };
      }

      // Calculate clustering coefficient
      let triangles = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const edgeResult = await session.run(
            `
            MATCH (n1:Character {id: $id1})--(n2:Character {id: $id2})
            RETURN count(*) as connected
            `,
            { id1: neighbors[i], id2: neighbors[j] }
          );
          if (edgeResult.records[0]?.get('connected').toNumber() > 0) {
            triangles++;
          }
        }
      }

      const possible_triangles = (neighbors.length * (neighbors.length - 1)) / 2;
      const clustering_coefficient = possible_triangles > 0 ? triangles / possible_triangles : 0;

      // Estimate average path length
      const average_path_length = this.estimateAveragePathLength(neighbors.length + 1, neighbors.length);

      const small_world_coefficient = this.calculateSmallWorldCoefficient(clustering_coefficient, average_path_length);

      return {
        clustering_coefficient,
        average_path_length,
        small_world_coefficient,
        bridge_connections: [], // Would need full graph analysis
        local_clustering: clustering_coefficient,
      };
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private estimateAveragePathLength(nodeCount: number, avgDegree: number): number {
    if (nodeCount <= 1 || avgDegree === 0) return 0;
    // Approximate using ln(N) / ln(k) for random graphs
    return Math.log(nodeCount) / Math.log(avgDegree || 1);
  }

  private calculateSmallWorldCoefficient(clustering: number, pathLength: number): number {
    if (pathLength === 0) return 0;
    // Small-world coefficient: high clustering, low path length
    return clustering / pathLength;
  }

  private parseCharacterNetworkNode(props: any): CharacterNetworkNode {
    return {
      id: props.id,
      story_id: props.story_id,
      genre: props.genre,
      character_id: props.character_id,
      shonen_properties: JSON.parse(props.shonen_properties || 'null'),
      shojo_properties: JSON.parse(props.shojo_properties || 'null'),
      small_world_metrics: JSON.parse(props.small_world_metrics || 'null'),
      topology_analysis: JSON.parse(props.topology_analysis || 'null'),
      connection_patterns: JSON.parse(props.connection_patterns || '[]'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }
}