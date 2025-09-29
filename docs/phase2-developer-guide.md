# Phase 2 Developer Guide

## Quick Start

This guide helps developers quickly get up to speed with Phase 2 Story Graph Architecture features and provides practical examples for common use cases.

## Prerequisites

- Completed Phase 1 setup
- Basic understanding of graph databases (Neo4j)
- TypeScript/Node.js development experience
- Familiarity with the Ryuk project structure

## Development Setup

### 1. Environment Configuration

```bash
# Clone and setup (if not already done)
git clone <repository-url>
cd ryuk
npm install

# Start infrastructure
npm run docker:up

# Build shared packages
npm run build

# Start development server
cd apps/api && npm run dev
```

### 2. Phase 2 Feature Flags

Ensure Phase 2 features are enabled in your environment:

```bash
# apps/api/.env
PHASE2_ENABLED=true
NARRATIVE_CONSISTENCY_ENABLED=true
CONTENT_ELEMENTS_ENABLED=true
CHOICE_TEMPLATES_ENABLED=true
VIEWPOINT_SWITCHING_ENABLED=true
PARALLEL_TIMELINES_ENABLED=true
COMMUNITY_DETECTION_ENABLED=true
PERFORMANCE_OPTIMIZATION_ENABLED=true
```

## Service Integration Guide

### Importing Services

```typescript
// Import all Phase 2 services
import { NarrativeConsistencyService } from '../services/narrativeConsistencyService';
import { ContentElementService } from '../services/contentElementService';
import { ChoiceTemplateService } from '../services/choiceTemplateService';
import { ViewpointSwitchingService } from '../services/viewpointSwitchingService';
import { ParallelTimelineService } from '../services/parallelTimelineService';
import { CommunityDetectionService } from '../services/communityDetectionService';
import { PerformanceOptimizationService } from '../services/performanceOptimizationService';

// Initialize services with dependencies
const graphService = new GraphService();
const nodeService = new NodeService(graphService);
const relationshipService = new RelationshipService(graphService);

const narrativeConsistency = new NarrativeConsistencyService(nodeService, relationshipService, graphService);
const contentElements = new ContentElementService(nodeService, relationshipService, graphService);
// ... initialize other services
```

## Common Development Patterns

### 1. Story Validation Workflow

```typescript
async function validateAndFixStory(storyId: string) {
  // Step 1: Run comprehensive validation
  const consistencyResult = await narrativeConsistency.validateStoryConsistency(storyId);

  if (!consistencyResult.is_consistent) {
    console.log('Story has consistency issues');

    // Step 2: Generate detailed report
    const report = await narrativeConsistency.generateConsistencyReport(storyId);

    // Step 3: Handle violations by severity
    const criticalViolations = report.detailed_analysis.violations.filter(v => v.severity === 'critical');

    for (const violation of criticalViolations) {
      console.log(`CRITICAL: ${violation.description}`);
      console.log(`Suggestion: ${violation.suggested_resolution}`);

      // Implement auto-fix logic based on violation type
      switch (violation.violation_type) {
        case 'character_behavior_inconsistency':
          await fixCharacterBehavior(violation);
          break;
        case 'timeline_contradiction':
          await fixTimelineIssue(violation);
          break;
        // Add more auto-fix cases
      }
    }

    // Step 4: Re-validate after fixes
    const revalidation = await narrativeConsistency.validateStoryConsistency(storyId);
    console.log(`Post-fix consistency: ${revalidation.confidence_score}`);
  }
}

async function fixCharacterBehavior(violation: any) {
  // Example auto-fix for character behavior
  const characterId = violation.related_nodes[0];
  const character = await nodeService.getNode('Character', characterId);

  // Remove conflicting personality traits
  const traits = character.personality_traits.filter(trait =>
    !violation.conflicting_elements.includes(trait)
  );

  await nodeService.updateNode('Character', characterId, {
    personality_traits: traits
  });
}
```

### 2. Content Generation Pipeline

