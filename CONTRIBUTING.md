# Contributing to Ryuk

Thank you for your interest in contributing to the Ryuk manga generation system! This document provides guidelines and instructions for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git
- Basic understanding of TypeScript, React, and Neo4j

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/ryuk.git
   cd ryuk
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit .env with your configuration
   ```

4. **Start Infrastructure**
   ```bash
   npm run docker:up
   ```

5. **Build and Start**
   ```bash
   npm run build
   cd apps/api && npm run dev
   ```

## 📋 Development Guidelines

### Code Style

**TypeScript Standards:**
- Use strict mode
- Provide explicit return types for functions
- Use interfaces for object shapes
- Prefer `const` assertions for immutable data
- Use meaningful variable and function names

**Naming Conventions:**
- **Files**: kebab-case (`node-service.ts`)
- **Functions/Variables**: camelCase (`validateNode`, `nodeService`)
- **Types/Interfaces**: PascalCase (`NodeType`, `SceneNode`)
- **Constants**: SCREAMING_SNAKE_CASE (`NODE_TYPES`, `HTTP_STATUS_CODES`)
- **Database Labels**: PascalCase (`Scene`, `Character`)
- **Relationship Types**: SCREAMING_SNAKE_CASE (`LEADS_TO`, `APPEARS_IN`)

**Code Organization:**
- Group related functionality in modules
- Use barrel exports (`index.ts`) for clean imports
- Keep functions focused and single-purpose
- Add JSDoc comments for public APIs

### Git Workflow

**Branch Naming:**
- Feature branches: `feature/short-description`
- Bug fixes: `fix/short-description`
- Documentation: `docs/short-description`
- Refactoring: `refactor/short-description`

**Commit Messages:**
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(api): add node traversal endpoint
fix(validation): correct relationship type checking
docs(readme): update installation instructions
refactor(services): extract common validation logic
test(nodes): add integration tests for CRUD operations
```

**Pull Request Process:**
1. Create feature branch from `main`
2. Make changes with appropriate tests
3. Ensure all checks pass
4. Update documentation if needed
5. Submit PR with clear description

## 🧪 Testing Guidelines

### Test Structure
```
tests/
├── unit/              # Unit tests for individual functions
├── integration/       # API endpoint tests
├── e2e/              # End-to-end workflow tests
└── fixtures/         # Test data and helpers
```

### Testing Standards

**Unit Tests:**
- Test individual functions in isolation
- Mock external dependencies
- Use descriptive test names
- Aim for high coverage on business logic

**Integration Tests:**
- Test API endpoints with real database
- Use test database containers
- Clean up test data after each test
- Test error conditions and edge cases

**Test Data:**
- Use factories for generating test data
- Keep test data minimal but realistic
- Use consistent IDs for easier debugging

### Running Tests

