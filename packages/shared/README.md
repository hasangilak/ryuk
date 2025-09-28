# @ryuk/shared - Shared Types and Utilities

Shared TypeScript types, validation schemas, and utilities for the Ryuk manga generation system.

## 📦 Overview

This package provides the foundational type system that ensures consistency across the entire Ryuk ecosystem. It includes:

- **TypeScript Types**: Complete type definitions for all nodes and relationships
- **Zod Schemas**: Runtime validation schemas
- **Validation Functions**: Business logic validation utilities
- **Constants**: System-wide constants and enums

## 🏗️ Package Structure

```
src/
├── types/
│   ├── nodes.ts           # Node type definitions
│   ├── relationships.ts   # Relationship type definitions
│   └── api.ts            # API-related types
├── utils/
│   ├── validation.ts     # Validation functions
│   └── constants.ts      # System constants
└── index.ts              # Main exports
```

## 🎯 Core Types

### Node Types

```typescript
import { NodeType, SceneNode, CharacterNode } from '@ryuk/shared';

// Six core node types
type NodeType = 'Scene' | 'Character' | 'Choice' | 'Event' | 'Location' | 'Item';

// Example: Scene Node
interface SceneNode {
  id: string;
  created_at: Date;
  updated_at: Date;
  title: string;
  description: string;
  chapter: number;
  sequence: number;
  emotional_tone: string;
  panel_count: number;
  duration: number;
}
```

### Relationship Types

```typescript
import { RelationshipType, LeadsToRelationship } from '@ryuk/shared';

// Five core relationship types
type RelationshipType = 'LEADS_TO' | 'APPEARS_IN' | 'TRIGGERS' | 'REQUIRES' | 'LOCATED_AT';

// Example: LEADS_TO Relationship
interface LeadsToRelationship {
  id: string;
  created_at: Date;
  updated_at: Date;
  from_node: string;
  to_node: string;
  transition_type: 'sequential' | 'choice' | 'conditional' | 'random';
  weight: number;
  causality_level: number;
}
```

## ✅ Validation System

### Schema Validation

```typescript
import { validateNode, validateRelationship } from '@ryuk/shared';

// Validate node data
const result = validateNode('Scene', sceneData);
if (result.success) {
  const validatedScene = result.data;
} else {
  console.error(result.error);
}

// Validate relationship data
const relResult = validateRelationship('LEADS_TO', relationshipData);
```

### Business Logic Validation

```typescript
import { validateNodeRelationshipCompatibility } from '@ryuk/shared';

// Check if relationship type is valid between node types
const compatibility = validateNodeRelationshipCompatibility(
  'Scene',     // from node type
  'Character', // to node type
  'APPEARS_IN' // relationship type
);

if (compatibility.valid) {
  // Safe to create relationship
} else {
  console.error(compatibility.error);
}
```

### Utility Validators

```typescript
import {
  isValidUUID,
  sanitizeString,
  validateArrayUniqueness,
  validatePositiveNumber,
  validateRange
} from '@ryuk/shared';

// UUID validation
const isValid = isValidUUID('123e4567-e89b-12d3-a456-426614174000');

// String sanitization
const clean = sanitizeString('  user input  ', 100);

// Array uniqueness
const isUnique = validateArrayUniqueness(['a', 'b', 'c']);

// Number validation
const isPositive = validatePositiveNumber(42);
const inRange = validateRange(0.5, 0, 1);
```

## 📋 Constants and Enums

### Node Type Constants

```typescript
import { NODE_TYPES, ALL_NODE_TYPES } from '@ryuk/shared';

// Available node types
NODE_TYPES.SCENE      // 'Scene'
NODE_TYPES.CHARACTER  // 'Character'
NODE_TYPES.CHOICE     // 'Choice'
NODE_TYPES.EVENT      // 'Event'
NODE_TYPES.LOCATION   // 'Location'
NODE_TYPES.ITEM       // 'Item'

// Array of all types
ALL_NODE_TYPES        // ['Scene', 'Character', 'Choice', 'Event', 'Location', 'Item']
```

### Relationship Type Constants

```typescript
import { RELATIONSHIP_TYPES, ALL_RELATIONSHIP_TYPES } from '@ryuk/shared';

RELATIONSHIP_TYPES.LEADS_TO    // 'LEADS_TO'
RELATIONSHIP_TYPES.APPEARS_IN  // 'APPEARS_IN'
RELATIONSHIP_TYPES.TRIGGERS    // 'TRIGGERS'
RELATIONSHIP_TYPES.REQUIRES    // 'REQUIRES'
RELATIONSHIP_TYPES.LOCATED_AT  // 'LOCATED_AT'
```

### Validation Limits

```typescript
import { VALIDATION_LIMITS } from '@ryuk/shared';

VALIDATION_LIMITS.TITLE_MAX_LENGTH        // 200
VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH  // 2000
VALIDATION_LIMITS.CHAPTER_MIN            // 1
VALIDATION_LIMITS.WEIGHT_MIN             // 0
VALIDATION_LIMITS.WEIGHT_MAX             // 1
```