```typescript
async function generateRichSceneContent(sceneId: string) {
  // Step 1: Analyze scene context
  const scene = await nodeService.getNode('Scene', sceneId);
  const characters = await getSceneCharacters(sceneId);

  // Step 2: Generate choices using templates
  const choiceRequest = {
    scene_id: sceneId,
    desired_count: 4,
    categories: ['dialogue', 'action', 'emotional'],
    generation_mode: 'contextual',
    parameters: {
      emotional_tone: scene.emotional_tone,
      character_count: characters.length,
      scene_type: 'conflict'
    }
  };

  const generatedChoices = await choiceTemplates.generateChoices(choiceRequest);

  // Step 3: Create content elements for each choice
  const contentElements = [];

  for (let i = 0; i < generatedChoices.length; i++) {
    const choice = generatedChoices[i];

    // Create choice content element
    const choiceElement = await contentElements.createContentElement({
      stitch_id: scene.stitch_id, // Assuming scene belongs to a stitch
      content_type: 'choice',
      sequence_order: i + 1,
      content_data: {
        choice_text: choice.choice_data.text,
        consequence_preview: choice.choice_data.consequence_preview,
        choice_id: choice.choice_data.id,
        template_id: choice.template_id
      },
      rendering_hints: {
        display_style: 'interactive_button',
        timing: 0, // Available immediately
        interactive: true
      },
      accessibility_options: {
        keyboard_navigation: true,
        screen_reader_text: `Choice ${i + 1}: ${choice.choice_data.text}`
      }
    });

    contentElements.push(choiceElement);
  }

  // Step 4: Create narrative text content
  const narrativeElement = await contentElements.createContentElement({
    stitch_id: scene.stitch_id,
    content_type: 'text',
    sequence_order: 0, // Before choices
    content_data: {
      text: scene.description,
      formatting: 'narrative',
      emotional_markers: [scene.emotional_tone]
    },
    rendering_hints: {
      display_style: 'paragraph',
      timing: 2000,
      animation: 'fade_in'
    }
  });

  return {
    narrative: narrativeElement,
    choices: contentElements
  };
}
```

### 3. Advanced Viewpoint Management

```typescript
async function manageComplexViewpointSequence(storyId: string) {
  // Step 1: Analyze current viewpoint distribution
  const characters = await getStoryCharacters(storyId);
  const viewpointHistory = await Promise.all(
    characters.map(char =>
      viewpointSwitching.getCharacterViewpointHistory(char.id, storyId)
    )
  );

  // Step 2: Identify underutilized viewpoint characters
  const underutilizedCharacters = viewpointHistory
    .filter(history => history.viewpoint_percentage < 15)
    .filter(history => characters.find(c => c.id === history.characterId)?.role !== 'supporting');

  // Step 3: Generate optimization suggestions
  const optimizations = await viewpointSwitching.analyzeViewpointOptimization(storyId);

  // Step 4: Implement suggested viewpoint switches
  for (const suggestion of optimizations) {
    if (suggestion.type === 'switch_viewpoint' && suggestion.narrative_benefit > 0.8) {

      // Create viewpoint configuration for target character
      const targetCharacter = await nodeService.getNode('Character', suggestion.target_character_id);

      const viewpointConfig = {
        story_id: storyId,
        viewpoint_type: determineOptimalViewpointType(targetCharacter),
        primary_character_id: suggestion.target_character_id,
        secondary_characters: await getRelatedCharacters(suggestion.target_character_id),
        accessibility_rules: generateAccessibilityRules(targetCharacter),
        narrative_distance: 'close',
        tense: 'present',
        voice_characteristics: generateVoiceCharacteristics(targetCharacter),
        restrictions: generateRestrictions(targetCharacter)
      };

      await viewpointSwitching.createViewpointConfiguration(viewpointConfig);

      // Request the viewpoint switch
      const switchRequest = {
        current_scene_id: suggestion.scene_id,
        target_character_id: suggestion.target_character_id,
        narrative_justification: suggestion.reasoning,
        maintain_continuity: true,
        reader_preparation_needed: true
      };

      const transition = await viewpointSwitching.requestViewpointSwitch(switchRequest);
      console.log(`Viewpoint switched: ${transition.id}`);
    }
  }
}

function determineOptimalViewpointType(character: any) {
  // Business logic to determine best viewpoint type
  switch (character.role) {
    case 'protagonist':
      return character.personality_traits.includes('introspective') ?
        'first_person' : 'third_person_limited';
    case 'antagonist':
      return 'third_person_limited'; // Limited access to maintain mystery
    default:
      return 'third_person_limited';
  }
}
```

