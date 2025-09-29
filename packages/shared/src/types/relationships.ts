import { z } from 'zod';

// =============================================================================
// BASE RELATIONSHIP TYPE
// =============================================================================

export const BaseRelationshipSchema = z.object({
  id: z.string().uuid(),
  from_node: z.string().uuid(),
  to_node: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type BaseRelationship = z.infer<typeof BaseRelationshipSchema>;

// =============================================================================
// LEADS_TO RELATIONSHIP
// =============================================================================

export const TransitionTypeSchema = z.enum(['sequential', 'choice', 'conditional', 'random']);

export const LeadsToRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('LEADS_TO'),
  transition_type: TransitionTypeSchema,
  weight: z.number().min(0).max(1).default(1.0),
  probability: z.number().min(0).max(1).default(1.0),
  conditions: z.array(z.string()).default([]),
});

export type LeadsToRelationship = z.infer<typeof LeadsToRelationshipSchema>;
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

// =============================================================================
// APPEARS_IN RELATIONSHIP
// =============================================================================

export const AppearsInRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('APPEARS_IN'),
  role_in_scene: z.string().max(50),
  screen_time: z.number().min(0).max(1).default(0.5),
  dialogue_count: z.number().int().min(0).default(0),
  importance: z.number().min(0).max(1).default(0.5),
});

export type AppearsInRelationship = z.infer<typeof AppearsInRelationshipSchema>;

// =============================================================================
// TRIGGERS RELATIONSHIP
// =============================================================================

export const TriggersRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('TRIGGERS'),
  causality_strength: z.number().min(0).max(1).default(0.5),
  delay: z.number().int().min(0).default(0), // in narrative time units
  conditions: z.array(z.string()).default([]),
  probability: z.number().min(0).max(1).default(1.0),
});

export type TriggersRelationship = z.infer<typeof TriggersRelationshipSchema>;

// =============================================================================
// REQUIRES RELATIONSHIP
// =============================================================================

export const RequirementTypeSchema = z.enum(['prerequisite', 'dependency', 'condition']);

export const RequiresRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('REQUIRES'),
  requirement_type: RequirementTypeSchema,
  strength: z.number().min(0).max(1).default(1.0),
  optional: z.boolean().default(false),
  description: z.string().max(200).optional(),
});

export type RequiresRelationship = z.infer<typeof RequiresRelationshipSchema>;
export type RequirementType = z.infer<typeof RequirementTypeSchema>;

// =============================================================================
// LOCATED_AT RELATIONSHIP
// =============================================================================

export const LocatedAtRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('LOCATED_AT'),
  position: z.string().max(100).optional(),
  duration: z.number().int().min(0).default(0), // in seconds
  accessibility: z.enum(['public', 'private', 'restricted']).default('public'),
  significance: z.number().min(0).max(1).default(0.5),
});

export type LocatedAtRelationship = z.infer<typeof LocatedAtRelationshipSchema>;

// =============================================================================
// PHASE 2: ADVANCED RELATIONSHIP TYPES
// =============================================================================

// CONTAINS - Hierarchical container relationships
export const ContainsRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('CONTAINS'),
  container_type: z.enum(['story', 'knot', 'stitch']),
  position: z.number().int().min(1),
  is_required: z.boolean().default(true),
  access_rules: z.record(z.string(), z.any()).default({}),
});

export type ContainsRelationship = z.infer<typeof ContainsRelationshipSchema>;

// BELONGS_TO - Reverse hierarchical relationship
export const BelongsToRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('BELONGS_TO'),
  parent_type: z.enum(['story', 'knot', 'stitch']),
  inheritance_rules: z.record(z.string(), z.any()).default({}),
});

export type BelongsToRelationship = z.infer<typeof BelongsToRelationshipSchema>;

// CONVERGES_TO - Multiple choice paths to same destination
export const ConvergesToRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('CONVERGES_TO'),
  convergence_weight: z.number().min(0).max(1).default(1.0),
  path_significance: z.number().min(0).max(10).default(5),
  state_merge_rules: z.record(z.string(), z.any()).default({}),
});

export type ConvergesToRelationship = z.infer<typeof ConvergesToRelationshipSchema>;

// GROUPED_WITH - Choice grouping for related decisions
export const GroupedWithRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('GROUPED_WITH'),
  group_type: z.enum(['mutually_exclusive', 'dependent', 'sequential']),
  group_priority: z.number().int().min(1).default(1),
  coordination_rules: z.record(z.string(), z.any()).default({}),
});

export type GroupedWithRelationship = z.infer<typeof GroupedWithRelationshipSchema>;

// INFLUENCES - Character supernode influence relationships
export const InfluencesRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('INFLUENCES'),
  influence_type: z.enum(['direct', 'indirect', 'causal', 'thematic']),
  influence_strength: z.number().min(0).max(10).default(5),
  narrative_impact: z.number().min(0).max(1).default(0.5),
  character_arc_relevance: z.number().min(0).max(1).default(0.5),
});

export type InfluencesRelationship = z.infer<typeof InfluencesRelationshipSchema>;

// APPEARS_THROUGHOUT - Character presence across story elements
export const AppearsThroughoutRelationshipSchema = BaseRelationshipSchema.extend({
  type: z.literal('APPEARS_THROUGHOUT'),
  presence_type: z.enum(['physical', 'mentioned', 'implied', 'flashback']),
  importance_in_element: z.number().min(0).max(1).default(0.5),
  character_state: z.record(z.string(), z.any()).default({}),
});