```bash
# All tests
npm run test

# Specific package
cd apps/api && npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📦 Package Structure

### Adding to Shared Package

When adding new types or utilities to `@ryuk/shared`:

1. **Define Types** in appropriate file:
   ```typescript
   // packages/shared/src/types/nodes.ts
   export interface NewNodeType extends BaseNode {
     specific_property: string;
   }
   ```

2. **Create Zod Schema**:
   ```typescript
   export const NewNodeSchema = BaseNodeSchema.extend({
     specific_property: z.string().min(1).max(100),
   });
   ```

3. **Add Constants** if needed:
   ```typescript
   // packages/shared/src/utils/constants.ts
   export const NEW_NODE_CONSTANTS = {
     MAX_ITEMS: 50,
   } as const;
   ```

4. **Export from Index**:
   ```typescript
   // packages/shared/src/index.ts
   export * from './types/nodes';
   export * from './utils/constants';
   ```

5. **Build Package**:
   ```bash
   cd packages/shared && npm run build
   ```

### API Development

**Adding New Endpoints:**

1. **Create Route Handler**:
   ```typescript
   // apps/api/src/routes/new-feature.ts
   import { Router } from 'express';

   const router = Router();

   router.get('/', async (req, res, next) => {
     // Implementation
   });

   export default router;
   ```

2. **Add Business Logic**:
   ```typescript
   // apps/api/src/services/newFeatureService.ts
   export class NewFeatureService {
     async performOperation(): Promise<Result> {
       // Implementation
     }
   }
   ```

3. **Register Route**:
   ```typescript
   // apps/api/src/index.ts
   import newFeatureRoutes from './routes/new-feature';
   app.use('/api/new-feature', newFeatureRoutes);
   ```

4. **Add Tests**:
   ```typescript
   // apps/api/tests/integration/new-feature.test.ts
   describe('New Feature API', () => {
     it('should handle basic operation', async () => {
       // Test implementation
     });
   });
   ```

## 🔧 Database Development

### Neo4j Schema Changes

1. **Update Constraints**:
   ```cypher
   # infrastructure/neo4j/init/001-constraints.cypher
   CREATE CONSTRAINT new_node_id IF NOT EXISTS
   FOR (n:NewNode) REQUIRE n.id IS UNIQUE;
   ```

2. **Add Sample Data**:
   ```cypher
   # infrastructure/neo4j/init/002-sample-data.cypher
   CREATE (n:NewNode {
     id: 'sample-new-node-1',
     created_at: datetime(),
     updated_at: datetime(),
     name: 'Sample New Node'
   });
   ```

3. **Restart Database**:
   ```bash
   docker-compose restart neo4j
   ```

### Database Best Practices

- Always use UUIDs for node IDs
- Include `created_at` and `updated_at` timestamps
- Use meaningful property names
- Add appropriate indexes for query performance
- Validate data at application layer

## 📝 Documentation

### Code Documentation

**JSDoc Standards:**
```typescript
/**
 * Validates a node against its type schema
 * @param nodeType - The type of node to validate
 * @param data - The node data to validate
 * @returns Validation result with data or error
 * @example
 * ```typescript
 * const result = validateNode('Scene', sceneData);
 * if (result.success) {
 *   console.log('Valid:', result.data);
 * }
 * ```
 */
export function validateNode(
  nodeType: NodeType,
  data: any
): ValidationResult {
  // Implementation
}
```

**README Updates:**
- Update relevant README files when adding features
- Include code examples for new APIs
- Update installation/setup instructions if needed
- Add troubleshooting information for common issues

### API Documentation

- Document all endpoints with examples
- Include request/response schemas
- Add error response examples
- Update OpenAPI/Swagger specs if applicable

## 🚨 Quality Checks

### Before Submitting PR

Run the following checks:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm run test

# Build verification
npm run build
```

### Code Review Checklist

**Functionality:**
- [ ] Code solves the intended problem
- [ ] Edge cases are handled appropriately
- [ ] Error handling is comprehensive
- [ ] Performance considerations are addressed

**Quality:**
- [ ] Code follows project conventions
- [ ] Functions are focused and single-purpose
- [ ] Type safety is maintained
- [ ] Tests provide adequate coverage

**Documentation:**
- [ ] Public APIs are documented
- [ ] README updates are included
- [ ] Breaking changes are noted
- [ ] Examples are provided for new features

## 🐛 Bug Reports

### Creating Issues

**Bug Report Template:**
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [macOS/Windows/Linux]
- Node.js version: [18.x.x]
- npm version: [9.x.x]
- Docker version: [20.x.x]

## Additional Context
Any other relevant information
```

### Debugging Guidelines

**Common Issues:**

1. **Module Resolution Errors**:
   ```bash
   cd packages/shared && npm run build
   ```

2. **Database Connection Issues**:
   ```bash
   npm run docker:logs
   curl http://localhost:3001/api/health/detailed
   ```

3. **Type Checking Failures**:
   ```bash
   npm run type-check
   # Check shared package is built
   ```

## 💡 Feature Requests

### Proposal Process

1. **Check Existing Issues** - Search for similar requests
2. **Create Detailed Issue** - Use feature request template
3. **Discussion** - Engage with maintainers and community
4. **Implementation** - Follow development guidelines
5. **Documentation** - Update relevant docs

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Implementation
High-level approach to implementing this feature

## Alternatives Considered
Other approaches that were considered

## Additional Context
Any other relevant information
```

## 🙏 Recognition

Contributors will be recognized in:
- Project README
- Release notes for significant contributions
- Special thanks for major features or fixes

## 📞 Getting Help

- **Documentation**: Check `/docs` directory and README files
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join project discussions and code reviews

---

Thank you for contributing to Ryuk! Your efforts help make manga creation more accessible and powerful for creators worldwide.