### 4. Timeline Coordination

```typescript
async function createComplexTimelineStructure(storyId: string) {
  // Step 1: Create main timeline
  const mainTimeline = await parallelTimelines.createTimeline({
    story_id: storyId,
    name: 'Main Narrative',
    description: 'Primary story progression',
    timeline_type: 'main',
    temporal_anchor: {
      reference_type: 'absolute',
      reference_point: new Date('2024-01-01'),
      time_scale: 'days'
    },
    synchronization_rules: {
      sync_type: 'strict',
      checkpoint_scenes: [],
      temporal_constraints: []
    },
    metadata: {
      priority: 10,
      visibility: 'public',
      tags: ['main', 'primary'],
      created_by: 'system',
      last_modified: new Date()
    }
  });

  // Step 2: Create parallel character timeline
  const characterBackstory = await parallelTimelines.createTimeline({
    story_id: storyId,
    name: 'Character Backstory',
    description: 'Protagonist background events',
    timeline_type: 'flashback',
    parent_timeline_id: mainTimeline.id,
    temporal_anchor: {
      reference_type: 'relative',
      reference_point: mainTimeline.id,
      time_scale: 'years',
      duration: 15
    },
    synchronization_rules: {
      sync_type: 'loose',
      checkpoint_scenes: [],
      temporal_constraints: [{
        constraint_type: 'before',
        target_timeline_id: mainTimeline.id,
        offset: 0,
        flexibility: 0.1
      }]
    },
    metadata: {
      priority: 7,
      visibility: 'conditional',
      tags: ['backstory', 'character_development'],
      created_by: 'author',
      last_modified: new Date()
    }
  });

  // Step 3: Create synchronization points
  const syncPoint = await parallelTimelines.createSyncPoint({
    name: 'Revelation Moment',
    description: 'When backstory connects to present',
    sync_type: 'hard',
    participating_timelines: [mainTimeline.id, characterBackstory.id],
    temporal_position: {
      [mainTimeline.id]: 0.6, // 60% through main story
      [characterBackstory.id]: 1.0 // End of backstory
    },
    convergence_data: {
      character_states: {
        protagonist_realization: true,
        emotional_state: 'enlightened'
      },
      world_state: {},
      narrative_state: {
        mystery_revealed: true,
        plot_advancement: 'major'
      }
    }
  });

  // Step 4: Populate timelines with events
  const storyEvents = await getStoryEvents(storyId);

  for (const event of storyEvents) {
    // Determine which timeline this event belongs to
    const timelineId = classifyEventTimeline(event, mainTimeline.id, characterBackstory.id);
    const temporalPosition = calculateTemporalPosition(event);

    await parallelTimelines.addEventToTimeline(timelineId, event.id, temporalPosition);
  }

  // Step 5: Synchronize and validate
  const syncResult = await parallelTimelines.synchronizeTimelines([
    mainTimeline.id,
    characterBackstory.id
  ], false);

  if (!syncResult.success) {
    console.warn('Timeline synchronization issues:', syncResult.conflicts);
    // Handle synchronization conflicts
    await handleTimelineConflicts(syncResult.conflicts);
  }

  return {
    main: mainTimeline,
    backstory: characterBackstory,
    sync_point: syncPoint,
    sync_result: syncResult
  };
}
```

### 5. Community-Driven Story Analysis

