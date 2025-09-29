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
                    StoryNode | KnotNode | StitchNode | ContentElementNode;

export const NodeTypeSchema = z.enum(['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item',
                                     'Story', 'Knot', 'Stitch', 'ContentElement']);
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

export type CreateAnyNode = CreateSceneNode | CreateCharacterNode | CreateChoiceNode |
                          CreateEventNode | CreateLocationNode | CreateItemNode |
                          CreateStoryNode | CreateKnotNode | CreateStitchNode | CreateContentElementNode;

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

export type UpdateAnyNode = UpdateSceneNode | UpdateCharacterNode | UpdateChoiceNode |
                          UpdateEventNode | UpdateLocationNode | UpdateItemNode |
                          UpdateStoryNode | UpdateKnotNode | UpdateStitchNode | UpdateContentElementNode;

