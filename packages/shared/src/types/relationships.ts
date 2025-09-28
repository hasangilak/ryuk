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
// UNION TYPES
// =============================================================================

export const RelationshipTypeSchema = z.enum(['LEADS_TO', 'APPEARS_IN', 'TRIGGERS', 'REQUIRES', 'LOCATED_AT']);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export type AnyRelationship = LeadsToRelationship | AppearsInRelationship | TriggersRelationship |
                             RequiresRelationship | LocatedAtRelationship;

// =============================================================================
// RELATIONSHIP CREATION TYPES
// =============================================================================

export type CreateLeadsToRelationship = Omit<LeadsToRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateAppearsInRelationship = Omit<AppearsInRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateTriggersRelationship = Omit<TriggersRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateRequiresRelationship = Omit<RequiresRelationship, 'id' | 'created_at' | 'updated_at'>;
export type CreateLocatedAtRelationship = Omit<LocatedAtRelationship, 'id' | 'created_at' | 'updated_at'>;

export type CreateAnyRelationship = CreateLeadsToRelationship | CreateAppearsInRelationship |
                                  CreateTriggersRelationship | CreateRequiresRelationship |
                                  CreateLocatedAtRelationship;

// =============================================================================
// RELATIONSHIP UPDATE TYPES
// =============================================================================

export type UpdateLeadsToRelationship = Partial<Omit<LeadsToRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateAppearsInRelationship = Partial<Omit<AppearsInRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateTriggersRelationship = Partial<Omit<TriggersRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateRequiresRelationship = Partial<Omit<RequiresRelationship, 'id' | 'created_at'>> & { id: string };
export type UpdateLocatedAtRelationship = Partial<Omit<LocatedAtRelationship, 'id' | 'created_at'>> & { id: string };

export type UpdateAnyRelationship = UpdateLeadsToRelationship | UpdateAppearsInRelationship |
                                  UpdateTriggersRelationship | UpdateRequiresRelationship |
                                  UpdateLocatedAtRelationship;

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