```typescript
async function analyzeStoryStructure(storyId: string) {
  // Step 1: Detect multiple types of communities
  const algorithms = ['louvain', 'leiden', 'narrative_clustering'];
  const analyses = await Promise.all(
    algorithms.map(algorithm =>
      communityDetection.detectCommunities(storyId, {
        algorithm,
        parameters: { min_community_size: 2, resolution: 1.0 },
        filters: { node_types: ['Character', 'Scene', 'Event'] },
        analysis_depth: 'comprehensive'
      })
    )
  );

  // Step 2: Compare and merge insights
  const mergedInsights = mergeAnalyses(analyses);

  // Step 3: Identify structural opportunities
  const opportunities = [];

  // Check for isolated characters
  const isolatedCharacters = findIsolatedCharacters(mergedInsights);
  if (isolatedCharacters.length > 0) {
    opportunities.push({
      type: 'character_integration',
      description: 'Some characters lack strong community connections',
      affected_characters: isolatedCharacters,
      suggestion: 'Consider adding scenes that connect these characters to main groups'
    });
  }

  // Check for weak plot threads
  const weakPlotThreads = findWeakPlotThreads(mergedInsights);
  if (weakPlotThreads.length > 0) {
    opportunities.push({
      type: 'plot_strengthening',
      description: 'Some plot threads have weak causal connections',
      affected_threads: weakPlotThreads,
      suggestion: 'Strengthen causal relationships between events'
    });
  }

  // Check for thematic coherence
  const thematicIssues = analyzeThematicCoherence(mergedInsights);
  if (thematicIssues.length > 0) {
    opportunities.push({
      type: 'thematic_coherence',
      description: 'Thematic elements could be better distributed',
      issues: thematicIssues,
      suggestion: 'Redistribute thematic elements for better balance'
    });
  }

  // Step 4: Generate actionable recommendations
  const recommendations = await generateStructuralRecommendations(opportunities);

  return {
    community_analyses: analyses,
    merged_insights: mergedInsights,
    structural_opportunities: opportunities,
    recommendations: recommendations
  };
}

function mergeAnalyses(analyses: any[]) {
  // Implement logic to merge multiple community detection results
  const communities = new Map();

  for (const analysis of analyses) {
    for (const community of analysis.communities) {
      const key = community.members.sort().join('|');
      if (!communities.has(key)) {
        communities.set(key, []);
      }
      communities.get(key).push(community);
    }
  }

  // Return communities found by multiple algorithms (more reliable)
  return Array.from(communities.values())
    .filter(communityGroup => communityGroup.length >= 2)
    .map(communityGroup => mergeCommunityGroup(communityGroup));
}
```

### 6. Performance-Conscious Development

```typescript
async function performanceAwareOperation(storyId: string) {
  // Step 1: Check current performance state
  const metrics = await performanceOptimization.getPerformanceMetrics();

  if (metrics.system_health.memory_pressure > 0.8) {
    console.warn('High memory pressure detected, optimizing before operation');
    await performanceOptimization.optimizeMemory();
  }

  // Step 2: Use caching for expensive operations
  const cacheKey = `story_analysis_${storyId}`;

  const result = await performanceOptimization.getCachedOrExecute(
    'community_detection',
    cacheKey,
    async () => {
      // Expensive operation
      return await communityDetection.detectCommunities(storyId, {
        algorithm: 'louvain',
        parameters: { min_community_size: 3 },
        filters: {},
        analysis_depth: 'comprehensive'
      });
    }
  );

  // Step 3: Monitor operation impact
  const postMetrics = await performanceOptimization.getPerformanceMetrics();

  if (postMetrics.query_performance.average_query_time > metrics.query_performance.average_query_time * 1.5) {
    console.warn('Operation significantly impacted query performance');

    // Get optimization recommendations
    const recommendations = await performanceOptimization.generateOptimizationRecommendations();
    console.log('Performance recommendations:', recommendations);
  }

  return result;
}

// Use performance benchmarking for critical operations
async function benchmarkCriticalOperation() {
  const benchmark = await performanceOptimization.benchmarkService(
    'narrative_consistency_validation',
    async () => {
      return await narrativeConsistency.validateStoryConsistency('test-story-id');
    },
    10 // Run 10 iterations
  );

  console.log(`Average time: ${benchmark.average_time}ms`);
  console.log(`Operations per second: ${benchmark.operations_per_second}`);

  if (benchmark.average_time > 2000) {
    console.warn('Operation is too slow, consider optimization');
  }
}
```

