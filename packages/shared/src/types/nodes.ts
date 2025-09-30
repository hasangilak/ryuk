import { z } from 'zod';

// =============================================================================
// BASE NODE TYPE
// =============================================================================

export const BaseNodeSchema = z.object({
  id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type BaseNode = z.infer<typeof BaseNodeSchema>;

// =============================================================================
// SCENE NODE
// =============================================================================

export const SceneNodeSchema = BaseNodeSchema.extend({
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  chapter: z.number().int().min(1),
  sequence: z.number().int().min(1),
  emotional_tone: z.string().max(100),
  panel_count: z.number().int().min(1).default(1),
  duration: z.number().int().min(1).default(30), // in seconds
});

export type SceneNode = z.infer<typeof SceneNodeSchema>;

// =============================================================================
// CHARACTER NODE
// =============================================================================

export const CharacterRoleSchema = z.enum(['protagonist', 'antagonist', 'supporting']);

export const CharacterNodeSchema = BaseNodeSchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().max(2000),
  visual_anchors: z.array(z.string()).default([]),
  role: CharacterRoleSchema,
  archetype: z.string().max(50),
  personality_traits: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  relationships: z.record(z.string(), z.string()).default({}),
  first_appearance: z.string().uuid().optional(),

  // Phase 2: Character Supernode Architecture
  connectivity_index: z.number().min(0).max(1).default(0),
  scene_appearances: z.array(z.string().uuid()).default([]),
  relationship_network: z.object({
    direct_connections: z.array(z.string().uuid()).default([]),
    indirect_connections: z.array(z.string().uuid()).default([]),
    antagonistic_relationships: z.array(z.string().uuid()).default([]),
    supportive_relationships: z.array(z.string().uuid()).default([]),
  }).default({}),
  narrative_impact: z.number().min(0).max(1).default(0),
  character_arc: z.object({
    development_stages: z.array(z.object({
      stage_name: z.string(),
      scene_id: z.string().uuid(),
      character_state: z.record(z.string(), z.any()),
    })).default([]),
    arc_completion: z.number().min(0).max(1).default(0),
    growth_trajectory: z.enum(['ascending', 'descending', 'flat', 'cyclical']).default('flat'),
  }).default({}),
  supernode_metadata: z.object({
    centrality_scores: z.record(z.string(), z.number()).default({}),
    influence_radius: z.number().min(0).default(0),
    narrative_threads: z.array(z.string()).default([]),
    viewpoint_access: z.boolean().default(false),
  }).default({}),
  character_state_history: z.array(z.object({
    node_id: z.string().uuid(),
    state_snapshot: z.record(z.string(), z.any()),
    timestamp: z.date(),
  })).default([]),
});

export type CharacterNode = z.infer<typeof CharacterNodeSchema>;
export type CharacterRole = z.infer<typeof CharacterRoleSchema>;

// =============================================================================
// CHOICE NODE
// =============================================================================

export const ChoiceNodeSchema = BaseNodeSchema.extend({
  text: z.string().min(1).max(500),
  consequence_preview: z.string().max(200).optional(),
  weight: z.number().min(0).max(1).default(0.5),
  requirements: z.array(z.string()).default([]),
  effects: z.record(z.string(), z.any()).default({}),

  // Phase 2: Enhanced Choice Architecture
  metadata: z.record(z.string(), z.any()).default({}),
  ui_presentation: z.object({
    display_style: z.string().optional(),
    icon: z.string().optional(),
    color_theme: z.string().optional(),
    animation: z.string().optional(),
    sound_effect: z.string().optional(),
  }).default({}),
  analytics_data: z.object({
    selection_count: z.number().int().min(0).default(0),
    avg_time_to_select: z.number().min(0).default(0),
    abandonment_rate: z.number().min(0).max(1).default(0),
    user_ratings: z.array(z.number().min(1).max(5)).default([]),
  }).default({}),
  conditional_logic: z.string().optional(),
  execution_context: z.record(z.string(), z.any()).default({}),
  choice_group_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),

  // Convergent paths support
  convergent_weight: z.number().min(0).max(1).default(1.0),
  path_history: z.array(z.string().uuid()).default([]),
  destination_scenes: z.array(z.string().uuid()).default([]),
});

