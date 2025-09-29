import { RelationshipService } from '../relationshipService';
import { NodeService } from '../nodeService';
import { TestDataGenerator } from '../../tests/fixtures/testData';
import { createTestId, cleanupTestData } from '../../tests/setup';
import { RelationshipType } from '@ryuk/shared';

describe('RelationshipService', () => {
  let relationshipService: RelationshipService;
  let nodeService: NodeService;
  let testIds: string[] = [];

  beforeAll(() => {
    relationshipService = new RelationshipService();
    nodeService = new NodeService();
  });

  afterEach(async () => {
    if (testIds.length > 0) {
      await cleanupTestData(testIds);
      testIds = [];
    }
  });

  describe('LEADS_TO Relationships', () => {
    it('should create scene-to-scene progression relationship', async () => {
      const scene1 = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'First Scene',
      });
      const scene2 = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Second Scene',
      });
      testIds.push(scene1.id!, scene2.id!);

      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });

      const relationship = await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: scene2.id!,
        data: {
          transition_type: 'fade',
          weight: 0.8,
          probability: 1.0,
        },
      });

      expect(relationship).toBeDefined();
      expect(relationship.type).toBe('LEADS_TO');
      expect(relationship.transition_type).toBe('fade');
      expect(relationship.weight).toBe(0.8);
    });

    it('should create scene-to-choice branching relationship', async () => {
      const scene = TestDataGenerator.createTestScene({ id: createTestId() });
      const choice = TestDataGenerator.createTestChoice({ id: createTestId() });
      testIds.push(scene.id!, choice.id!);

      await nodeService.createNode({ type: 'Scene', data: scene });
      await nodeService.createNode({ type: 'Choice', data: choice });

      const relationship = await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene.id!,
        toNodeId: choice.id!,
        data: {
          transition_type: 'branch',
          weight: 0.5,
        },
      });

      expect(relationship.type).toBe('LEADS_TO');
      expect(relationship.transition_type).toBe('branch');
    });

    it('should create choice-to-scene resolution relationship', async () => {
      const choice = TestDataGenerator.createTestChoice({ id: createTestId() });
      const scene = TestDataGenerator.createTestScene({ id: createTestId() });
      testIds.push(choice.id!, scene.id!);

      await nodeService.createNode({ type: 'Choice', data: choice });
      await nodeService.createNode({ type: 'Scene', data: scene });

      const relationship = await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: choice.id!,
        toNodeId: scene.id!,
        data: {
          transition_type: 'consequence',
          weight: 0.7,
        },
      });

      expect(relationship.type).toBe('LEADS_TO');
      expect(relationship.transition_type).toBe('consequence');
    });
  });

  describe('APPEARS_IN Relationships', () => {
    it('should create character appearance in scene', async () => {
      const character = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Hero',
      });
      const scene = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Hero Introduction',
      });
      testIds.push(character.id!, scene.id!);

      await nodeService.createNode({ type: 'Character', data: character });
      await nodeService.createNode({ type: 'Scene', data: scene });

      const relationship = await relationshipService.createRelationship({
        type: 'APPEARS_IN',
        fromNodeId: character.id!,
        toNodeId: scene.id!,
        data: {
          role_in_scene: 'primary',
          screen_time: 80,
          dialogue_count: 15,
        },
      });

      expect(relationship.type).toBe('APPEARS_IN');
      expect(relationship.role_in_scene).toBe('primary');
      expect(relationship.screen_time).toBe(80);
      expect(relationship.dialogue_count).toBe(15);
    });

    it('should create character involvement in event', async () => {
      const character = TestDataGenerator.createTestCharacter({ id: createTestId() });
      const event = TestDataGenerator.createTestEvent({
        id: createTestId(),
        name: 'Battle Event',
      });
      testIds.push(character.id!, event.id!);

      await nodeService.createNode({ type: 'Character', data: character });
      await nodeService.createNode({ type: 'Event', data: event });

      const relationship = await relationshipService.createRelationship({
        type: 'APPEARS_IN',
        fromNodeId: character.id!,
        toNodeId: event.id!,
        data: {
          role_in_scene: 'participant',
          importance: 0.8,
        },
      });

      expect(relationship.type).toBe('APPEARS_IN');
      expect(relationship.role_in_scene).toBe('participant');
    });
  });

  describe('TRIGGERS Relationships', () => {
    it('should create event-to-event causality', async () => {
      const cause = TestDataGenerator.createTestEvent({
        id: createTestId(),
        name: 'Cause Event',
      });
      const effect = TestDataGenerator.createTestEvent({
        id: createTestId(),
        name: 'Effect Event',
      });
      testIds.push(cause.id!, effect.id!);

      await nodeService.createNode({ type: 'Event', data: cause });
      await nodeService.createNode({ type: 'Event', data: effect });

      const relationship = await relationshipService.createRelationship({
        type: 'TRIGGERS',
        fromNodeId: cause.id!,
        toNodeId: effect.id!,
        data: {
          causality_strength: 0.9,
          delay: 100,
          conditions: ['character_present', 'day_time'],
        },
      });

      expect(relationship.type).toBe('TRIGGERS');
      expect(relationship.causality_strength).toBe(0.9);
      expect(relationship.conditions).toContain('character_present');
    });

    it('should create choice-triggered event', async () => {
      const choice = TestDataGenerator.createTestChoice({
        id: createTestId(),
        text: 'Attack the enemy',
      });
      const event = TestDataGenerator.createTestEvent({
        id: createTestId(),
        name: 'Combat Event',
      });
      testIds.push(choice.id!, event.id!);

      await nodeService.createNode({ type: 'Choice', data: choice });
      await nodeService.createNode({ type: 'Event', data: event });

      const relationship = await relationshipService.createRelationship({
        type: 'TRIGGERS',
        fromNodeId: choice.id!,
        toNodeId: event.id!,
        data: {
          causality_strength: 1.0,
          delay: 0,
        },
      });

      expect(relationship.type).toBe('TRIGGERS');
      expect(relationship.causality_strength).toBe(1.0);
    });
  });

  describe('REQUIRES Relationships', () => {
    it('should create scene dependency on event', async () => {
      const event = TestDataGenerator.createTestEvent({
        id: createTestId(),
        name: 'Prerequisites Event',
      });
      const scene = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Dependent Scene',
      });
      testIds.push(event.id!, scene.id!);

      await nodeService.createNode({ type: 'Event', data: event });
      await nodeService.createNode({ type: 'Scene', data: scene });

      const relationship = await relationshipService.createRelationship({
        type: 'REQUIRES',
        fromNodeId: scene.id!,
        toNodeId: event.id!,
        data: {
          requirement_type: 'prerequisite',
          strength: 0.8,
          optional: false,
        },
      });

      expect(relationship.type).toBe('REQUIRES');
      expect(relationship.requirement_type).toBe('prerequisite');
      expect(relationship.optional).toBe(false);
    });

    it('should create choice prerequisites', async () => {
      const event = TestDataGenerator.createTestEvent({
        id: createTestId(),
        name: 'Unlock Event',
      });
      const choice = TestDataGenerator.createTestChoice({
        id: createTestId(),
        text: 'Special Choice',
      });
      testIds.push(event.id!, choice.id!);

      await nodeService.createNode({ type: 'Event', data: event });
      await nodeService.createNode({ type: 'Choice', data: choice });

      const relationship = await relationshipService.createRelationship({
        type: 'REQUIRES',
        fromNodeId: choice.id!,
        toNodeId: event.id!,
        data: {
          requirement_type: 'unlock',
          strength: 1.0,
          optional: false,
        },
      });

      expect(relationship.type).toBe('REQUIRES');
      expect(relationship.requirement_type).toBe('unlock');
    });
  });

  describe('LOCATED_AT Relationships', () => {
    it('should create scene location relationship', async () => {
      const scene = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Forest Scene',
      });
      const location = TestDataGenerator.createTestLocation({
        id: createTestId(),
        name: 'Enchanted Forest',
      });
      testIds.push(scene.id!, location.id!);

      await nodeService.createNode({ type: 'Scene', data: scene });
      await nodeService.createNode({ type: 'Location', data: location });

      const relationship = await relationshipService.createRelationship({
        type: 'LOCATED_AT',
        fromNodeId: scene.id!,
        toNodeId: location.id!,
        data: {
          position: 'center',
          duration: 300,
          accessibility: 'public',
        },
      });

      expect(relationship.type).toBe('LOCATED_AT');
      expect(relationship.position).toBe('center');
      expect(relationship.duration).toBe(300);
    });

    it('should create character location relationship', async () => {
      const character = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Wanderer',
      });
      const location = TestDataGenerator.createTestLocation({
        id: createTestId(),
        name: 'Village Square',
      });
      testIds.push(character.id!, location.id!);

      await nodeService.createNode({ type: 'Character', data: character });
      await nodeService.createNode({ type: 'Location', data: location });

      const relationship = await relationshipService.createRelationship({
        type: 'LOCATED_AT',
        fromNodeId: character.id!,
        toNodeId: location.id!,
        data: {
          position: 'near_fountain',
          duration: 120,
        },
      });

      expect(relationship.type).toBe('LOCATED_AT');
      expect(relationship.position).toBe('near_fountain');
    });

    it('should create item location relationship', async () => {
      const item = TestDataGenerator.createTestItem({
        id: createTestId(),
        name: 'Treasure Chest',
      });
      const location = TestDataGenerator.createTestLocation({
        id: createTestId(),
        name: 'Hidden Cave',
      });
      testIds.push(item.id!, location.id!);

      await nodeService.createNode({ type: 'Item', data: item });
      await nodeService.createNode({ type: 'Location', data: location });

      const relationship = await relationshipService.createRelationship({
        type: 'LOCATED_AT',
        fromNodeId: item.id!,
        toNodeId: location.id!,
        data: {
          position: 'hidden_corner',
          accessibility: 'secret',
        },
      });

      expect(relationship.type).toBe('LOCATED_AT');
      expect(relationship.accessibility).toBe('secret');
    });
  });

  describe('Relationship Management', () => {
    it('should read relationship by ID', async () => {
      const scene1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const scene2 = TestDataGenerator.createTestScene({ id: createTestId() });
      testIds.push(scene1.id!, scene2.id!);

      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });

      const relationship = await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: scene2.id!,
        data: { transition_type: 'fade' },
      });

      const retrieved = await relationshipService.getRelationshipById(relationship.id!);
      expect(retrieved.id).toBe(relationship.id);
      expect(retrieved.type).toBe('LEADS_TO');
    });

    it('should update relationship properties', async () => {
      const scene1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const scene2 = TestDataGenerator.createTestScene({ id: createTestId() });
      testIds.push(scene1.id!, scene2.id!);

      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });

      const relationship = await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: scene2.id!,
        data: { transition_type: 'fade', weight: 0.5 },
      });

      const updated = await relationshipService.updateRelationship(relationship.id!, {
        data: { weight: 0.8, transition_type: 'dissolve' },
      });

      expect(updated.weight).toBe(0.8);
      expect(updated.transition_type).toBe('dissolve');
    });

    it('should delete relationship', async () => {
      const scene1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const scene2 = TestDataGenerator.createTestScene({ id: createTestId() });
      testIds.push(scene1.id!, scene2.id!);

      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });

      const relationship = await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: scene2.id!,
        data: {},
      });

      await relationshipService.deleteRelationship(relationship.id!);

      await expect(
        relationshipService.getRelationshipById(relationship.id!)
      ).rejects.toThrow();
    });

    it('should list relationships with filtering', async () => {
      const character = TestDataGenerator.createTestCharacter({ id: createTestId() });
      const scenes = Array.from({ length: 3 }, () =>
        TestDataGenerator.createTestScene({ id: createTestId() })
      );
      testIds.push(character.id!, ...scenes.map(s => s.id!));

      await nodeService.createNode({ type: 'Character', data: character });
      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }

      // Create multiple APPEARS_IN relationships
      for (const scene of scenes) {
        await relationshipService.createRelationship({
          type: 'APPEARS_IN',
          fromNodeId: character.id!,
          toNodeId: scene.id!,
          data: { role_in_scene: 'primary' },
        });
      }

      const result = await relationshipService.listRelationships({
        type: 'APPEARS_IN',
        fromNodeId: character.id!,
        page: 1,
        limit: 10,
      });

      expect(result.relationships).toHaveLength(3);
      expect(result.total).toBe(3);
      result.relationships.forEach(rel => {
        expect(rel.type).toBe('APPEARS_IN');
        expect(rel.fromNodeId).toBe(character.id);
      });
    });
  });

  describe('Relationship Validation', () => {
    it('should prevent invalid relationship types', async () => {
      const scene1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const scene2 = TestDataGenerator.createTestScene({ id: createTestId() });
      testIds.push(scene1.id!, scene2.id!);

      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });

      await expect(
        relationshipService.createRelationship({
          type: 'INVALID_TYPE' as RelationshipType,
          fromNodeId: scene1.id!,
          toNodeId: scene2.id!,
          data: {},
        })
      ).rejects.toThrow();
    });

    it('should prevent relationships to non-existent nodes', async () => {
      const scene = TestDataGenerator.createTestScene({ id: createTestId() });
      testIds.push(scene.id!);

      await nodeService.createNode({ type: 'Scene', data: scene });

      await expect(
        relationshipService.createRelationship({
          type: 'LEADS_TO',
          fromNodeId: scene.id!,
          toNodeId: 'non-existent-id',
          data: {},
        })
      ).rejects.toThrow();
    });

    it('should validate node-relationship compatibility', async () => {
      const scene = TestDataGenerator.createTestScene({ id: createTestId() });
      const item = TestDataGenerator.createTestItem({ id: createTestId() });
      testIds.push(scene.id!, item.id!);

      await nodeService.createNode({ type: 'Scene', data: scene });
      await nodeService.createNode({ type: 'Item', data: item });

      // Scene-to-Item APPEARS_IN should be invalid
      await expect(
        relationshipService.createRelationship({
          type: 'APPEARS_IN',
          fromNodeId: scene.id!,
          toNodeId: item.id!,
          data: {},
        })
      ).rejects.toThrow();
    });
  });

  describe('Complex Narrative Scenarios', () => {
    it('should handle branching narrative with multiple choices', async () => {
      const scenario = TestDataGenerator.createBasicStoryScenario();
      const [scene1, scene2, scene3] = scenario.scenes;
      const [choice1, choice2] = scenario.choices;

      // Assign IDs and track for cleanup
      [scene1, scene2, scene3, choice1, choice2].forEach(node => {
        node.id = createTestId();
        testIds.push(node.id!);
      });

      // Create nodes
      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });
      await nodeService.createNode({ type: 'Scene', data: scene3 });
      await nodeService.createNode({ type: 'Choice', data: choice1 });
      await nodeService.createNode({ type: 'Choice', data: choice2 });

      // Create narrative flow: Scene1 -> Choice1 -> Scene2, Choice1 -> Scene3
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: choice1.id!,
        data: { transition_type: 'branch' },
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: choice1.id!,
        toNodeId: scene2.id!,
        data: { transition_type: 'consequence', weight: 0.6 },
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: choice1.id!,
        toNodeId: scene3.id!,
        data: { transition_type: 'consequence', weight: 0.4 },
      });

      // Verify relationships exist
      const relationshipsFromChoice = await relationshipService.listRelationships({
        type: 'LEADS_TO',
        fromNodeId: choice1.id!,
      });

      expect(relationshipsFromChoice.relationships).toHaveLength(2);
      expect(relationshipsFromChoice.relationships[0].type).toBe('LEADS_TO');
    });

    it('should handle character interactions across multiple scenes', async () => {
      const hero = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Hero',
      });
      const villain = TestDataGenerator.createTestCharacter({
        id: createTestId(),
        name: 'Villain',
      });
      const scenes = Array.from({ length: 3 }, (_, i) =>
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: `Scene ${i + 1}`,
        })
      );

      testIds.push(hero.id!, villain.id!, ...scenes.map(s => s.id!));

      // Create nodes
      await nodeService.createNode({ type: 'Character', data: hero });
      await nodeService.createNode({ type: 'Character', data: villain });
      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }

      // Hero appears in all scenes
      for (const scene of scenes) {
        await relationshipService.createRelationship({
          type: 'APPEARS_IN',
          fromNodeId: hero.id!,
          toNodeId: scene.id!,
          data: { role_in_scene: 'primary', screen_time: 70 },
        });
      }

      // Villain appears in scene 2 and 3
      for (const scene of scenes.slice(1)) {
        await relationshipService.createRelationship({
          type: 'APPEARS_IN',
          fromNodeId: villain.id!,
          toNodeId: scene.id!,
          data: { role_in_scene: 'antagonist', screen_time: 40 },
        });
      }

      // Verify character appearances
      const heroAppearances = await relationshipService.listRelationships({
        type: 'APPEARS_IN',
        fromNodeId: hero.id!,
      });

      const villainAppearances = await relationshipService.listRelationships({
        type: 'APPEARS_IN',
        fromNodeId: villain.id!,
      });

      expect(heroAppearances.relationships).toHaveLength(3);
      expect(villainAppearances.relationships).toHaveLength(2);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of relationships efficiently', async () => {
      const character = TestDataGenerator.createTestCharacter({ id: createTestId() });
      const { scenes } = TestDataGenerator.createLargeDataset(20);

      testIds.push(character.id!);
      scenes.forEach(scene => {
        scene.id = createTestId();
        testIds.push(scene.id!);
      });

      // Create nodes
      await nodeService.createNode({ type: 'Character', data: character });
      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }

      const startTime = Date.now();

      // Create relationships
      await Promise.all(
        scenes.map(scene =>
          relationshipService.createRelationship({
            type: 'APPEARS_IN',
            fromNodeId: character.id!,
            toNodeId: scene.id!,
            data: { role_in_scene: 'primary' },
          })
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      // Test query performance
      const queryStartTime = Date.now();
      const relationships = await relationshipService.listRelationships({
        type: 'APPEARS_IN',
        fromNodeId: character.id!,
      });
      const queryEndTime = Date.now();

      expect(relationships.relationships).toHaveLength(20);
      expect(queryEndTime - queryStartTime).toBeLessThan(100); // Query under 100ms
    });
  });
});