## Testing Your Phase 2 Code

### Unit Testing Example

```typescript
// Example unit test for custom service
import { describe, test, expect, beforeEach } from '@jest/jest';
import { CustomNarrativeService } from '../services/customNarrativeService';

describe('CustomNarrativeService', () => {
  let service: CustomNarrativeService;

  beforeEach(() => {
    service = new CustomNarrativeService(mockDependencies);
  });

  test('should validate story consistency', async () => {
    const result = await service.validateCustomLogic('test-story-id');

    expect(result.is_valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('should handle performance optimization', async () => {
    const cached = await service.getCachedResult('test-key');
    const direct = await service.getDirectResult('test-key');

    expect(cached).toEqual(direct);
    // Cached result should be faster
  });
});
```

### Integration Testing

```typescript
// Test multiple services working together
describe('Phase 2 Integration', () => {
  test('should handle complete narrative workflow', async () => {
    // 1. Validate consistency
    const consistency = await narrativeConsistency.validateStoryConsistency(testStoryId);
    expect(consistency.is_consistent).toBe(true);

    // 2. Generate content
    const choices = await choiceTemplates.generateChoices({
      scene_id: testSceneId,
      desired_count: 3,
      generation_mode: 'balanced'
    });
    expect(choices.length).toBe(3);

    // 3. Analyze communities
    const communities = await communityDetection.detectCommunities(testStoryId, defaultConfig);
    expect(communities.communities.length).toBeGreaterThan(0);

    // 4. Check performance impact
    const metrics = await performanceOptimization.getPerformanceMetrics();
    expect(metrics.system_health.cpu_usage).toBeLessThan(90);
  });
});
```

## Best Practices

### 1. Error Handling

```typescript
async function robustServiceCall() {
  try {
    const result = await narrativeConsistency.validateStoryConsistency(storyId);
    return result;
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      console.error('Validation failed:', error.message);
      // Handle validation-specific errors
      return { is_consistent: false, errors: [error.message] };
    } else if (error.code === 'NOT_FOUND') {
      console.error('Story not found:', storyId);
      // Handle missing story
      throw new Error(`Story ${storyId} does not exist`);
    } else {
      console.error('Unexpected error:', error);
      // Handle unknown errors
      throw error;
    }
  }
}
```

### 2. Performance Monitoring

```typescript
// Wrap expensive operations with monitoring
async function monitoredOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    const result = await operation();

    const duration = Date.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    console.log(`${operationName} completed in ${duration}ms, memory delta: ${memoryDelta} bytes`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${operationName} failed after ${duration}ms:`, error.message);
    throw error;
  }
}

// Usage
const result = await monitoredOperation(
  'story_validation',
  () => narrativeConsistency.validateStoryConsistency(storyId)
);
```

### 3. Caching Strategy

```typescript
// Implement intelligent caching
class IntelligentCache {
  private cache = new Map();

  async getOrCompute<T>(
    key: string,
    computer: () => Promise<T>,
    ttl: number = 3600,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && this.isFresh(cached, ttl)) {
      return cached.value;
    }

    // Compute new value
    const value = await computer();