export type ChoiceNode = z.infer<typeof ChoiceNodeSchema>;

// =============================================================================
// EVENT NODE
// =============================================================================

export const EventTypeSchema = z.enum(['plot', 'character', 'world']);

export const EventNodeSchema = BaseNodeSchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().max(2000),
  event_type: EventTypeSchema,
  causality_level: z.number().int().min(1).max(10).default(5),
  prerequisites: z.array(z.string().uuid()).default([]),
  consequences: z.array(z.string().uuid()).default([]),
  characters_involved: z.array(z.string().uuid()).default([]),
  narrative_time: z.number().int().min(0),
  story_time: z.date().optional(),
});

export type EventNode = z.infer<typeof EventNodeSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;

// =============================================================================
// LOCATION NODE
// =============================================================================

export const LocationTypeSchema = z.enum(['indoor', 'outdoor', 'abstract']);

export const LocationNodeSchema = BaseNodeSchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().max(2000),
  location_type: LocationTypeSchema,
  atmosphere: z.string().max(200),
  visual_style: z.string().max(200),
  accessibility: z.array(z.string().uuid()).default([]),
  connected_locations: z.array(z.string().uuid()).default([]),
  significance: z.string().max(100),
});

export type LocationNode = z.infer<typeof LocationNodeSchema>;
export type LocationType = z.infer<typeof LocationTypeSchema>;

// =============================================================================
// ITEM NODE
// =============================================================================

export const ItemNodeSchema = BaseNodeSchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().max(2000),
  item_type: z.string().max(50),
  properties: z.record(z.string(), z.any()).default({}),
  visual_description: z.string().max(500),
  ownership_rules: z.string().max(200),
  effects: z.record(z.string(), z.any()).default({}),
  significance: z.string().max(100),
  first_appearance: z.string().uuid().optional(),
});

export type ItemNode = z.infer<typeof ItemNodeSchema>;

// =============================================================================
// HIERARCHICAL CONTAINER NODES (Phase 2)
// =============================================================================