### Error Codes

```typescript
import { ERROR_CODES } from '@ryuk/shared';

ERROR_CODES.VALIDATION_ERROR              // 'VALIDATION_ERROR'
ERROR_CODES.NOT_FOUND                     // 'NOT_FOUND'
ERROR_CODES.DATABASE_ERROR                // 'DATABASE_ERROR'
```

### HTTP Status Codes

```typescript
import { HTTP_STATUS_CODES } from '@ryuk/shared';

HTTP_STATUS_CODES.OK                      // 200
HTTP_STATUS_CODES.CREATED                 // 201
HTTP_STATUS_CODES.BAD_REQUEST             // 400
HTTP_STATUS_CODES.NOT_FOUND               // 404
HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR   // 500
```

## 🔄 Usage Examples

### Creating Validated Nodes

```typescript
import { validateNode, SceneNodeSchema } from '@ryuk/shared';

// Using validation function
const sceneData = {
  title: "Opening Scene",
  description: "The hero's journey begins",
  chapter: 1,
  sequence: 1,
  emotional_tone: "wonder",
  panel_count: 5,
  duration: 30
};

const result = validateNode('Scene', sceneData);
if (result.success) {
  // Safe to use result.data
  console.log('Valid scene:', result.data);
}

// Using Zod schema directly
try {
  const validScene = SceneNodeSchema.parse(sceneData);
  console.log('Validated scene:', validScene);
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Type-Safe API Responses

```typescript
import { ApiResponse, PaginatedResponse, NodeType } from '@ryuk/shared';

// Standard API response
interface NodeListResponse extends ApiResponse {
  data: PaginatedResponse<SceneNode>;
}

// Using in API handlers
const response: NodeListResponse = {
  success: true,
  data: {
    items: scenes,
    pagination: {
      page: 1,
      limit: 20,
      total: 100,
      total_pages: 5,
      has_next: true,
      has_prev: false
    }
  },
  timestamp: new Date()
};
```

### Relationship Compatibility

```typescript
import { validateNodeRelationshipCompatibility } from '@ryuk/shared';

// Valid combinations (returns { valid: true })
validateNodeRelationshipCompatibility('Scene', 'Scene', 'LEADS_TO');
validateNodeRelationshipCompatibility('Character', 'Scene', 'APPEARS_IN');
validateNodeRelationshipCompatibility('Scene', 'Location', 'LOCATED_AT');

// Invalid combination (returns { valid: false, error: '...' })
validateNodeRelationshipCompatibility('Scene', 'Character', 'LEADS_TO');
```

## 🔧 Development

### Building the Package

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Adding New Types

1. **Define the type/interface** in appropriate file (`types/`)
2. **Create Zod schema** for runtime validation
3. **Add to constants** if needed (`utils/constants.ts`)
4. **Export from index.ts**
5. **Build package**: `npm run build`

### Example: Adding New Node Type

```typescript
// 1. In types/nodes.ts
export const MemoryNodeSchema = BaseNodeSchema.extend({
  memory_type: z.enum(['flashback', 'dream', 'vision']),
  trigger_condition: z.string().max(500),
  clarity_level: z.number().min(0).max(1).default(1.0),
});

export type MemoryNode = z.infer<typeof MemoryNodeSchema>;

// 2. In utils/constants.ts
export const NODE_TYPES = {
  // ... existing types
  MEMORY: 'Memory',
} as const;

// 3. In index.ts
export * from './types/nodes';
export * from './utils/constants';
```

## 📦 Distribution

### Build Output
```
dist/
├── index.js          # CommonJS bundle
├── index.mjs         # ES modules bundle
├── index.d.ts        # TypeScript declarations
└── index.d.mts       # ES module declarations
```

### Import Methods

```typescript
// ES modules
import { NodeType, validateNode } from '@ryuk/shared';

// CommonJS
const { NodeType, validateNode } = require('@ryuk/shared');

// Specific imports
import type { SceneNode } from '@ryuk/shared';
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Structure
```
tests/
├── types/           # Type definition tests
├── validation/      # Validation function tests
└── constants/       # Constants and enum tests
```

## 📝 Type Safety Guidelines

1. **Always use provided types** - Don't recreate types that exist in shared
2. **Validate at boundaries** - Use validation functions when data enters the system
3. **Leverage TypeScript** - Use strict mode and proper typing
4. **Export consistently** - All public APIs should be exported from index.ts

## 🔗 Integration

### In API Backend (`apps/api`)

```typescript
import {
  NodeType,
  validateNode,
  HTTP_STATUS_CODES,
  ERROR_CODES
} from '@ryuk/shared';
```

### In Frontend (`apps/web`) - Future

```typescript
import type {
  SceneNode,
  ApiResponse,
  PaginatedResponse
} from '@ryuk/shared';
```

---

This shared package ensures type safety and validation consistency across the entire Ryuk manga generation system.