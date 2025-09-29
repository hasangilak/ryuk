import { NodeService } from '../../services/nodeService';
import { RelationshipService } from '../../services/relationshipService';
import { GraphService } from '../../services/graphService';
import { TestDataGenerator } from '../fixtures/testData';
import { createTestId, cleanupTestData } from '../setup';

describe('Database Integration Tests', () => {
  let nodeService: NodeService;
  let relationshipService: RelationshipService;
  let graphService: GraphService;
  let testIds: string[] = [];

  beforeAll(() => {
    nodeService = new NodeService();
    relationshipService = new RelationshipService();
    graphService = new GraphService();
  });

  afterEach(async () => {
    if (testIds.length > 0) {
      await cleanupTestData(testIds);
      testIds = [];
    }
  });

  describe('Complete Story Creation Workflow', () => {
    it('should create a complete story with scenes, characters, and relationships', async () => {
      // Create story components
      const hero = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Hero Character',
        role: 'protagonist',
      });

      const villain = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Villain Character',
        role: 'antagonist',
      });

      const location = TestDataGenerator.createTestLocation({
        id: createTestId(),
        name: 'Battle Arena',
        location_type: 'outdoor',
      });

      const scenes = [
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: 'Opening Scene',
          chapter: 1,
          sequence: 1,
        }),
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: 'Confrontation Scene',
          chapter: 1,
          sequence: 2,
        }),
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: 'Resolution Scene',
          chapter: 1,
          sequence: 3,
        }),
      ];

      testIds.push(hero.id!, villain.id!, location.id!, ...scenes.map(s => s.id!));

      // Create all nodes
      const createdHero = await nodeService.createNode({ type: 'Character', data: hero });
      const createdVillain = await nodeService.createNode({ type: 'Character', data: villain });
      const createdLocation = await nodeService.createNode({ type: 'Location', data: location });

      const createdScenes = await Promise.all(
        scenes.map(scene => nodeService.createNode({ type: 'Scene', data: scene }))
      );

      // Create relationships - sequential scene flow
      await relationshipService.createRelationship({
        from_id: createdScenes[0].id,
        to_id: createdScenes[1].id,
        type: 'LEADS_TO',
        properties: { transition_type: 'standard', weight: 1.0 },
      });

      await relationshipService.createRelationship({
        from_id: createdScenes[1].id,
        to_id: createdScenes[2].id,
        type: 'LEADS_TO',
        properties: { transition_type: 'climactic', weight: 1.0 },
      });

      // Character appearances
      await relationshipService.createRelationship({
        from_id: createdHero.id,
        to_id: createdScenes[0].id,
        type: 'APPEARS_IN',
        properties: { presence_type: 'main', screen_time: 100 },
      });

      await relationshipService.createRelationship({
        from_id: createdVillain.id,
        to_id: createdScenes[1].id,
        type: 'APPEARS_IN',
        properties: { presence_type: 'main', screen_time: 80 },
      });

      // Location relationships
      await relationshipService.createRelationship({
        from_id: createdScenes[1].id,
        to_id: createdLocation.id,
        type: 'LOCATED_AT',
        properties: { time_spent: 90, significance: 'high' },
      });

      // Verify complete story structure
      const storyGraph = await graphService.getGraphStatistics();
      expect(storyGraph.total_nodes).toBeGreaterThanOrEqual(6);
      expect(storyGraph.total_relationships).toBeGreaterThanOrEqual(5);

      // Test story traversal
      const storyPath = await graphService.traverse({
        start_node_id: createdScenes[0].id,
        relationship_types: ['LEADS_TO'],
        max_depth: 5,
        direction: 'outgoing',
      });

      expect(storyPath.nodes).toHaveLength(3);
      expect(storyPath.relationships).toHaveLength(2);
      expect(storyPath.nodes.map(n => n.title)).toEqual([
        'Opening Scene',
        'Confrontation Scene',
        'Resolution Scene'
      ]);
    });

    it('should handle complex branching narrative with choices', async () => {
      // Create branching story structure
      const mainScene = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Decision Point',
        chapter: 2,
        sequence: 1,
      });

      const choices = [
        TestDataGenerator.createTestChoice({
          id: createTestId(),
          text: 'Fight the monster',
          weight: 0.7,
        }),
        TestDataGenerator.createTestChoice({
          id: createTestId(),
          text: 'Try to negotiate',
          weight: 0.3,
        }),
      ];

      const outcomes = [
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: 'Battle Outcome',
          chapter: 2,
          sequence: 2,
        }),
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: 'Peaceful Resolution',
          chapter: 2,
          sequence: 2,
        }),
      ];

      testIds.push(
        mainScene.id!,
        ...choices.map(c => c.id!),
        ...outcomes.map(o => o.id!)
      );

      // Create nodes
      const createdMainScene = await nodeService.createNode({ type: 'Scene', data: mainScene });
      const createdChoices = await Promise.all(
        choices.map(choice => nodeService.createNode({ type: 'Choice', data: choice }))
      );
      const createdOutcomes = await Promise.all(
        outcomes.map(outcome => nodeService.createNode({ type: 'Scene', data: outcome }))
      );

      // Create branching relationships
      // Scene leads to choices
      for (const choice of createdChoices) {
        await relationshipService.createRelationship({
          from_id: createdMainScene.id,
          to_id: choice.id,
          type: 'LEADS_TO',
          properties: { transition_type: 'choice', weight: 1.0 },
        });
      }

      // Choices lead to outcomes
      await relationshipService.createRelationship({
        from_id: createdChoices[0].id,
        to_id: createdOutcomes[0].id,
        type: 'LEADS_TO',
        properties: { transition_type: 'consequence', weight: 0.7 },
      });

      await relationshipService.createRelationship({
        from_id: createdChoices[1].id,
        to_id: createdOutcomes[1].id,
        type: 'LEADS_TO',
        properties: { transition_type: 'consequence', weight: 0.3 },
      });

      // Test branching traversal
      const branchingPaths = await graphService.traverse({
        start_node_id: createdMainScene.id,
        relationship_types: ['LEADS_TO'],
        max_depth: 3,
        direction: 'outgoing',
      });

      expect(branchingPaths.nodes).toHaveLength(5); // 1 scene + 2 choices + 2 outcomes
      expect(branchingPaths.relationships).toHaveLength(4);

      // Verify choice structure
      const choiceNodes = branchingPaths.nodes.filter(n => n.type === 'Choice');
      expect(choiceNodes).toHaveLength(2);
      expect(choiceNodes.every(choice => choice.weight !== undefined)).toBe(true);
    });
  });

  describe('Character Relationship Networks', () => {
    it('should create and analyze complex character relationships', async () => {
      // Create character network
      const characters = [
        TestDataGenerator.createTestCharacter({
          id: createTestId(),
          name: 'Main Hero',
          role: 'protagonist',
        }),
        TestDataGenerator.createTestCharacter({
          id: createTestId(),
          name: 'Wise Mentor',
          role: 'supporting',
        }),
        TestDataGenerator.createTestCharacter({
          id: createTestId(),
          name: 'Loyal Friend',
          role: 'supporting',
        }),
        TestDataGenerator.createTestCharacter({
          id: createTestId(),
          name: 'Dark Lord',
          role: 'antagonist',
        }),
      ];

      testIds.push(...characters.map(c => c.id!));

      // Create character nodes
      const createdCharacters = await Promise.all(
        characters.map(char => nodeService.createNode({ type: 'Character', data: char }))
      );

      // Create character relationships
      const relationships = [
        // Hero -> Mentor (student relationship)
        {
          from: createdCharacters[0].id,
          to: createdCharacters[1].id,
          type: 'INFLUENCES' as const,
          properties: { influence_type: 'mentorship', strength: 0.9 },
        },
        // Hero -> Friend (ally relationship)
        {
          from: createdCharacters[0].id,
          to: createdCharacters[2].id,
          type: 'INFLUENCES' as const,
          properties: { influence_type: 'friendship', strength: 0.8 },
        },
        // Hero -> Villain (conflict relationship)
        {
          from: createdCharacters[0].id,
          to: createdCharacters[3].id,
          type: 'INFLUENCES' as const,
          properties: { influence_type: 'conflict', strength: 0.7 },
        },
        // Mentor -> Friend (guidance relationship)
        {
          from: createdCharacters[1].id,
          to: createdCharacters[2].id,
          type: 'INFLUENCES' as const,
          properties: { influence_type: 'guidance', strength: 0.6 },
        },
      ];

      for (const rel of relationships) {
        await relationshipService.createRelationship(rel);
      }

      // Analyze character network
      const heroNeighbors = await graphService.getNeighbors({
        node_id: createdCharacters[0].id,
        relationship_types: ['INFLUENCES'],
        direction: 'both',
        depth: 1,
      });

      expect(heroNeighbors.neighbors).toHaveLength(3); // Connected to all other characters

      // Test network traversal from different perspectives
      const mentorNetwork = await graphService.getNeighbors({
        node_id: createdCharacters[1].id,
        relationship_types: ['INFLUENCES'],
        direction: 'both',
        depth: 2,
      });

      expect(mentorNetwork.neighbors.length).toBeGreaterThanOrEqual(2);

      // Verify relationship properties
      const heroRelationships = await relationshipService.getRelationshipsByNodeId(
        createdCharacters[0].id
      );

      expect(heroRelationships).toHaveLength(3);
      expect(heroRelationships.every(rel => rel.properties.strength !== undefined)).toBe(true);
    });
  });

  describe('Event Causality Chains', () => {
    it('should create and validate event causality sequences', async () => {
      // Create causality chain
      const events = [
        TestDataGenerator.createTestEvent({
          id: createTestId(),
          name: 'Prophecy Revealed',
          event_type: 'revelation',
          causality_level: 9,
          consequences: [],
        }),
        TestDataGenerator.createTestEvent({
          id: createTestId(),
          name: 'Hero Awakens Power',
          event_type: 'character',
          causality_level: 8,
          prerequisites: [],
        }),
        TestDataGenerator.createTestEvent({
          id: createTestId(),
          name: 'Ancient Evil Stirs',
          event_type: 'plot',
          causality_level: 7,
          prerequisites: [],
        }),
        TestDataGenerator.createTestEvent({
          id: createTestId(),
          name: 'Final Confrontation',
          event_type: 'climax',
          causality_level: 10,
          prerequisites: [],
        }),
      ];

      testIds.push(...events.map(e => e.id!));

      // Create event nodes
      const createdEvents = await Promise.all(
        events.map(event => nodeService.createNode({ type: 'Event', data: event }))
      );

      // Create causality relationships
      await relationshipService.createRelationship({
        from_id: createdEvents[0].id,
        to_id: createdEvents[1].id,
        type: 'TRIGGERS',
        properties: { causality_level: 8, delay: 0, certainty: 0.9 },
      });

      await relationshipService.createRelationship({
        from_id: createdEvents[1].id,
        to_id: createdEvents[2].id,
        type: 'TRIGGERS',
        properties: { causality_level: 7, delay: 100, certainty: 0.8 },
      });

      await relationshipService.createRelationship({
        from_id: createdEvents[2].id,
        to_id: createdEvents[3].id,
        type: 'TRIGGERS',
        properties: { causality_level: 10, delay: 500, certainty: 1.0 },
      });

      // Test causality chain traversal
      const causalityChain = await graphService.traverse({
        start_node_id: createdEvents[0].id,
        relationship_types: ['TRIGGERS'],
        max_depth: 5,
        direction: 'outgoing',
      });

      expect(causalityChain.nodes).toHaveLength(4);
      expect(causalityChain.relationships).toHaveLength(3);

      // Verify causality levels increase appropriately
      const eventNodes = causalityChain.nodes.filter(n => n.type === 'Event');
      const finalEvent = eventNodes.find(e => e.name === 'Final Confrontation');
      expect(finalEvent?.causality_level).toBe(10);

      // Test reverse causality analysis
      const reverseChain = await graphService.traverse({
        start_node_id: createdEvents[3].id,
        relationship_types: ['TRIGGERS'],
        max_depth: 5,
        direction: 'incoming',
      });

      expect(reverseChain.nodes).toHaveLength(4);
      expect(reverseChain.relationships).toHaveLength(3);
    });
  });

  describe('Spatial Location Networks', () => {
    it('should create connected location networks with accessibility rules', async () => {
      // Create location network
      const locations = [
        TestDataGenerator.createTestLocation({
          id: createTestId(),
          name: 'Village Center',
          location_type: 'outdoor',
          accessibility: ['any'],
          connected_locations: [],
        }),
        TestDataGenerator.createTestLocation({
          id: createTestId(),
          name: 'Forest Path',
          location_type: 'outdoor',
          accessibility: ['hero'],
          connected_locations: [],
        }),
        TestDataGenerator.createTestLocation({
          id: createTestId(),
          name: 'Hidden Cave',
          location_type: 'indoor',
          accessibility: ['hero', 'mentor'],
          connected_locations: [],
        }),
        TestDataGenerator.createTestLocation({
          id: createTestId(),
          name: 'Dark Fortress',
          location_type: 'indoor',
          accessibility: ['villain'],
          connected_locations: [],
        }),
      ];

      testIds.push(...locations.map(l => l.id!));

      // Create location nodes
      const createdLocations = await Promise.all(
        locations.map(loc => nodeService.createNode({ type: 'Location', data: loc }))
      );

      // Create location connections
      const connections = [
        { from: 0, to: 1 }, // Village -> Forest
        { from: 1, to: 2 }, // Forest -> Cave
        { from: 1, to: 3 }, // Forest -> Fortress (alternate path)
      ];

      for (const conn of connections) {
        await relationshipService.createRelationship({
          from_id: createdLocations[conn.from].id,
          to_id: createdLocations[conn.to].id,
          type: 'LEADS_TO',
          properties: {
            transition_type: 'travel',
            weight: 1.0,
            travel_time: 30 + Math.random() * 60
          },
        });
      }

      // Test location network traversal
      const locationNetwork = await graphService.traverse({
        start_node_id: createdLocations[0].id,
        relationship_types: ['LEADS_TO'],
        max_depth: 3,
        direction: 'outgoing',
      });

      expect(locationNetwork.nodes).toHaveLength(4);
      expect(locationNetwork.relationships).toHaveLength(3);

      // Test location accessibility
      const restrictedLocations = locationNetwork.nodes.filter(
        n => n.type === 'Location' && !n.accessibility.includes('any')
      );

      expect(restrictedLocations).toHaveLength(3); // Forest, Cave, Fortress
      expect(restrictedLocations.some(loc => loc.name === 'Hidden Cave')).toBe(true);

      // Test pathfinding from village
      const villageNeighbors = await graphService.getNeighbors({
        node_id: createdLocations[0].id,
        relationship_types: ['LEADS_TO'],
        direction: 'outgoing',
        depth: 2,
      });

      expect(villageNeighbors.neighbors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle large-scale operations efficiently', async () => {
      const nodeCount = 100;
      const relationshipCount = 150;

      // Create large dataset
      const largeDataset = TestDataGenerator.createLargeDataset(nodeCount);

      // Assign test IDs
      largeDataset.scenes.forEach(scene => {
        scene.id = createTestId();
        testIds.push(scene.id!);
      });

      largeDataset.characters.forEach(character => {
        character.id = createTestId();
        testIds.push(character.id!);
      });

      const startTime = Date.now();

      // Bulk create nodes
      const scenePromises = largeDataset.scenes.map(scene =>
        nodeService.createNode({ type: 'Scene', data: scene })
      );

      const characterPromises = largeDataset.characters.map(character =>
        nodeService.createNode({ type: 'Character', data: character })
      );

      const [createdScenes, createdCharacters] = await Promise.all([
        Promise.all(scenePromises),
        Promise.all(characterPromises),
      ]);

      // Create relationships between some nodes
      const relationshipPromises = [];
      for (let i = 0; i < Math.min(relationshipCount, createdScenes.length - 1); i++) {
        relationshipPromises.push(
          relationshipService.createRelationship({
            from_id: createdScenes[i].id,
            to_id: createdScenes[i + 1].id,
            type: 'LEADS_TO',
            properties: { transition_type: 'standard', weight: 1.0 },
          })
        );
      }

      // Add character appearances
      for (let i = 0; i < Math.min(50, createdCharacters.length); i++) {
        const sceneIndex = Math.floor(Math.random() * createdScenes.length);
        relationshipPromises.push(
          relationshipService.createRelationship({
            from_id: createdCharacters[i].id,
            to_id: createdScenes[sceneIndex].id,
            type: 'APPEARS_IN',
            properties: { presence_type: 'minor', screen_time: 20 },
          })
        );
      }

      await Promise.all(relationshipPromises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
      expect(createdScenes).toHaveLength(nodeCount);
      expect(createdCharacters).toHaveLength(Math.floor(nodeCount / 10));

      // Test query performance
      const queryStartTime = Date.now();
      const stats = await graphService.getGraphStatistics();
      const queryEndTime = Date.now();

      expect(stats.total_nodes).toBeGreaterThanOrEqual(nodeCount + Math.floor(nodeCount / 10));
      expect(stats.total_relationships).toBeGreaterThanOrEqual(relationshipCount);
      expect(queryEndTime - queryStartTime).toBeLessThan(1000); // Query under 1 second
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should maintain referential integrity across operations', async () => {
      // Create nodes that reference each other
      const character = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Integrity Test Character',
      });

      const scene = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Integrity Test Scene',
      });

      testIds.push(character.id!, scene.id!);

      const createdCharacter = await nodeService.createNode({ type: 'Character', data: character });
      const createdScene = await nodeService.createNode({ type: 'Scene', data: scene });

      // Create relationship
      await relationshipService.createRelationship({
        from_id: createdCharacter.id,
        to_id: createdScene.id,
        type: 'APPEARS_IN',
        properties: { presence_type: 'main', screen_time: 100 },
      });

      // Verify relationship exists
      const relationships = await relationshipService.getRelationshipsByNodeId(createdCharacter.id);
      expect(relationships).toHaveLength(1);
      expect(relationships[0].to_id).toBe(createdScene.id);

      // Test cascade behavior - when we delete the character, relationships should be handled
      await nodeService.deleteNode(createdCharacter.id);

      // Verify character is deleted
      await expect(nodeService.getNodeById(createdCharacter.id)).rejects.toThrow();

      // Scene should still exist
      const stillExistingScene = await nodeService.getNodeById(createdScene.id);
      expect(stillExistingScene.title).toBe('Integrity Test Scene');

      // Relationship should be cleaned up (this depends on your deletion strategy)
      const orphanedRelationships = await relationshipService.getRelationshipsByNodeId(createdCharacter.id);
      expect(orphanedRelationships).toHaveLength(0);
    });

    it('should validate complex data constraints', async () => {
      // Test edge cases and data validation
      const edgeCase = TestDataGenerator.createEdgeCaseData();

      // Empty scene should fail validation
      await expect(
        nodeService.createNode({ type: 'Scene', data: edgeCase.emptyScene })
      ).rejects.toThrow();

      // Special characters should be handled properly
      const specialCharNode = await nodeService.createNode({
        type: 'Character',
        data: {
          ...edgeCase.specialCharacterName,
          id: createTestId(),
        },
      });
      testIds.push(specialCharNode.id);

      expect(specialCharNode.name).toBe('特殊文字キャラクター');
      expect(specialCharNode.description).toContain('émojis 🎭');

      // Complex choice with requirements should validate
      const complexChoice = await nodeService.createNode({
        type: 'Choice',
        data: {
          ...edgeCase.complexChoice,
          id: createTestId(),
        },
      });
      testIds.push(complexChoice.id);

      expect(complexChoice.requirements).toHaveLength(3);
      expect(complexChoice.effects.story_flags).toBeDefined();
    });
  });
});