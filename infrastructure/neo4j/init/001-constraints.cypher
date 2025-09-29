// Neo4j Constraints and Indexes for Ryuk Manga Generation System
// Based on Phase 1 Foundation requirements

// =============================================================================
// UNIQUE CONSTRAINTS
// =============================================================================

// Scene nodes - unique ID constraint
CREATE CONSTRAINT scene_id_unique IF NOT EXISTS
FOR (s:Scene) REQUIRE s.id IS UNIQUE;

// Character nodes - unique ID constraint
CREATE CONSTRAINT character_id_unique IF NOT EXISTS
FOR (c:Character) REQUIRE c.id IS UNIQUE;

// Choice nodes - unique ID constraint
CREATE CONSTRAINT choice_id_unique IF NOT EXISTS
FOR (ch:Choice) REQUIRE ch.id IS UNIQUE;

// Event nodes - unique ID constraint
CREATE CONSTRAINT event_id_unique IF NOT EXISTS
FOR (e:Event) REQUIRE e.id IS UNIQUE;

// Location nodes - unique ID constraint
CREATE CONSTRAINT location_id_unique IF NOT EXISTS
FOR (l:Location) REQUIRE l.id IS UNIQUE;

// Item nodes - unique ID constraint
CREATE CONSTRAINT item_id_unique IF NOT EXISTS
FOR (i:Item) REQUIRE i.id IS UNIQUE;

// Phase 2 Node Types - Hierarchical Container Model
// Story nodes - unique ID constraint
CREATE CONSTRAINT story_id_unique IF NOT EXISTS
FOR (s:Story) REQUIRE s.id IS UNIQUE;

// Knot nodes - unique ID constraint
CREATE CONSTRAINT knot_id_unique IF NOT EXISTS
FOR (k:Knot) REQUIRE k.id IS UNIQUE;

// Stitch nodes - unique ID constraint
CREATE CONSTRAINT stitch_id_unique IF NOT EXISTS
FOR (st:Stitch) REQUIRE st.id IS UNIQUE;

// =============================================================================
// PROPERTY EXISTENCE CONSTRAINTS
// =============================================================================

// Scene required properties
CREATE CONSTRAINT scene_title_exists IF NOT EXISTS
FOR (s:Scene) REQUIRE s.title IS NOT NULL;

CREATE CONSTRAINT scene_chapter_exists IF NOT EXISTS
FOR (s:Scene) REQUIRE s.chapter IS NOT NULL;

CREATE CONSTRAINT scene_sequence_exists IF NOT EXISTS
FOR (s:Scene) REQUIRE s.sequence IS NOT NULL;

// Character required properties
CREATE CONSTRAINT character_name_exists IF NOT EXISTS
FOR (c:Character) REQUIRE c.name IS NOT NULL;

CREATE CONSTRAINT character_role_exists IF NOT EXISTS
FOR (c:Character) REQUIRE c.role IS NOT NULL;

// Choice required properties
CREATE CONSTRAINT choice_text_exists IF NOT EXISTS
FOR (ch:Choice) REQUIRE ch.text IS NOT NULL;

// Event required properties
CREATE CONSTRAINT event_name_exists IF NOT EXISTS
FOR (e:Event) REQUIRE e.name IS NOT NULL;

CREATE CONSTRAINT event_type_exists IF NOT EXISTS
FOR (e:Event) REQUIRE e.event_type IS NOT NULL;

// Location required properties
CREATE CONSTRAINT location_name_exists IF NOT EXISTS
FOR (l:Location) REQUIRE l.name IS NOT NULL;

// Item required properties
CREATE CONSTRAINT item_name_exists IF NOT EXISTS
FOR (i:Item) REQUIRE i.name IS NOT NULL;

// Phase 2 required properties
// Story required properties
CREATE CONSTRAINT story_title_exists IF NOT EXISTS
FOR (s:Story) REQUIRE s.title IS NOT NULL;

// Knot required properties
CREATE CONSTRAINT knot_name_exists IF NOT EXISTS
FOR (k:Knot) REQUIRE k.name IS NOT NULL;

// Stitch required properties
CREATE CONSTRAINT stitch_name_exists IF NOT EXISTS
FOR (st:Stitch) REQUIRE st.name IS NOT NULL;

