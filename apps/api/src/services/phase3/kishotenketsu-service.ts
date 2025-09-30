import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  KiNode,
  ShoNode,
  TenNode,
  KetsuNode,
  CreateKiNode,
  CreateShoNode,
  CreateTenNode,
  CreateKetsuNode,
  UpdateKiNode,
  UpdateShoNode,
  UpdateTenNode,
  UpdateKetsuNode,
} from '@ryuk/shared';

export class KishotenketsuService {
  constructor(private driver: Driver) {}

  // =============================================================================
  // KI NODE OPERATIONS
  // =============================================================================

  async createKiNode(data: CreateKiNode): Promise<KiNode> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        CREATE (k:Ki {
          id: $id,
          story_id: $story_id,
          knot_id: $knot_id,
          ki_type: $ki_type,
          title: $title,
          description: $description,
          establishment_elements: $establishment_elements,
          pacing_weight: $pacing_weight,
          setup_completeness: $setup_completeness,
          transition_indicators: $transition_indicators,
          narrative_foundation: $narrative_foundation,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN k
        `,
        {
          id,
          story_id: data.story_id,
          knot_id: data.knot_id || null,
          ki_type: data.ki_type,
          title: data.title,
          description: data.description,
          establishment_elements: JSON.stringify(data.establishment_elements || []),
          pacing_weight: data.pacing_weight || 0.5,
          setup_completeness: data.setup_completeness || 0,
          transition_indicators: JSON.stringify(data.transition_indicators || []),
          narrative_foundation: JSON.stringify(data.narrative_foundation || {}),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      const node = result.records[0]?.get('k').properties;
      return this.parseKiNode(node);
    } finally {
      await session.close();
    }
  }

  async getKiNode(id: string): Promise<KiNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (k:Ki {id: $id}) RETURN k',
        { id }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('k').properties;
      return this.parseKiNode(node);
    } finally {
      await session.close();
    }
  }

  async updateKiNode(id: string, updates: Partial<UpdateKiNode>): Promise<KiNode> {
    const session = this.driver.session();
    try {
      const setClauses: string[] = [];
      const params: Record<string, any> = { id, updated_at: new Date().toISOString() };

      // Build dynamic SET clauses
      const updateableFields = [
        'title', 'description', 'ki_type', 'pacing_weight', 'setup_completeness'
      ];

      updateableFields.forEach(field => {
        if (updates[field as keyof UpdateKiNode] !== undefined) {
          setClauses.push(`k.${field} = $${field}`);
          params[field] = updates[field as keyof UpdateKiNode];
        }
      });

      // Handle JSON fields
      if (updates.establishment_elements) {
        setClauses.push('k.establishment_elements = $establishment_elements');
        params.establishment_elements = JSON.stringify(updates.establishment_elements);
      }
      if (updates.transition_indicators) {
        setClauses.push('k.transition_indicators = $transition_indicators');
        params.transition_indicators = JSON.stringify(updates.transition_indicators);
      }
      if (updates.narrative_foundation) {
        setClauses.push('k.narrative_foundation = $narrative_foundation');
        params.narrative_foundation = JSON.stringify(updates.narrative_foundation);
      }

      setClauses.push('k.updated_at = datetime($updated_at)');

      const query = `
        MATCH (k:Ki {id: $id})
        SET ${setClauses.join(', ')}
        RETURN k
      `;

      const result = await session.run(query, params);
      const node = result.records[0]?.get('k').properties;
      return this.parseKiNode(node);
    } finally {
      await session.close();
    }
  }

  async deleteKiNode(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('MATCH (k:Ki {id: $id}) DETACH DELETE k', { id });
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // SHŌ NODE OPERATIONS
  // =============================================================================

  async createShoNode(data: CreateShoNode): Promise<ShoNode> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        CREATE (s:Sho {
          id: $id,
          story_id: $story_id,
          knot_id: $knot_id,
          ki_reference: $ki_reference,
          development_type: $development_type,
          title: $title,
          description: $description,
          complexity_level: $complexity_level,
          interaction_patterns: $interaction_patterns,
          tension_buildup: $tension_buildup,
          revelation_seeds: $revelation_seeds,
          situation_development: $situation_development,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN s
        `,
        {
          id,
          story_id: data.story_id,
          knot_id: data.knot_id || null,
          ki_reference: data.ki_reference,
          development_type: data.development_type,
          title: data.title,
          description: data.description,
          complexity_level: data.complexity_level || 5,
          interaction_patterns: JSON.stringify(data.interaction_patterns || []),
          tension_buildup: data.tension_buildup || 0,
          revelation_seeds: JSON.stringify(data.revelation_seeds || []),
          situation_development: JSON.stringify(data.situation_development || {}),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      const node = result.records[0]?.get('s').properties;
      return this.parseShoNode(node);
    } finally {
      await session.close();
    }
  }

  async getShoNode(id: string): Promise<ShoNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (s:Sho {id: $id}) RETURN s',
        { id }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('s').properties;
      return this.parseShoNode(node);
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // TEN NODE OPERATIONS
  // =============================================================================

  async createTenNode(data: CreateTenNode): Promise<TenNode> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        CREATE (t:Ten {
          id: $id,
          story_id: $story_id,
          knot_id: $knot_id,
          sho_reference: $sho_reference,
          twist_type: $twist_type,
          revelation_scope: $revelation_scope,
          title: $title,
          description: $description,
          recontextualization_targets: $recontextualization_targets,
          surprise_factor: $surprise_factor,
          setup_validation: $setup_validation,
          twist_mechanics: $twist_mechanics,
          propagation_data: $propagation_data,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN t
        `,
        {
          id,
          story_id: data.story_id,
          knot_id: data.knot_id || null,
          sho_reference: data.sho_reference,
          twist_type: data.twist_type,
          revelation_scope: data.revelation_scope,
          title: data.title,
          description: data.description,
          recontextualization_targets: JSON.stringify(data.recontextualization_targets || []),
          surprise_factor: data.surprise_factor || 0.5,
          setup_validation: JSON.stringify(data.setup_validation || []),
          twist_mechanics: JSON.stringify(data.twist_mechanics || null),
          propagation_data: JSON.stringify(data.propagation_data || {}),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      const node = result.records[0]?.get('t').properties;
      return this.parseTenNode(node);
    } finally {
      await session.close();
    }
  }

  async getTenNode(id: string): Promise<TenNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (t:Ten {id: $id}) RETURN t',
        { id }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('t').properties;
      return this.parseTenNode(node);
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // KETSU NODE OPERATIONS
  // =============================================================================

  async createKetsuNode(data: CreateKetsuNode): Promise<KetsuNode> {
    const session = this.driver.session();
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `
        CREATE (k:Ketsu {
          id: $id,
          story_id: $story_id,
          knot_id: $knot_id,
          ten_reference: $ten_reference,
          resolution_type: $resolution_type,
          title: $title,
          description: $description,
          incorporation_elements: $incorporation_elements,
          closure_level: $closure_level,
          new_understanding: $new_understanding,
          thematic_completion: $thematic_completion,
          kishotenketsu_validation: $kishotenketsu_validation,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN k
        `,
        {
          id,
          story_id: data.story_id,
          knot_id: data.knot_id || null,
          ten_reference: data.ten_reference,
          resolution_type: data.resolution_type,
          title: data.title,
          description: data.description,
          incorporation_elements: JSON.stringify(data.incorporation_elements || []),
          closure_level: data.closure_level || 0.5,
          new_understanding: data.new_understanding,
          thematic_completion: JSON.stringify(data.thematic_completion || []),
          kishotenketsu_validation: JSON.stringify(data.kishōtenketsu_validation || null),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      const node = result.records[0]?.get('k').properties;
      return this.parseKetsuNode(node);
    } finally {
      await session.close();
    }
  }

  async getKetsuNode(id: string): Promise<KetsuNode | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (k:Ketsu {id: $id}) RETURN k',
        { id }
      );

      if (result.records.length === 0) return null;

      const node = result.records[0].get('k').properties;
      return this.parseKetsuNode(node);
    } finally {
      await session.close();
    }
  }

  // =============================================================================
  // KISHŌTENKETSU CYCLE OPERATIONS
  // =============================================================================

  async getKishotenketsuCycle(storyId: string): Promise<{
    ki: KiNode[];
    sho: ShoNode[];
    ten: TenNode[];
    ketsu: KetsuNode[];
  }> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (ki:Ki {story_id: $storyId})
        OPTIONAL MATCH (sho:Sho {story_id: $storyId})
        OPTIONAL MATCH (ten:Ten {story_id: $storyId})
        OPTIONAL MATCH (ketsu:Ketsu {story_id: $storyId})
        RETURN
          collect(DISTINCT ki) as ki_nodes,
          collect(DISTINCT sho) as sho_nodes,
          collect(DISTINCT ten) as ten_nodes,
          collect(DISTINCT ketsu) as ketsu_nodes
        `,
        { storyId }
      );

      const record = result.records[0];

      return {
        ki: record.get('ki_nodes').map((n: any) => this.parseKiNode(n.properties)),
        sho: record.get('sho_nodes').map((n: any) => this.parseShoNode(n.properties)),
        ten: record.get('ten_nodes').map((n: any) => this.parseTenNode(n.properties)),
        ketsu: record.get('ketsu_nodes').map((n: any) => this.parseKetsuNode(n.properties)),
      };
    } finally {
      await session.close();
    }
  }

  async validateKishotenketsuStructure(storyId: string): Promise<{
    valid: boolean;
    completeness: number;
    issues: string[];
    recommendations: string[];
  }> {
    const cycle = await this.getKishotenketsuCycle(storyId);
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for presence of all phases
    if (cycle.ki.length === 0) issues.push('Missing Ki (Introduction) phase');
    if (cycle.sho.length === 0) issues.push('Missing Shō (Development) phase');
    if (cycle.ten.length === 0) issues.push('Missing Ten (Twist) phase');
    if (cycle.ketsu.length === 0) issues.push('Missing Ketsu (Conclusion) phase');

    // Calculate completeness
    const phasePresence = [
      cycle.ki.length > 0,
      cycle.sho.length > 0,
      cycle.ten.length > 0,
      cycle.ketsu.length > 0,
    ].filter(Boolean).length;

    const completeness = phasePresence / 4;

    // Check Ki setup completeness
    if (cycle.ki.length > 0) {
      const avgSetupCompleteness = cycle.ki.reduce((sum, k) => sum + k.setup_completeness, 0) / cycle.ki.length;
      if (avgSetupCompleteness < 0.7) {
        recommendations.push('Increase Ki phase setup completeness to at least 0.7');
      }
    }

    // Check Shō-Ten connection
    if (cycle.sho.length > 0 && cycle.ten.length > 0) {
      const shoHasSeeds = cycle.sho.some(s => s.revelation_seeds.length > 0);
      if (!shoHasSeeds) {
        recommendations.push('Add revelation seeds in Shō phase to foreshadow Ten twist');
      }
    }

    // Check Ten-Ketsu integration
    if (cycle.ketsu.length > 0) {
      const ketsuWithValidation = cycle.ketsu.filter(k => k.kishōtenketsu_validation);
      if (ketsuWithValidation.length === 0) {
        recommendations.push('Add Kishōtenketsu validation data to Ketsu nodes');
      }
    }

    return {
      valid: issues.length === 0,
      completeness,
      issues,
      recommendations,
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private parseKiNode(props: any): KiNode {
    return {
      id: props.id,
      story_id: props.story_id,
      knot_id: props.knot_id,
      ki_type: props.ki_type,
      title: props.title,
      description: props.description,
      establishment_elements: JSON.parse(props.establishment_elements || '[]'),
      pacing_weight: props.pacing_weight,
      setup_completeness: props.setup_completeness,
      transition_indicators: JSON.parse(props.transition_indicators || '[]'),
      narrative_foundation: JSON.parse(props.narrative_foundation || '{}'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }

  private parseShoNode(props: any): ShoNode {
    return {
      id: props.id,
      story_id: props.story_id,
      knot_id: props.knot_id,
      ki_reference: props.ki_reference,
      development_type: props.development_type,
      title: props.title,
      description: props.description,
      complexity_level: props.complexity_level,
      interaction_patterns: JSON.parse(props.interaction_patterns || '[]'),
      tension_buildup: props.tension_buildup,
      revelation_seeds: JSON.parse(props.revelation_seeds || '[]'),
      situation_development: JSON.parse(props.situation_development || '{}'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }

  private parseTenNode(props: any): TenNode {
    return {
      id: props.id,
      story_id: props.story_id,
      knot_id: props.knot_id,
      sho_reference: props.sho_reference,
      twist_type: props.twist_type,
      revelation_scope: props.revelation_scope,
      title: props.title,
      description: props.description,
      recontextualization_targets: JSON.parse(props.recontextualization_targets || '[]'),
      surprise_factor: props.surprise_factor,
      setup_validation: JSON.parse(props.setup_validation || '[]'),
      twist_mechanics: JSON.parse(props.twist_mechanics || 'null'),
      propagation_data: JSON.parse(props.propagation_data || '{}'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }

  private parseKetsuNode(props: any): KetsuNode {
    return {
      id: props.id,
      story_id: props.story_id,
      knot_id: props.knot_id,
      ten_reference: props.ten_reference,
      resolution_type: props.resolution_type,
      title: props.title,
      description: props.description,
      incorporation_elements: JSON.parse(props.incorporation_elements || '[]'),
      closure_level: props.closure_level,
      new_understanding: props.new_understanding,
      thematic_completion: JSON.parse(props.thematic_completion || '[]'),
      kishōtenketsu_validation: JSON.parse(props.kishotenketsu_validation || 'null'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }
}