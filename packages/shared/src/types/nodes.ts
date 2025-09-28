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
// UNION TYPES
// =============================================================================

export type AnyNode = SceneNode | CharacterNode | ChoiceNode | EventNode | LocationNode | ItemNode;

export const NodeTypeSchema = z.enum(['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item']);
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

export type CreateAnyNode = CreateSceneNode | CreateCharacterNode | CreateChoiceNode |
                          CreateEventNode | CreateLocationNode | CreateItemNode;

// =============================================================================
// UPDATE TYPES (all fields optional except id)
// =============================================================================

export type UpdateSceneNode = Partial<Omit<SceneNode, 'id' | 'created_at'>> & { id: string };
export type UpdateCharacterNode = Partial<Omit<CharacterNode, 'id' | 'created_at'>> & { id: string };
export type UpdateChoiceNode = Partial<Omit<ChoiceNode, 'id' | 'created_at'>> & { id: string };
export type UpdateEventNode = Partial<Omit<EventNode, 'id' | 'created_at'>> & { id: string };
export type UpdateLocationNode = Partial<Omit<LocationNode, 'id' | 'created_at'>> & { id: string };
export type UpdateItemNode = Partial<Omit<ItemNode, 'id' | 'created_at'>> & { id: string };

export type UpdateAnyNode = UpdateSceneNode | UpdateCharacterNode | UpdateChoiceNode |
                          UpdateEventNode | UpdateLocationNode | UpdateItemNode;

