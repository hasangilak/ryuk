import { NodeService } from '../nodeService';
import { TestDataGenerator } from '../../tests/fixtures/testData';
import { createTestId, cleanupTestData } from '../../tests/setup';
import { NodeType } from '@ryuk/shared';

describe('NodeService', () => {
  let nodeService: NodeService;
  let testIds: string[] = [];

  beforeAll(() => {
    nodeService = new NodeService();
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (testIds.length > 0) {
      await cleanupTestData(testIds);
      testIds = [];
    }
  });

  describe('Scene Node Operations', () => {
    it('should create a scene node with all properties', async () => {
      const sceneData = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Test Scene Creation',
      });
      testIds.push(sceneData.id!);

      const result = await nodeService.createNode({
        type: 'Scene',
        data: sceneData,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(sceneData.id);
      expect(result.title).toBe('Test Scene Creation');
      expect(result.type).toBe('Scene');
      expect(result.created_at).toBeDefined();
    });

    it('should read a scene node by ID', async () => {
      const sceneData = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Test Scene Read',
      });
      testIds.push(sceneData.id!);

      await nodeService.createNode({ type: 'Scene', data: sceneData });
      const result = await nodeService.getNodeById(sceneData.id!);

      expect(result).toBeDefined();
      expect(result.id).toBe(sceneData.id);
      expect(result.title).toBe('Test Scene Read');
    });

    it('should update scene properties', async () => {
      const sceneData = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Original Title',
      });
      testIds.push(sceneData.id!);

      await nodeService.createNode({ type: 'Scene', data: sceneData });

      const updateResult = await nodeService.updateNode(sceneData.id!, {
        data: { title: 'Updated Title' },
      });

      expect(updateResult.title).toBe('Updated Title');
      expect(updateResult.updated_at).toBeDefined();
    });

    it('should delete a scene node', async () => {
      const sceneData = TestDataGenerator.createTestScene({
        id: createTestId(),
      });

      await nodeService.createNode({ type: 'Scene', data: sceneData });
      await nodeService.deleteNode(sceneData.id!);

      await expect(nodeService.getNodeById(sceneData.id!)).rejects.toThrow();
    });

    it('should list scenes with pagination', async () => {
      const scenes = Array.from({ length: 5 }, (_, i) =>
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: `Scene ${i + 1}`,
          chapter: 1,
          sequence: i + 1,
        })
      );

      testIds.push(...scenes.map(s => s.id!));

      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }

      const result = await nodeService.listNodes({
        type: 'Scene',
        page: 1,
        limit: 3,
        sortBy: 'sequence',
        sortOrder: 'asc',
      });

      expect(result.nodes).toBeDefined();
      expect(result.nodes.length).toBeLessThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(5);
      expect(result.page).toBe(1);
    });

    it('should handle edge cases - empty title', async () => {
      const sceneData = TestDataGenerator.createEdgeCaseData().emptyScene;
      sceneData.id = createTestId();
      testIds.push(sceneData.id);

      await expect(
        nodeService.createNode({ type: 'Scene', data: sceneData })
      ).rejects.toThrow();
    });
  });

  describe('Character Node Operations', () => {
    it('should create a character node with all properties', async () => {
      const characterData = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Test Hero',
        role: 'protagonist',
      });
      testIds.push(characterData.id!);

      const result = await nodeService.createNode({
        type: 'Character',
        data: characterData,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Hero');
      expect(result.role).toBe('protagonist');
      expect(result.visual_anchors).toEqual(['black hair', 'brown eyes']);
      expect(result.personality_traits).toContain('brave');
    });

    it('should handle special characters in character names', async () => {
      const characterData = TestDataGenerator.createEdgeCaseData().specialCharacterName;
      characterData.id = createTestId();
      testIds.push(characterData.id);

      const result = await nodeService.createNode({
        type: 'Character',
        data: characterData,
      });

      expect(result.name).toBe('特殊文字キャラクター');
      expect(result.description).toContain('émojis 🎭');
    });

    it('should update character relationships', async () => {
      const characterData = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        relationships: { allies: ['friend1'], enemies: ['villain1'] },
      });
      testIds.push(characterData.id!);

      await nodeService.createNode({ type: 'Character', data: characterData });

      const updateResult = await nodeService.updateNode(characterData.id!, {
        data: {
          relationships: {
            allies: ['friend1', 'friend2'],
            enemies: ['villain1'],
            mentors: ['wise_sage'],
          },
        },
      });

      expect(updateResult.relationships.allies).toContain('friend2');
      expect(updateResult.relationships.mentors).toContain('wise_sage');
    });
  });

  describe('Choice Node Operations', () => {
    it('should create a choice node with Phase 2 enhancements', async () => {
      const choiceData = TestDataGenerator.createTestChoice({
        id: createTestId(),
        text: 'Enhanced choice with metadata',
        metadata: { importance: 'high', category: 'moral' },
      });
      testIds.push(choiceData.id!);

      const result = await nodeService.createNode({
        type: 'Choice',
        data: choiceData,
      });

      expect(result.text).toBe('Enhanced choice with metadata');
      expect(result.metadata.importance).toBe('high');
      expect(result.ui_presentation.display_style).toBe('default');
      expect(result.analytics_data.selection_count).toBe(0);
    });

    it('should handle complex choice requirements and effects', async () => {
      const choiceData = TestDataGenerator.createEdgeCaseData().complexChoice;
      choiceData.id = createTestId();
      testIds.push(choiceData.id);

      const result = await nodeService.createNode({
        type: 'Choice',
        data: choiceData,
      });

      expect(result.requirements).toHaveLength(3);
      expect(result.effects.character_level).toBe('+1');
      expect(result.effects.story_flags.temple_visited).toBe(true);
    });
  });

  describe('Event Node Operations', () => {
    it('should create an event node with causality tracking', async () => {
      const eventData = TestDataGenerator.createTestEvent({
        id: createTestId(),
        name: 'Test Plot Event',
        causality_level: 8,
        prerequisites: ['previous_event_1'],
        consequences: ['consequence_event_1', 'consequence_event_2'],
      });
      testIds.push(eventData.id!);

      const result = await nodeService.createNode({
        type: 'Event',
        data: eventData,
      });

      expect(result.name).toBe('Test Plot Event');
      expect(result.causality_level).toBe(8);
      expect(result.prerequisites).toContain('previous_event_1');
      expect(result.consequences).toHaveLength(2);
    });

    it('should handle temporal properties correctly', async () => {
      const now = new Date();
      const eventData = TestDataGenerator.createTestEvent({
        id: createTestId(),
        narrative_time: 150,
        story_time: now,
      });
      testIds.push(eventData.id!);

      const result = await nodeService.createNode({
        type: 'Event',
        data: eventData,
      });

      expect(result.narrative_time).toBe(150);
      expect(new Date(result.story_time).getTime()).toBe(now.getTime());
    });
  });

  describe('Location Node Operations', () => {
    it('should create a location node with spatial properties', async () => {
      const locationData = TestDataGenerator.createTestLocation({
        id: createTestId(),
        name: 'Mystical Forest',
        connected_locations: ['village', 'mountain_pass'],
        accessibility: ['hero', 'mentor'],
      });
      testIds.push(locationData.id!);

      const result = await nodeService.createNode({
        type: 'Location',
        data: locationData,
      });

      expect(result.name).toBe('Mystical Forest');
      expect(result.connected_locations).toHaveLength(2);
      expect(result.accessibility).toContain('hero');
    });
  });

  describe('Item Node Operations', () => {
    it('should create an item node with properties and effects', async () => {
      const itemData = TestDataGenerator.createTestItem({
        id: createTestId(),
        name: 'Legendary Sword',
        properties: { attack: 50, durability: 100, magical: true },
        effects: { strength: 10, confidence: 5 },
      });
      testIds.push(itemData.id!);

      const result = await nodeService.createNode({
        type: 'Item',
        data: itemData,
      });

      expect(result.name).toBe('Legendary Sword');
      expect(result.properties.attack).toBe(50);
      expect(result.properties.magical).toBe(true);
      expect(result.effects.strength).toBe(10);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk creation efficiently', async () => {
      const { scenes } = TestDataGenerator.createLargeDataset(10);
      scenes.forEach(scene => {
        scene.id = createTestId();
        testIds.push(scene.id!);
      });

      const startTime = Date.now();

      const results = await Promise.all(
        scenes.map(scene => nodeService.createNode({ type: 'Scene', data: scene }))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.type).toBe('Scene');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid node type', async () => {
      const invalidData = { id: createTestId(), name: 'Invalid' };

      await expect(
        nodeService.createNode({
          type: 'InvalidType' as NodeType,
          data: invalidData,
        })
      ).rejects.toThrow();
    });

    it('should handle missing required properties', async () => {
      const incompleteData = { id: createTestId() }; // Missing required 'title' for Scene

      await expect(
        nodeService.createNode({
          type: 'Scene',
          data: incompleteData,
        })
      ).rejects.toThrow();
    });

    it('should handle non-existent node retrieval', async () => {
      const nonExistentId = createTestId();

      await expect(nodeService.getNodeById(nonExistentId)).rejects.toThrow();
    });

    it('should handle concurrent updates gracefully', async () => {
      const sceneData = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Concurrent Test Scene',
      });
      testIds.push(sceneData.id!);

      await nodeService.createNode({ type: 'Scene', data: sceneData });

      // Simulate concurrent updates
      const updatePromises = [
        nodeService.updateNode(sceneData.id!, { data: { title: 'Update 1' } }),
        nodeService.updateNode(sceneData.id!, { data: { title: 'Update 2' } }),
        nodeService.updateNode(sceneData.id!, { data: { title: 'Update 3' } }),
      ];

      const results = await Promise.allSettled(updatePromises);

      // At least one should succeed
      const successfulUpdates = results.filter(r => r.status === 'fulfilled');
      expect(successfulUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const { scenes, characters } = TestDataGenerator.createLargeDataset(50);

      scenes.forEach(scene => {
        scene.id = createTestId();
        testIds.push(scene.id!);
      });

      characters.forEach(character => {
        character.id = createTestId();
        testIds.push(character.id!);
      });

      const startTime = Date.now();

      // Create all nodes
      await Promise.all([
        ...scenes.map(scene => nodeService.createNode({ type: 'Scene', data: scene })),
        ...characters.map(character => nodeService.createNode({ type: 'Character', data: character })),
      ]);

      // Test query performance
      const queryStartTime = Date.now();
      const sceneList = await nodeService.listNodes({
        type: 'Scene',
        page: 1,
        limit: 20,
        sortBy: 'sequence',
        sortOrder: 'asc',
      });
      const queryEndTime = Date.now();

      const totalTime = Date.now() - startTime;
      const queryTime = queryEndTime - queryStartTime;

      expect(sceneList.nodes).toHaveLength(20);
      expect(sceneList.total).toBe(50);
      expect(queryTime).toBeLessThan(100); // Query should be under 100ms
      expect(totalTime).toBeLessThan(10000); // Total should be under 10 seconds
    });
  });
});