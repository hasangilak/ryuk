import { v4 as uuidv4 } from 'uuid';
import { SceneNode, CharacterNode, ChoiceNode, EventNode, LocationNode, ItemNode } from '@ryuk/shared';

export class TestDataGenerator {
  static createTestScene(overrides: Partial<SceneNode> = {}): SceneNode {
    return {
      id: uuidv4(),
      title: 'Test Scene',
      description: 'A test scene for unit testing',
      chapter: 1,
      sequence: 1,
      emotional_tone: 'neutral',
      panel_count: 3,
      duration: 30,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createTestCharacter(overrides: Partial<CharacterNode> = {}): CharacterNode {
    return {
      id: uuidv4(),
      name: 'Test Character',
      description: 'A test character for unit testing',
      visual_anchors: ['black hair', 'brown eyes'],
      role: 'protagonist',
      archetype: 'hero',
      personality_traits: ['brave', 'determined'],
      goals: ['save the world', 'protect friends'],
      relationships: {},
      first_appearance: uuidv4(),
      connectivity_index: 0.5,
      scene_appearances: [],
      relationship_network: {
        direct_connections: [],
        indirect_connections: [],
        antagonistic_relationships: [],
        supportive_relationships: [],
      },
      narrative_impact: 0.5,
      character_arc: {
        development_stages: [],
        arc_completion: 0,
        growth_trajectory: 'flat',
      },
      supernode_metadata: {
        centrality_scores: {},
        influence_radius: 0,
        narrative_threads: [],
        viewpoint_access: false,
      },
      character_state_history: [],
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createTestChoice(overrides: Partial<ChoiceNode> = {}): ChoiceNode {
    return {
      id: uuidv4(),
      text: 'Test choice option',
      consequence_preview: 'This will lead to interesting consequences',
      weight: 0.5,
      requirements: [],
      effects: {},
      execution_context: {},
      destination_scenes: [],
      created_at: new Date(),
      updated_at: new Date(),
      // Phase 2 enhancements
      metadata: {},
      ui_presentation: {
        display_style: 'default',
        icon: 'arrow-right',
        color_theme: 'blue',
      },
      analytics_data: {
        selection_count: 0,
        avg_time_to_select: 0,
        abandonment_rate: 0,
        user_ratings: [],
      },
      convergent_weight: 1.0,
      path_history: [],
      ...overrides,
    };
  }

  static createTestEvent(overrides: Partial<EventNode> = {}): EventNode {
    return {
      id: uuidv4(),
      name: 'Test Event',
      description: 'A test event for unit testing',
      event_type: 'plot',
      causality_level: 5,
      prerequisites: [],
      consequences: [],
      characters_involved: [],
      narrative_time: 100,
      story_time: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createTestLocation(overrides: Partial<LocationNode> = {}): LocationNode {
    return {
      id: uuidv4(),
      name: 'Test Location',
      description: 'A test location for unit testing',
      location_type: 'indoor',
      atmosphere: 'mysterious',
      visual_style: 'modern',
      accessibility: ['any'],
      connected_locations: [],
      significance: 'minor',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createTestItem(overrides: Partial<ItemNode> = {}): ItemNode {
    return {
      id: uuidv4(),
      name: 'Test Item',
      description: 'A test item for unit testing',
      item_type: 'tool',
      properties: { durability: 100 },
      visual_description: 'A shiny test item',
      ownership_rules: 'anyone',
      effects: { strength: 5 },
      significance: 'minor',
      first_appearance: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  // Test scenarios for complex narratives
  static createBasicStoryScenario() {
    const characters = [
      this.createTestCharacter({ name: 'Hero', role: 'protagonist' }),
      this.createTestCharacter({ name: 'Villain', role: 'antagonist' }),
      this.createTestCharacter({ name: 'Mentor', role: 'supporting' }),
    ];

    const locations = [
      this.createTestLocation({ name: 'Home Village', location_type: 'outdoor' }),
      this.createTestLocation({ name: 'Dark Forest', location_type: 'outdoor' }),
      this.createTestLocation({ name: 'Ancient Temple', location_type: 'indoor' }),
    ];

    const scenes = [
      this.createTestScene({ title: 'Opening Scene', chapter: 1, sequence: 1 }),
      this.createTestScene({ title: 'Call to Adventure', chapter: 1, sequence: 2 }),
      this.createTestScene({ title: 'First Challenge', chapter: 1, sequence: 3 }),
    ];

    const choices = [
      this.createTestChoice({ text: 'Accept the quest' }),
      this.createTestChoice({ text: 'Refuse and stay home' }),
      this.createTestChoice({ text: 'Ask for more information' }),
    ];

    const events = [
      this.createTestEvent({ name: 'Village Attack', event_type: 'plot' }),
      this.createTestEvent({ name: 'Meet Mentor', event_type: 'character' }),
      this.createTestEvent({ name: 'Discover Power', event_type: 'character' }),
    ];

    const items = [
      this.createTestItem({ name: 'Magic Sword', item_type: 'weapon' }),
      this.createTestItem({ name: 'Ancient Map', item_type: 'tool' }),
      this.createTestItem({ name: 'Healing Potion', item_type: 'consumable' }),
    ];

    return {
      characters,
      locations,
      scenes,
      choices,
      events,
      items,
    };
  }

  // Performance test data
  static createLargeDataset(count: number = 100) {
    const scenes = Array.from({ length: count }, (_, i) =>
      this.createTestScene({
        title: `Scene ${i + 1}`,
        chapter: Math.floor(i / 10) + 1,
        sequence: (i % 10) + 1,
      })
    );

    const characters = Array.from({ length: Math.floor(count / 10) }, (_, i) =>
      this.createTestCharacter({
        name: `Character ${i + 1}`,
        role: i % 3 === 0 ? 'protagonist' : i % 3 === 1 ? 'antagonist' : 'supporting',
      })
    );

    return { scenes, characters };
  }

  // Edge case data
  static createEdgeCaseData() {
    return {
      emptyScene: this.createTestScene({
        title: '',
        description: '',
        panel_count: 0,
      }),
      maxLengthScene: this.createTestScene({
        title: 'A'.repeat(200),
        description: 'B'.repeat(2000),
      }),
      specialCharacterName: this.createTestCharacter({
        name: '特殊文字キャラクター',
        description: 'Character with special Unicode characters: émojis 🎭',
      }),
      complexChoice: this.createTestChoice({
        text: 'A complex choice with multiple requirements and effects',
        requirements: ['character_level > 5', 'has_item("magic_sword")', 'location == "temple"'],
        effects: {
          character_level: '+1',
          reputation: '+10',
          story_flags: { temple_visited: true },
        },
      }),
    };
  }
}