// STORY NODE - Top-level narrative container
export const StoryNodeSchema = BaseNodeSchema.extend({
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  genre: z.string().max(50),
  target_audience: z.string().max(50),
  total_knots: z.number().int().min(0).default(0),
  status: z.enum(['draft', 'in_progress', 'completed', 'published']).default('draft'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
  story_statistics: z.object({
    total_scenes: z.number().int().min(0).default(0),
    total_choices: z.number().int().min(0).default(0),
    estimated_reading_time: z.number().min(0).default(0),
    complexity_score: z.number().min(0).max(10).default(0),
  }).default({}),
});

export type StoryNode = z.infer<typeof StoryNodeSchema>;

// KNOT NODE - Chapter/Arc level container
export const KnotNodeSchema = BaseNodeSchema.extend({
  story_id: z.string().uuid(),
  number: z.number().int().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  total_stitches: z.number().int().min(0).default(0),
  narrative_purpose: z.string().max(100),
  prerequisites: z.array(z.string().uuid()).default([]),
  knot_metadata: z.record(z.string(), z.any()).default({}),
  progression_rules: z.object({
    can_skip: z.boolean().default(false),
    required_completion: z.boolean().default(true),
    min_choices_required: z.number().int().min(0).default(0),
  }).default({}),
});

export type KnotNode = z.infer<typeof KnotNodeSchema>;

// STITCH NODE - Scene group container
export const StitchNodeSchema = BaseNodeSchema.extend({
  knot_id: z.string().uuid(),
  number: z.number().int().min(1),
  narrative_purpose: z.string().max(100),
  content_summary: z.string().max(500),
  total_content_elements: z.number().int().min(0).default(0),
  stitch_type: z.enum(['linear', 'branching', 'convergent', 'parallel']).default('linear'),
  difficulty_level: z.number().min(1).max(10).default(5),
  estimated_duration: z.number().min(0).default(0),
  stitch_metadata: z.record(z.string(), z.any()).default({}),
  narrative_flags: z.array(z.string()).default([]),
});

export type StitchNode = z.infer<typeof StitchNodeSchema>;

// =============================================================================
// CONTENT ELEMENT NODE
// =============================================================================

export const ContentTypeSchema = z.enum(['text', 'image', 'audio', 'video', 'choice', 'interaction']);

export const ContentElementNodeSchema = BaseNodeSchema.extend({
  stitch_id: z.string().uuid(),
  content_type: ContentTypeSchema,
  sequence_order: z.number().int().min(1),
  content_data: z.record(z.string(), z.any()),
  rendering_hints: z.object({
    display_style: z.string().optional(),
    animation: z.string().optional(),
    positioning: z.string().optional(),
    timing: z.number().optional(),
    interactive: z.boolean().default(false),
  }).default({}),
  accessibility_options: z.object({
    alt_text: z.string().optional(),
    screen_reader_text: z.string().optional(),
    keyboard_navigation: z.boolean().default(true),
    high_contrast: z.boolean().default(false),
  }).default({}),
  content_metadata: z.object({
    file_size: z.number().optional(),
    duration: z.number().optional(),
    mime_type: z.string().optional(),
    version: z.string().default('1.0'),
    author: z.string().optional(),
    created_date: z.date().optional(),
  }).default({}),
  validation_rules: z.object({
    required: z.boolean().default(false),
    min_interaction_time: z.number().optional(),
    max_file_size: z.number().optional(),
    allowed_formats: z.array(z.string()).default([]),
  }).default({}),
});

export type ContentElementNode = z.infer<typeof ContentElementNodeSchema>;
export type ContentType = z.infer<typeof ContentTypeSchema>;

// =============================================================================
// UNION TYPES
// =============================================================================

export type AnyNode = SceneNode | CharacterNode | ChoiceNode | EventNode | LocationNode | ItemNode |
                    StoryNode | KnotNode | StitchNode | ContentElementNode |
                    KiNode | ShoNode | TenNode | KetsuNode | JoHaKyuNode | PanelTransitionNode | CharacterNetworkNode;

export const NodeTypeSchema = z.enum(['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item',
                                     'Story', 'Knot', 'Stitch', 'ContentElement',
                                     'Ki', 'Sho', 'Ten', 'Ketsu', 'JoHaKyu', 'PanelTransition', 'CharacterNetwork']);
export type NodeType = z.infer<typeof NodeTypeSchema>;

// =============================================================================
// NODE CREATION TYPES (without auto-generated fields)
// =============================================================================

export type CreateSceneNode = Omit<SceneNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateCharacterNode = Omit<CharacterNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateChoiceNode = Omit<ChoiceNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateEventNode = Omit<EventNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateLocationNode = Omit<LocationNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateItemNode = Omit<ItemNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateStoryNode = Omit<StoryNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateKnotNode = Omit<KnotNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateStitchNode = Omit<StitchNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateContentElementNode = Omit<ContentElementNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateKiNode = Omit<KiNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateShoNode = Omit<ShoNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateTenNode = Omit<TenNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateKetsuNode = Omit<KetsuNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateJoHaKyuNode = Omit<JoHaKyuNode, 'id' | 'created_at' | 'updated_at'>;
export type CreatePanelTransitionNode = Omit<PanelTransitionNode, 'id' | 'created_at' | 'updated_at'>;
export type CreateCharacterNetworkNode = Omit<CharacterNetworkNode, 'id' | 'created_at' | 'updated_at'>;

export type CreateAnyNode = CreateSceneNode | CreateCharacterNode | CreateChoiceNode |
                          CreateEventNode | CreateLocationNode | CreateItemNode |
                          CreateStoryNode | CreateKnotNode | CreateStitchNode | CreateContentElementNode |
                          CreateKiNode | CreateShoNode | CreateTenNode | CreateKetsuNode |
                          CreateJoHaKyuNode | CreatePanelTransitionNode | CreateCharacterNetworkNode;

// =============================================================================
// UPDATE TYPES (all fields optional except id)
// =============================================================================

export type UpdateSceneNode = Partial<Omit<SceneNode, 'id' | 'created_at'>> & { id: string };
export type UpdateCharacterNode = Partial<Omit<CharacterNode, 'id' | 'created_at'>> & { id: string };
export type UpdateChoiceNode = Partial<Omit<ChoiceNode, 'id' | 'created_at'>> & { id: string };
export type UpdateEventNode = Partial<Omit<EventNode, 'id' | 'created_at'>> & { id: string };
export type UpdateLocationNode = Partial<Omit<LocationNode, 'id' | 'created_at'>> & { id: string };
export type UpdateItemNode = Partial<Omit<ItemNode, 'id' | 'created_at'>> & { id: string };
export type UpdateStoryNode = Partial<Omit<StoryNode, 'id' | 'created_at'>> & { id: string };
export type UpdateKnotNode = Partial<Omit<KnotNode, 'id' | 'created_at'>> & { id: string };
export type UpdateStitchNode = Partial<Omit<StitchNode, 'id' | 'created_at'>> & { id: string };
export type UpdateContentElementNode = Partial<Omit<ContentElementNode, 'id' | 'created_at'>> & { id: string };
export type UpdateKiNode = Partial<Omit<KiNode, 'id' | 'created_at'>> & { id: string };
export type UpdateShoNode = Partial<Omit<ShoNode, 'id' | 'created_at'>> & { id: string };
export type UpdateTenNode = Partial<Omit<TenNode, 'id' | 'created_at'>> & { id: string };
export type UpdateKetsuNode = Partial<Omit<KetsuNode, 'id' | 'created_at'>> & { id: string };
export type UpdateJoHaKyuNode = Partial<Omit<JoHaKyuNode, 'id' | 'created_at'>> & { id: string };
export type UpdatePanelTransitionNode = Partial<Omit<PanelTransitionNode, 'id' | 'created_at'>> & { id: string };
export type UpdateCharacterNetworkNode = Partial<Omit<CharacterNetworkNode, 'id' | 'created_at'>> & { id: string };

export type UpdateAnyNode = UpdateSceneNode | UpdateCharacterNode | UpdateChoiceNode |
                          UpdateEventNode | UpdateLocationNode | UpdateItemNode |
                          UpdateStoryNode | UpdateKnotNode | UpdateStitchNode | UpdateContentElementNode |
                          UpdateKiNode | UpdateShoNode | UpdateTenNode | UpdateKetsuNode |
                          UpdateJoHaKyuNode | UpdatePanelTransitionNode | UpdateCharacterNetworkNode;

// =============================================================================
// PHASE 3: MANGA NARRATIVE STRUCTURES
// =============================================================================

// -----------------------------------------------------------------------------
// KISHŌTENKETSU STRUCTURE NODES
// -----------------------------------------------------------------------------

// KI NODE - Introduction phase
export const KiTypeSchema = z.enum(['character', 'setting', 'mood', 'concept', 'relationship']);

export const KiNodeSchema = BaseNodeSchema.extend({
  story_id: z.string().uuid(),
  knot_id: z.string().uuid().optional(),
  ki_type: KiTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  establishment_elements: z.array(z.object({
    element_name: z.string(),
    element_type: z.string(),
    importance_level: z.number().min(0).max(1),
    reference_id: z.string().uuid().optional(),
  })).default([]),
  pacing_weight: z.number().min(0).max(1).default(0.5),
  setup_completeness: z.number().min(0).max(1).default(0),
  transition_indicators: z.array(z.object({
    indicator_type: z.string(),
    indicator_strength: z.number().min(0).max(1),
    target_phase: z.string(),
  })).default([]),
  narrative_foundation: z.object({
    core_elements: z.array(z.string()).default([]),
    atmosphere_established: z.boolean().default(false),
    character_presence: z.array(z.string().uuid()).default([]),
    location_context: z.string().uuid().optional(),
  }).default({}),
});

export type KiNode = z.infer<typeof KiNodeSchema>;
export type KiType = z.infer<typeof KiTypeSchema>;

// SHŌ NODE - Development phase
export const ShoDevelopmentTypeSchema = z.enum(['character', 'situation', 'relationship', 'conflict', 'exploration']);

export const ShoNodeSchema = BaseNodeSchema.extend({
  story_id: z.string().uuid(),
  knot_id: z.string().uuid().optional(),
  ki_reference: z.string().uuid(),
  development_type: ShoDevelopmentTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  complexity_level: z.number().int().min(1).max(10).default(5),
  interaction_patterns: z.array(z.object({
    pattern_type: z.string(),
    characters_involved: z.array(z.string().uuid()),
    intensity: z.number().min(0).max(1),
  })).default([]),
  tension_buildup: z.number().min(0).max(1).default(0),
  revelation_seeds: z.array(z.object({
    seed_id: z.string().uuid(),
    seed_type: z.string(),
    planted_element: z.string(),
    foreshadowing_strength: z.number().min(0).max(1),
    ten_reference: z.string().uuid().optional(),
  })).default([]),
  situation_development: z.object({
    development_trajectory: z.enum(['rising', 'stable', 'fluctuating']).default('rising'),
    complications_introduced: z.array(z.string()).default([]),
    narrative_threads: z.array(z.string().uuid()).default([]),
  }).default({}),
});

export type ShoNode = z.infer<typeof ShoNodeSchema>;
export type ShoDevelopmentType = z.infer<typeof ShoDevelopmentTypeSchema>;

// TEN NODE - Twist/Turn phase
export const TenTwistTypeSchema = z.enum(['character_revelation', 'plot_twist', 'setting_shift',
                                          'perception_change', 'timeline_reveal', 'identity_reveal']);

export const TenRelevationScopeSchema = z.enum(['local', 'chapter', 'arc', 'global']);

export const TenNodeSchema = BaseNodeSchema.extend({
  story_id: z.string().uuid(),
  knot_id: z.string().uuid().optional(),
  sho_reference: z.string().uuid(),
  twist_type: TenTwistTypeSchema,
  revelation_scope: TenRelevationScopeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  recontextualization_targets: z.array(z.object({
    target_id: z.string().uuid(),
    target_type: z.string(),
    meaning_before: z.string(),
    meaning_after: z.string(),
    impact_strength: z.number().min(0).max(1),
  })).default([]),
  surprise_factor: z.number().min(0).max(1).default(0.5),
  setup_validation: z.array(z.object({
    required_element: z.string(),
    element_id: z.string().uuid().optional(),
    setup_adequacy: z.number().min(0).max(1),
  })).default([]),
  twist_mechanics: z.object({
    revelation_method: z.string(),
    timing_optimization: z.number().min(0).max(1),
    reader_impact_prediction: z.number().min(0).max(1),
    narrative_coherence: z.number().min(0).max(1),
  }).optional(),
  propagation_data: z.object({
    affected_nodes: z.array(z.string().uuid()).default([]),
    semantic_changes: z.array(z.record(z.string(), z.any())).default([]),
    cascade_depth: z.number().int().min(0).default(0),
  }).default({}),
});

export type TenNode = z.infer<typeof TenNodeSchema>;
export type TenTwistType = z.infer<typeof TenTwistTypeSchema>;
export type TenRelevationScope = z.infer<typeof TenRelevationScopeSchema>;

// KETSU NODE - Conclusion phase
export const KetsuResolutionTypeSchema = z.enum(['complete', 'partial', 'open', 'cyclical']);

export const KetsuNodeSchema = BaseNodeSchema.extend({
  story_id: z.string().uuid(),
  knot_id: z.string().uuid().optional(),
  ten_reference: z.string().uuid(),
  resolution_type: KetsuResolutionTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  incorporation_elements: z.array(z.object({
    element_name: z.string(),
    twist_element_id: z.string().uuid(),
    incorporation_method: z.string(),
    resolution_quality: z.number().min(0).max(1),
  })).default([]),
  closure_level: z.number().min(0).max(1).default(0.5),
  new_understanding: z.string().max(2000),
  thematic_completion: z.array(z.object({
    theme_name: z.string(),
    theme_id: z.string().uuid().optional(),
    completion_status: z.enum(['resolved', 'evolved', 'ongoing']),
    thematic_resonance: z.number().min(0).max(1),
  })).default([]),
  kishōtenketsu_validation: z.object({
    cycle_completeness: z.number().min(0).max(1),
    ki_integration: z.boolean().default(false),
    sho_integration: z.boolean().default(false),
    ten_integration: z.boolean().default(false),
    structural_integrity: z.number().min(0).max(1),
  }).optional(),
});

export type KetsuNode = z.infer<typeof KetsuNodeSchema>;
export type KetsuResolutionType = z.infer<typeof KetsuResolutionTypeSchema>;

// -----------------------------------------------------------------------------
// JO-HA-KYŪ PACING SYSTEM
// -----------------------------------------------------------------------------

export const JoHaKyuPhaseSchema = z.enum(['jo', 'ha', 'kyu']);
export const TemporalScaleSchema = z.enum(['panel', 'scene', 'stitch', 'chapter', 'arc', 'story']);

export const JoHaKyuNodeSchema = BaseNodeSchema.extend({
  story_id: z.string().uuid(),
  parent_node_id: z.string().uuid().optional(),
  temporal_scale: TemporalScaleSchema,
  phase: JoHaKyuPhaseSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  pacing_intensity: z.number().min(0).max(1).default(0.5),
  rhythm_pattern: z.array(z.object({
    beat_number: z.number().int().min(1),
    intensity: z.number().min(0).max(1),
    duration: z.number().min(0),
    emotional_tone: z.string().optional(),
  })).default([]),
  parent_scale_reference: z.string().uuid().optional(),
  child_scales: z.array(z.string().uuid()).default([]),
  fractal_coordination: z.object({
    parent_phase_alignment: z.number().min(0).max(1),
    child_phases_coherence: z.number().min(0).max(1),
    cross_scale_harmony: z.number().min(0).max(1),
  }).optional(),
  phase_characteristics: z.object({
    jo_properties: z.object({
      buildup_rate: z.number().min(0).max(1),
      establishment_depth: z.number().min(0).max(1),
      preparation_quality: z.number().min(0).max(1),
    }).optional(),
    ha_properties: z.object({
      acceleration_rate: z.number().min(0).max(1),
      complication_density: z.number().min(0).max(1),
      momentum_score: z.number().min(0).max(1),
    }).optional(),
    kyu_properties: z.object({
      resolution_speed: z.number().min(0).max(1),
      climax_impact: z.number().min(0).max(1),
      conclusion_satisfaction: z.number().min(0).max(1),
    }).optional(),
  }).default({}),
  transition_markers: z.array(z.object({
    from_phase: JoHaKyuPhaseSchema,
    to_phase: JoHaKyuPhaseSchema,
    transition_quality: z.number().min(0).max(1),
    marker_node_id: z.string().uuid().optional(),
  })).default([]),
});

export type JoHaKyuNode = z.infer<typeof JoHaKyuNodeSchema>;
export type JoHaKyuPhase = z.infer<typeof JoHaKyuPhaseSchema>;
export type TemporalScale = z.infer<typeof TemporalScaleSchema>;

// -----------------------------------------------------------------------------
// PANEL TRANSITION SYSTEM
// -----------------------------------------------------------------------------

export const PanelTransitionTypeSchema = z.enum([
  'moment_to_moment',
  'action_to_action',
  'subject_to_subject',
  'scene_to_scene',
  'aspect_to_aspect',
  'non_sequitur'
]);

export const TransitionTemporalRelationshipSchema = z.enum([
  'simultaneous',
  'sequential',
  'flashback',
  'flash_forward',
  'parallel',
  'cyclical'
]);

export const PanelTransitionNodeSchema = BaseNodeSchema.extend({
  from_content_id: z.string().uuid(),
  to_content_id: z.string().uuid(),
  transition_type: PanelTransitionTypeSchema,
  transition_strength: z.number().min(0).max(1).default(0.5),
  visual_continuity: z.number().min(0).max(1).default(0.5),
  temporal_relationship: TransitionTemporalRelationshipSchema,
  narrative_purpose: z.enum(['pacing', 'atmosphere', 'revelation', 'action', 'emotion', 'time_passage']),

  // Aspect-to-aspect specific properties
  aspect_exploration: z.object({
    aspect_type: z.enum(['mood', 'atmosphere', 'sensory', 'emotional', 'thematic']).optional(),
    exploration_depth: z.number().min(0).max(1).optional(),
    mood_coherence: z.number().min(0).max(1).optional(),
    atmospheric_elements: z.array(z.string()).default([]),
    sensory_focus: z.array(z.object({
      sense: z.enum(['visual', 'auditory', 'tactile', 'olfactory', 'gustatory']),
      intensity: z.number().min(0).max(1),
      descriptive_element: z.string(),
    })).default([]),
  }).optional(),

  transition_metadata: z.object({
    gutter_size: z.enum(['small', 'medium', 'large', 'variable']).default('medium'),
    reader_inference_required: z.number().min(0).max(1).default(0.5),
    cognitive_load: z.number().min(0).max(1).default(0.5),
    emotional_impact: z.number().min(0).max(1).default(0.5),
  }).default({}),

  validation_data: z.object({
    transition_appropriateness: z.number().min(0).max(1),
    narrative_flow_quality: z.number().min(0).max(1),
    reader_comprehension_prediction: z.number().min(0).max(1),
  }).optional(),
});

export type PanelTransitionNode = z.infer<typeof PanelTransitionNodeSchema>;
export type PanelTransitionType = z.infer<typeof PanelTransitionTypeSchema>;
export type TransitionTemporalRelationship = z.infer<typeof TransitionTemporalRelationshipSchema>;

// -----------------------------------------------------------------------------
// CHARACTER NETWORK TOPOLOGY (MANGA GENRE PATTERNS)
// -----------------------------------------------------------------------------

export const MangaGenreSchema = z.enum(['shonen', 'shojo', 'seinen', 'josei', 'kodomo']);

export const CharacterNetworkNodeSchema = BaseNodeSchema.extend({
  story_id: z.string().uuid(),
  genre: MangaGenreSchema,
  character_id: z.string().uuid(),

  // Shōnen network properties
  shonen_properties: z.object({
    protagonist_centrality: z.number().min(0).max(1).optional(),
    network_density: z.number().min(0).max(1).optional(),
    growth_pattern: z.enum(['linear', 'exponential', 'plateau', 'spiral']).optional(),
    ally_cluster_size: z.number().int().min(0).optional(),
    rival_connection_strength: z.number().min(0).max(1).optional(),
    team_formation_stage: z.enum(['solo', 'forming', 'storming', 'norming', 'performing']).optional(),
  }).optional(),

  // Shōjo network properties
  shojo_properties: z.object({
    intimacy_level: z.number().min(0).max(1).optional(),
    network_sparsity: z.number().min(0).max(1).optional(),
    emotional_depth: z.number().min(0).max(1).optional(),
    confidant_centrality: z.number().min(0).max(1).optional(),
    romantic_triangle_present: z.boolean().optional(),
    relationship_complexity: z.number().min(0).max(1).optional(),
  }).optional(),

  // Small-world network properties
  small_world_metrics: z.object({
    clustering_coefficient: z.number().min(0).max(1),
    average_path_length: z.number().min(0),
    small_world_coefficient: z.number().min(0),
    bridge_connections: z.array(z.string().uuid()).default([]),
    local_clustering: z.number().min(0).max(1),
  }).optional(),

  // Network analysis data
  topology_analysis: z.object({
    degree_centrality: z.number().min(0).max(1),
    betweenness_centrality: z.number().min(0).max(1),
    closeness_centrality: z.number().min(0).max(1),
    eigenvector_centrality: z.number().min(0).max(1),
    pagerank_score: z.number().min(0).max(1),
  }).optional(),

  connection_patterns: z.array(z.object({
    pattern_type: z.string(),
    connected_character_id: z.string().uuid(),
    connection_strength: z.number().min(0).max(1),
    relationship_nature: z.string(),
    narrative_significance: z.number().min(0).max(1),
  })).default([]),
});

export type CharacterNetworkNode = z.infer<typeof CharacterNetworkNodeSchema>;
export type MangaGenre = z.infer<typeof MangaGenreSchema>;