    // Store with metadata
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      priority,
      accessCount: 1
    });

    return value;
  }

  private isFresh(cached: any, ttl: number): boolean {
    return (Date.now() - cached.timestamp) < (ttl * 1000);
  }
}
```

### 4. Configuration Management

```typescript
// Centralized configuration for Phase 2 features
interface Phase2Config {
  narrativeConsistency: {
    enableAutoFix: boolean;
    validationDepth: 'basic' | 'detailed' | 'comprehensive';
    cacheResults: boolean;
  };
  contentElements: {
    maxConcurrentRenders: number;
    defaultFormat: string;
    enableAccessibility: boolean;
  };
  choiceTemplates: {
    defaultGenerationMode: 'balanced' | 'weighted' | 'contextual';
    cacheTemplates: boolean;
    maxChoicesPerRequest: number;
  };
  performance: {
    enableMonitoring: boolean;
    memoryOptimizationThreshold: number;
    cacheEvictionPolicy: 'lru' | 'lfu' | 'ttl';
  };
}

const config: Phase2Config = {
  narrativeConsistency: {
    enableAutoFix: process.env.NODE_ENV === 'development',
    validationDepth: 'detailed',
    cacheResults: true
  },
  contentElements: {
    maxConcurrentRenders: 5,
    defaultFormat: 'html',
    enableAccessibility: true
  },
  choiceTemplates: {
    defaultGenerationMode: 'contextual',
    cacheTemplates: true,
    maxChoicesPerRequest: 10
  },
  performance: {
    enableMonitoring: true,
    memoryOptimizationThreshold: 0.8,
    cacheEvictionPolicy: 'lru'
  }
};
```

## Debugging Tips

### 1. Enable Debug Logging

```bash
export DEBUG=ryuk:phase2:*
export LOG_LEVEL=debug
npm run dev
```

### 2. Performance Debugging

```typescript
// Add performance checkpoints
async function debugPerformance() {
  console.time('story_validation');
  const result = await narrativeConsistency.validateStoryConsistency(storyId);
  console.timeEnd('story_validation');

  // Check memory usage
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', {
    heap: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  });

  return result;
}
```

### 3. Cache Debugging

```typescript
// Debug cache behavior
const cacheStats = performanceOptimization.getCacheStatistics();
console.log('Cache statistics:', cacheStats);

// Clear specific cache if needed
performanceOptimization.invalidateCache('narrative_consistency', 'story_.*');
```

## Common Issues and Solutions

### Issue: High Memory Usage

**Solution**: Enable automatic memory optimization and check for memory leaks.

```typescript
// Monitor memory trends
setInterval(async () => {
  const metrics = await performanceOptimization.getPerformanceMetrics();
  if (metrics.memory_usage.heap_used / metrics.memory_usage.heap_total > 0.85) {
    console.warn('High memory usage detected');
    await performanceOptimization.optimizeMemory();
  }
}, 60000); // Check every minute
```

### Issue: Slow Query Performance

**Solution**: Optimize database queries and enable caching.

```typescript
// Analyze slow queries
const metrics = await performanceOptimization.getPerformanceMetrics();
const slowQueries = metrics.query_performance.slow_queries;

for (const query of slowQueries) {
  console.log(`Slow query: ${query.query} (${query.execution_time}ms)`);
  console.log('Suggestions:', query.optimization_suggestions);
}
```

### Issue: Inconsistent Validation Results

**Solution**: Check cache consistency and validation rules.

```typescript
// Force fresh validation
performanceOptimization.invalidateCache('narrative_consistency');
const freshResult = await narrativeConsistency.validateStoryConsistency(storyId);
```

## Contributing to Phase 2

### Adding New Features

1. Create service in `apps/api/src/services/`
2. Add types to `packages/shared/src/types/`
3. Update validation in `packages/shared/src/utils/validation.ts`
4. Add tests in `apps/api/src/tests/`
5. Update documentation

### Code Style Guidelines

- Use TypeScript strict mode
- Implement comprehensive error handling
- Add performance monitoring for expensive operations
- Include accessibility considerations
- Write comprehensive tests
- Document public APIs

---

*This developer guide covers practical implementation patterns for Phase 2 features. For architectural details, see [phase2-architecture.md](./phase2-architecture.md).*