// =============================================================================
// PERFORMANCE INDEXES
// =============================================================================

// Scene indexes for common queries
CREATE INDEX scene_chapter_sequence IF NOT EXISTS
FOR (s:Scene) ON (s.chapter, s.sequence);

CREATE INDEX scene_emotional_tone IF NOT EXISTS
FOR (s:Scene) ON (s.emotional_tone);

CREATE INDEX scene_created_at IF NOT EXISTS
FOR (s:Scene) ON (s.created_at);

// Character indexes
CREATE INDEX character_name IF NOT EXISTS
FOR (c:Character) ON (c.name);

CREATE INDEX character_role IF NOT EXISTS
FOR (c:Character) ON (c.role);

CREATE INDEX character_archetype IF NOT EXISTS
FOR (c:Character) ON (c.archetype);

// Choice indexes
CREATE INDEX choice_weight IF NOT EXISTS
FOR (ch:Choice) ON (ch.weight);

// Event indexes
CREATE INDEX event_type IF NOT EXISTS
FOR (e:Event) ON (e.event_type);

CREATE INDEX event_causality_level IF NOT EXISTS
FOR (e:Event) ON (e.causality_level);

CREATE INDEX event_narrative_time IF NOT EXISTS
FOR (e:Event) ON (e.narrative_time);

// Location indexes
CREATE INDEX location_type IF NOT EXISTS
FOR (l:Location) ON (l.location_type);

// Item indexes
CREATE INDEX item_type IF NOT EXISTS
FOR (i:Item) ON (i.item_type);

CREATE INDEX item_significance IF NOT EXISTS
FOR (i:Item) ON (i.significance);

// Phase 2 Performance Indexes
// Story indexes
CREATE INDEX story_title IF NOT EXISTS
FOR (s:Story) ON (s.title);

CREATE INDEX story_genre IF NOT EXISTS
FOR (s:Story) ON (s.genre);

CREATE INDEX story_status IF NOT EXISTS
FOR (s:Story) ON (s.status);

// Knot indexes
CREATE INDEX knot_name IF NOT EXISTS
FOR (k:Knot) ON (k.name);

CREATE INDEX knot_type IF NOT EXISTS
FOR (k:Knot) ON (k.knot_type);

// Stitch indexes
CREATE INDEX stitch_name IF NOT EXISTS
FOR (st:Stitch) ON (st.name);

CREATE INDEX stitch_type IF NOT EXISTS
FOR (st:Stitch) ON (st.stitch_type);

// Choice analytics indexes
CREATE INDEX choice_selection_count IF NOT EXISTS
FOR (ch:Choice) ON (ch.selection_count);

CREATE INDEX choice_convergent_weight IF NOT EXISTS
FOR (ch:Choice) ON (ch.convergent_weight);

// =============================================================================
// DATA INTEGRITY CONSTRAINTS
// =============================================================================

// Scene title uniqueness within chapter constraint (business rule)
// Note: This would need to be enforced at application level
// as Neo4j doesn't support conditional uniqueness directly

// Scene sequence validation - ensure no gaps in sequences
// This constraint ensures scenes have valid sequence numbers
CREATE CONSTRAINT scene_sequence_positive IF NOT EXISTS
FOR (s:Scene) REQUIRE s.sequence > 0;

// Chapter constraint - must be positive
CREATE CONSTRAINT scene_chapter_positive IF NOT EXISTS
FOR (s:Scene) REQUIRE s.chapter > 0;

// Choice weight constraint - must be between 0 and 1
// Note: Neo4j doesn't support range constraints directly,
// this needs to be enforced at application level

// Event causality level constraint - must be positive
CREATE CONSTRAINT event_causality_positive IF NOT EXISTS
FOR (e:Event) REQUIRE e.causality_level >= 0;

// =============================================================================
// RELATIONSHIP TYPE VALIDATION (via patterns)
// =============================================================================

// Note: Neo4j doesn't have built-in relationship type constraints,
// but we can create validation queries that can be run periodically

// This query can be used to validate LEADS_TO relationships
// MATCH (a)-[r:LEADS_TO]->(b)
// WHERE NOT (a:Scene OR a:Choice) OR NOT (b:Scene OR b:Choice)
// RETURN COUNT(r) as invalid_leads_to_relationships;

