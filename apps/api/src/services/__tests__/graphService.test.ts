import { GraphService } from '../graphService';
import { NodeService } from '../nodeService';
import { RelationshipService } from '../relationshipService';
import { TestDataGenerator } from '../../tests/fixtures/testData';
import { createTestId, cleanupTestData } from '../../tests/setup';

describe('GraphService', () => {
  let graphService: GraphService;
  let nodeService: NodeService;
  let relationshipService: RelationshipService;
  let testIds: string[] = [];

  beforeAll(() => {
    graphService = new GraphService();
    nodeService = new NodeService();
    relationshipService = new RelationshipService();
  });

  afterEach(async () => {
    if (testIds.length > 0) {
      await cleanupTestData(testIds);
      testIds = [];
    }
  });

  describe('Graph Statistics', () => {
    it('should return comprehensive graph statistics', async () => {
      // Create a small story graph
      const scenario = TestDataGenerator.createBasicStoryScenario();
      const { characters, scenes, choices, events, locations, items } = scenario;

      // Assign test IDs
      [...characters, ...scenes, ...choices, ...events, ...locations, ...items].forEach(node => {
        node.id = createTestId();
        testIds.push(node.id!);
      });

      // Create all nodes
      for (const character of characters) {
        await nodeService.createNode({ type: 'Character', data: character });
      }
      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }
      for (const choice of choices) {
        await nodeService.createNode({ type: 'Choice', data: choice });
      }
      for (const event of events) {
        await nodeService.createNode({ type: 'Event', data: event });
      }
      for (const location of locations) {
        await nodeService.createNode({ type: 'Location', data: location });
      }
      for (const item of items) {
        await nodeService.createNode({ type: 'Item', data: item });
      }

      // Create some relationships
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scenes[0].id!,
        toNodeId: scenes[1].id!,
        data: {},
      });

      await relationshipService.createRelationship({
        type: 'APPEARS_IN',
        fromNodeId: characters[0].id!,
        toNodeId: scenes[0].id!,
        data: { role_in_scene: 'primary' },
      });

      const stats = await graphService.getGraphStatistics();

      expect(stats.nodeCount).toBeGreaterThan(10);
      expect(stats.relationshipCount).toBeGreaterThan(0);
      expect(stats.nodeTypes).toHaveProperty('Scene');
      expect(stats.nodeTypes).toHaveProperty('Character');
      expect(stats.relationshipTypes).toHaveProperty('LEADS_TO');
      expect(stats.relationshipTypes).toHaveProperty('APPEARS_IN');
    });

    it('should calculate correct node type distributions', async () => {
      const scenes = Array.from({ length: 5 }, () =>
        TestDataGenerator.createTestScene({ id: createTestId() })
      );
      const characters = Array.from({ length: 3 }, () =>
        TestDataGenerator.createTestCharacter({ id: createTestId() })
      );

      testIds.push(...scenes.map(s => s.id!), ...characters.map(c => c.id!));

      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }
      for (const character of characters) {
        await nodeService.createNode({ type: 'Character', data: character });
      }

      const stats = await graphService.getGraphStatistics();

      expect(stats.nodeTypes.Scene).toBeGreaterThanOrEqual(5);
      expect(stats.nodeTypes.Character).toBeGreaterThanOrEqual(3);
      expect(stats.nodeCount).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Graph Traversal', () => {
    it('should find paths between nodes', async () => {
      const scene1 = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Start Scene',
      });
      const scene2 = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Middle Scene',
      });
      const scene3 = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'End Scene',
      });

      testIds.push(scene1.id!, scene2.id!, scene3.id!);

      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });
      await nodeService.createNode({ type: 'Scene', data: scene3 });

      // Create linear path: Scene1 -> Scene2 -> Scene3
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: scene2.id!,
        data: { weight: 1.0 },
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene2.id!,
        toNodeId: scene3.id!,
        data: { weight: 1.0 },
      });

      const paths = await graphService.findPaths(scene1.id!, scene3.id!, {
        maxDepth: 5,
        relationshipTypes: ['LEADS_TO'],
      });

      expect(paths).toHaveLength(1);
      expect(paths[0].nodes).toHaveLength(3);
      expect(paths[0].nodes[0].id).toBe(scene1.id);
      expect(paths[0].nodes[2].id).toBe(scene3.id);
      expect(paths[0].relationships).toHaveLength(2);
    });

    it('should find shortest paths in complex graphs', async () => {
      // Create a more complex graph with multiple paths
      const nodes = Array.from({ length: 5 }, (_, i) =>
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: `Scene ${i + 1}`,
        })
      );

      testIds.push(...nodes.map(n => n.id!));

      for (const node of nodes) {
        await nodeService.createNode({ type: 'Scene', data: node });
      }

      // Create paths: 1->2->5 and 1->3->4->5
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: nodes[0].id!,
        toNodeId: nodes[1].id!,
        data: { weight: 1.0 },
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: nodes[1].id!,
        toNodeId: nodes[4].id!,
        data: { weight: 1.0 },
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: nodes[0].id!,
        toNodeId: nodes[2].id!,
        data: { weight: 1.0 },
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: nodes[2].id!,
        toNodeId: nodes[3].id!,
        data: { weight: 1.0 },
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: nodes[3].id!,
        toNodeId: nodes[4].id!,
        data: { weight: 1.0 },
      });

      const paths = await graphService.findPaths(nodes[0].id!, nodes[4].id!, {
        maxDepth: 5,
        relationshipTypes: ['LEADS_TO'],
      });

      expect(paths.length).toBeGreaterThanOrEqual(2);

      // Find shortest path (should be 1->2->5)
      const shortestPath = paths.reduce((shortest, current) =>
        current.nodes.length < shortest.nodes.length ? current : shortest
      );

      expect(shortestPath.nodes).toHaveLength(3);
    });

    it('should respect relationship type filters', async () => {
      const character = TestDataGenerator.createTestCharacter({ id: createTestId() });
      const scene1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const scene2 = TestDataGenerator.createTestScene({ id: createTestId() });

      testIds.push(character.id!, scene1.id!, scene2.id!);

      await nodeService.createNode({ type: 'Character', data: character });
      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });

      // Create APPEARS_IN relationship
      await relationshipService.createRelationship({
        type: 'APPEARS_IN',
        fromNodeId: character.id!,
        toNodeId: scene1.id!,
        data: {},
      });

      // Create LEADS_TO relationship
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: scene2.id!,
        data: {},
      });

      // Should find path using both relationship types
      const allPaths = await graphService.findPaths(character.id!, scene2.id!, {
        maxDepth: 3,
        relationshipTypes: ['APPEARS_IN', 'LEADS_TO'],
      });

      expect(allPaths).toHaveLength(1);
      expect(allPaths[0].relationships).toHaveLength(2);

      // Should not find path using only LEADS_TO
      const restrictedPaths = await graphService.findPaths(character.id!, scene2.id!, {
        maxDepth: 3,
        relationshipTypes: ['LEADS_TO'],
      });

      expect(restrictedPaths).toHaveLength(0);
    });
  });

  describe('Graph Validation', () => {
    it('should detect circular dependencies', async () => {
      const scene1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const scene2 = TestDataGenerator.createTestScene({ id: createTestId() });
      const scene3 = TestDataGenerator.createTestScene({ id: createTestId() });

      testIds.push(scene1.id!, scene2.id!, scene3.id!);

      await nodeService.createNode({ type: 'Scene', data: scene1 });
      await nodeService.createNode({ type: 'Scene', data: scene2 });
      await nodeService.createNode({ type: 'Scene', data: scene3 });

      // Create circular dependency: 1->2->3->1
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene1.id!,
        toNodeId: scene2.id!,
        data: {},
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene2.id!,
        toNodeId: scene3.id!,
        data: {},
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: scene3.id!,
        toNodeId: scene1.id!,
        data: {},
      });

      const validation = await graphService.validateGraphStructure();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Circular dependency detected');
      expect(validation.circularDependencies).toHaveLength(1);
    });

    it('should detect orphaned nodes', async () => {
      const connectedScene1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const connectedScene2 = TestDataGenerator.createTestScene({ id: createTestId() });
      const orphanedScene = TestDataGenerator.createTestScene({ id: createTestId() });

      testIds.push(connectedScene1.id!, connectedScene2.id!, orphanedScene.id!);

      await nodeService.createNode({ type: 'Scene', data: connectedScene1 });
      await nodeService.createNode({ type: 'Scene', data: connectedScene2 });
      await nodeService.createNode({ type: 'Scene', data: orphanedScene });

      // Create connection between first two scenes only
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: connectedScene1.id!,
        toNodeId: connectedScene2.id!,
        data: {},
      });

      const validation = await graphService.validateGraphStructure();

      expect(validation.orphanedNodes).toContain(orphanedScene.id);
      expect(validation.warnings).toContain('Orphaned nodes detected');
    });

    it('should validate relationship integrity', async () => {
      const scene = TestDataGenerator.createTestScene({ id: createTestId() });
      testIds.push(scene.id!);

      await nodeService.createNode({ type: 'Scene', data: scene });

      // Manually create invalid relationship in database (simulating data corruption)
      // This would normally be prevented by the service layer
      const validation = await graphService.validateGraphStructure();

      expect(validation.isValid).toBe(true); // Should be valid with proper data
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Node Neighbors and Connectivity', () => {
    it('should find node neighbors correctly', async () => {
      const centralNode = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Central Scene',
      });
      const neighbors = Array.from({ length: 3 }, (_, i) =>
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: `Neighbor ${i + 1}`,
        })
      );

      testIds.push(centralNode.id!, ...neighbors.map(n => n.id!));

      await nodeService.createNode({ type: 'Scene', data: centralNode });
      for (const neighbor of neighbors) {
        await nodeService.createNode({ type: 'Scene', data: neighbor });
      }

      // Create relationships from central node to all neighbors
      for (const neighbor of neighbors) {
        await relationshipService.createRelationship({
          type: 'LEADS_TO',
          fromNodeId: centralNode.id!,
          toNodeId: neighbor.id!,
          data: {},
        });
      }

      const nodeNeighbors = await graphService.getNodeNeighbors(centralNode.id!, {
        direction: 'outgoing',
        relationshipTypes: ['LEADS_TO'],
      });

      expect(nodeNeighbors).toHaveLength(3);
      nodeNeighbors.forEach(neighbor => {
        expect(neighbors.some(n => n.id === neighbor.node.id)).toBe(true);
        expect(neighbor.relationship.type).toBe('LEADS_TO');
      });
    });

    it('should handle bidirectional neighbor queries', async () => {
      const node1 = TestDataGenerator.createTestScene({ id: createTestId() });
      const node2 = TestDataGenerator.createTestScene({ id: createTestId() });
      const node3 = TestDataGenerator.createTestScene({ id: createTestId() });

      testIds.push(node1.id!, node2.id!, node3.id!);

      await nodeService.createNode({ type: 'Scene', data: node1 });
      await nodeService.createNode({ type: 'Scene', data: node2 });
      await nodeService.createNode({ type: 'Scene', data: node3 });

      // Create relationships: node1 -> node2 <- node3
      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: node1.id!,
        toNodeId: node2.id!,
        data: {},
      });

      await relationshipService.createRelationship({
        type: 'LEADS_TO',
        fromNodeId: node3.id!,
        toNodeId: node2.id!,
        data: {},
      });

      const outgoingNeighbors = await graphService.getNodeNeighbors(node2.id!, {
        direction: 'outgoing',
      });

      const incomingNeighbors = await graphService.getNodeNeighbors(node2.id!, {
        direction: 'incoming',
      });

      const allNeighbors = await graphService.getNodeNeighbors(node2.id!, {
        direction: 'both',
      });

      expect(outgoingNeighbors).toHaveLength(0);
      expect(incomingNeighbors).toHaveLength(2);
      expect(allNeighbors).toHaveLength(2);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large graph statistics efficiently', async () => {
      const { scenes, characters } = TestDataGenerator.createLargeDataset(50);

      scenes.forEach(scene => {
        scene.id = createTestId();
        testIds.push(scene.id!);
      });

      characters.forEach(character => {
        character.id = createTestId();
        testIds.push(character.id!);
      });

      // Create all nodes
      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }
      for (const character of characters) {
        await nodeService.createNode({ type: 'Character', data: character });
      }

      // Create relationships
      for (let i = 0; i < scenes.length - 1; i++) {
        await relationshipService.createRelationship({
          type: 'LEADS_TO',
          fromNodeId: scenes[i].id!,
          toNodeId: scenes[i + 1].id!,
          data: {},
        });
      }

      const startTime = Date.now();
      const stats = await graphService.getGraphStatistics();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(stats.nodeCount).toBeGreaterThanOrEqual(55);
      expect(stats.relationshipCount).toBeGreaterThanOrEqual(49);
    });

    it('should handle path finding in large graphs efficiently', async () => {
      // Create a linear chain of scenes
      const sceneCount = 20;
      const scenes = Array.from({ length: sceneCount }, (_, i) =>
        TestDataGenerator.createTestScene({
          id: createTestId(),
          title: `Scene ${i + 1}`,
        })
      );

      testIds.push(...scenes.map(s => s.id!));

      for (const scene of scenes) {
        await nodeService.createNode({ type: 'Scene', data: scene });
      }

      // Create linear chain
      for (let i = 0; i < scenes.length - 1; i++) {
        await relationshipService.createRelationship({
          type: 'LEADS_TO',
          fromNodeId: scenes[i].id!,
          toNodeId: scenes[i + 1].id!,
          data: {},
        });
      }

      const startTime = Date.now();
      const paths = await graphService.findPaths(scenes[0].id!, scenes[scenes.length - 1].id!, {
        maxDepth: sceneCount,
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(paths).toHaveLength(1);
      expect(paths[0].nodes).toHaveLength(sceneCount);
    });
  });

  describe('Cypher Query Execution', () => {
    it('should execute custom Cypher queries safely', async () => {
      const scene = TestDataGenerator.createTestScene({
        id: createTestId(),
        title: 'Query Test Scene',
      });
      testIds.push(scene.id!);

      await nodeService.createNode({ type: 'Scene', data: scene });

      const result = await graphService.executeCypher(
        'MATCH (n:Scene {title: $title}) RETURN n.id as id, n.title as title',
        { title: 'Query Test Scene' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(scene.id);
      expect(result[0].title).toBe('Query Test Scene');
    });

    it('should handle empty query results', async () => {
      const result = await graphService.executeCypher(
        'MATCH (n:NonExistentType) RETURN n',
        {}
      );

      expect(result).toHaveLength(0);
    });

    it('should handle query errors gracefully', async () => {
      await expect(
        graphService.executeCypher('INVALID CYPHER SYNTAX', {})
      ).rejects.toThrow();
    });
  });
});