export type AppearsThroughoutRelationship = z.infer<typeof AppearsThroughoutRelationshipSchema>;

// =============================================================================
// UNION TYPES
// =============================================================================

export const RelationshipTypeSchema = z.enum([
  'LEADS_TO', 'APPEARS_IN', 'TRIGGERS', 'REQUIRES', 'LOCATED_AT',
  'CONTAINS', 'BELONGS_TO', 'CONVERGES_TO', 'GROUPED_WITH', 'INFLUENCES', 'APPEARS_THROUGHOUT'
]);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export type AnyRelationship = LeadsToRelationship | AppearsInRelationship | TriggersRelationship |
                             RequiresRelationship | LocatedAtRelationship |
                             ContainsRelationship | BelongsToRelationship | ConvergesToRelationship |
                             GroupedWithRelationship | InfluencesRelationship | AppearsThroughoutRelationship;

// =============================================================================
// RELATIONSHIP CREATION TYPES
// =============================================================================

export type CreateLeadsToRelationship = Omit<LeadsToRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateAppearsInRelationship = Omit<AppearsInRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateTriggersRelationship = Omit<TriggersRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateRequiresRelationship = Omit<RequiresRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateLocatedAtRelationship = Omit<LocatedAtRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateContainsRelationship = Omit<ContainsRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateBelongsToRelationship = Omit<BelongsToRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateConvergesToRelationship = Omit<ConvergesToRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateGroupedWithRelationship = Omit<GroupedWithRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateInfluencesRelationship = Omit<InfluencesRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateAppearsThroughoutRelationship = Omit<AppearsThroughoutRelationship, 'id' | 'created_at' | 'updated_at'>;

export type CreateAnyRelationship = CreateLeadsToRelationship | CreateAppearsInRelationship |
                                  CreateTriggersRelationship | CreateRequiresRelationship |
                                  CreateLocatedAtRelationship | CreateContainsRelationship |
                                  CreateBelongsToRelationship | CreateConvergesToRelationship |
                                  CreateGroupedWithRelationship | CreateInfluencesRelationship |
                                  CreateAppearsThroughoutRelationship;

// =============================================================================
// RELATIONSHIP UPDATE TYPES
// =============================================================================

export type UpdateLeadsToRelationship = Partial<Omit<LeadsToRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateAppearsInRelationship = Partial<Omit<AppearsInRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateTriggersRelationship = Partial<Omit<TriggersRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateRequiresRelationship = Partial<Omit<RequiresRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateLocatedAtRelationship = Partial<Omit<LocatedAtRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateContainsRelationship = Partial<Omit<ContainsRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateBelongsToRelationship = Partial<Omit<BelongsToRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateConvergesToRelationship = Partial<Omit<ConvergesToRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateGroupedWithRelationship = Partial<Omit<GroupedWithRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateInfluencesRelationship = Partial<Omit<InfluencesRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateAppearsThroughoutRelationship = Partial<Omit<AppearsThroughoutRelationship, 'id' | 'created_at'>> & { id: string };

export type UpdateAnyRelationship = UpdateLeadsToRelationship | UpdateAppearsInRelationship |
                                  UpdateTriggersRelationship | UpdateRequiresRelationship |
                                  UpdateLocatedAtRelationship | UpdateContainsRelationship |
                                  UpdateBelongsToRelationship | UpdateConvergesToRelationship |
                                  UpdateGroupedWithRelationship | UpdateInfluencesRelationship |
                                  UpdateAppearsThroughoutRelationship;

// =============================================================================
// READER JOURNEY TRACKING TYPES (Phase 2)
// =============================================================================

export interface ReaderSession {
  id: string;
  reader_id: string;
  story_id: string;
  started_at: Date;
  last_activity: Date;
  current_node_id: string;
  session_metadata: Record<string, any>;
}

export interface JourneyStep {
  id: string;
  session_id: string;
  from_node_id: string;
  to_node_id: string;
  step_type: 'scene_progression' | 'choice_selection' | 'backtrack' | 'jump';
  timestamp: Date;
  time_spent: number; // in milliseconds
  user_action: string;
  step_metadata: Record<string, any>;
}

export interface JourneyPath {
  id: string;
  session_id: string;
  path_nodes: string[];
  path_relationships: string[];
  total_duration: number;
  path_rating: number;
  completion_status: 'in_progress' | 'completed' | 'abandoned';
  path_metadata: Record<string, any>;
}

export interface JourneyAnalytics {
  session_count: number;
  avg_session_duration: number;
  most_popular_paths: string[];
  dropout_points: string[];
  choice_selection_rates: Record<string, number>;
  scene_engagement_scores: Record<string, number>;
}

// =============================================================================
// GRAPH TRAVERSAL TYPES
// =============================================================================

export interface GraphPath {
  nodes: string[];
  relationships: string[];
  length: number;
  weight?: number;
}

export interface GraphTraversalOptions {
  direction?: 'incoming' | 'outgoing' | 'both';
  relationship_types?: RelationshipType[];
  max_depth?: number;
  include_properties?: boolean;
}