// This query validates APPEARS_IN relationships
// MATCH (c:Character)-[r:APPEARS_IN]->(target)
// WHERE NOT (target:Scene OR target:Event)
// RETURN COUNT(r) as invalid_appears_in_relationships;

// Validate CONTAINS relationships (hierarchical integrity)
// MATCH (container)-[r:CONTAINS]->(content)
// WHERE NOT (
//   (container:Story AND (content:Knot OR content:Scene)) OR
//   (container:Knot AND (content:Stitch OR content:Scene)) OR
//   (container:Stitch AND content:Scene)
// )
// RETURN COUNT(r) as invalid_contains_relationships;

// Validate CONVERGES_TO relationships (choice convergence)
// MATCH (choice:Choice)-[r:CONVERGES_TO]->(target)
// WHERE NOT target:Scene
// RETURN COUNT(r) as invalid_convergence_relationships;

// =============================================================================
// INITIAL SAMPLE DATA (for development)
// =============================================================================

// Create a sample story structure for testing
MERGE (story:Story {
  id: 'story-001',
  title: 'Sample Manga Story',
  description: 'A test story for development',
  genre: ['shonen'],
  created_at: datetime(),
  updated_at: datetime()
});

// Create sample characters
MERGE (protagonist:Character {
  id: 'char-001',
  name: 'Akira Tanaka',
  description: 'A determined young hero',
  visual_anchors: ['spiky black hair', 'determined brown eyes', 'orange training outfit'],
  role: 'protagonist',
  archetype: 'hero',
  personality_traits: ['brave', 'determined', 'loyal'],
  goals: ['become stronger', 'protect friends'],
  relationships: {},
  first_appearance: 'scene-001',
  created_at: datetime(),
  updated_at: datetime()
});

MERGE (mentor:Character {
  id: 'char-002',
  name: 'Master Yamamoto',
  description: 'Wise martial arts master',
  visual_anchors: ['long white beard', 'ancient eyes', 'traditional robes'],
  role: 'supporting',
  archetype: 'mentor',
  personality_traits: ['wise', 'patient', 'mysterious'],
  goals: ['train the next generation'],
  relationships: {},
  first_appearance: 'scene-002',
  created_at: datetime(),
  updated_at: datetime()
});

// Create sample scenes
MERGE (scene1:Scene {
  id: 'scene-001',
  title: 'The Journey Begins',
  description: 'Our hero starts their adventure',
  chapter: 1,
  sequence: 1,
  emotional_tone: 'excitement',
  panel_count: 5,
  duration: 30,
  created_at: datetime(),
  updated_at: datetime()
});

MERGE (scene2:Scene {
  id: 'scene-002',
  title: 'Meeting the Mentor',
  description: 'The hero meets their guide',
  chapter: 1,
  sequence: 2,
  emotional_tone: 'curiosity',
  panel_count: 7,
  duration: 45,
  created_at: datetime(),
  updated_at: datetime()
});

// Create sample location
MERGE (dojo:Location {
  id: 'loc-001',
  name: 'Mountain Dojo',
  description: 'Ancient training ground high in the mountains',
  location_type: 'indoor',
  atmosphere: 'serene and focused',
  visual_style: 'traditional Japanese architecture',
  accessibility: ['char-001', 'char-002'],
  connected_locations: [],
  significance: 'training location',
  created_at: datetime(),
  updated_at: datetime()
});

// Create relationships
MERGE (scene1)-[:LEADS_TO {transition_type: 'sequential', weight: 1.0}]->(scene2);
MERGE (protagonist)-[:APPEARS_IN {role_in_scene: 'protagonist', screen_time: 0.8}]->(scene1);
MERGE (protagonist)-[:APPEARS_IN {role_in_scene: 'protagonist', screen_time: 0.6}]->(scene2);
MERGE (mentor)-[:APPEARS_IN {role_in_scene: 'mentor', screen_time: 0.7}]->(scene2);
MERGE (scene2)-[:LOCATED_AT {position: 'center', duration: 45}]->(dojo);

// Create version info
MERGE (version:SystemVersion {
  version: '1.0.0',
  phase: 'Phase 1 - Foundation',
  initialized_at: datetime(),
  schema_version: '1.0'
});