# Claude Code Configuration - Ryuk Project

This file provides Claude Code with essential information about the Ryuk manga generation system for optimal development assistance.

## 🎯 Project Overview

**Ryuk** is an AI-powered manga generation system built on a sophisticated story graph architecture. The system uses Neo4j for complex narrative relationships and provides intelligent content creation capabilities.

### Core Technologies
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: Neo4j (graph), PostgreSQL (relational), Redis (cache)
- **Frontend**: Next.js 14, React, Tailwind CSS (planned)
- **Infrastructure**: Docker, Turbo (monorepo)
- **AI Integration**: OpenAI API (planned)

## 📁 Project Structure

```
ryuk/
├── apps/
│   ├── api/                    # Express.js API Backend
│   │   ├── src/
│   │   │   ├── database/       # Database connections
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   └── utils/          # Helper functions
│   │   ├── .env               # Environment configuration
│   │   └── package.json
│   └── web/                   # Next.js Frontend (upcoming)
├── packages/
│   └── shared/                # Shared TypeScript types
│       ├── src/
│       │   ├── types/         # Type definitions
│       │   └── utils/         # Shared utilities
│       └── package.json
├── infrastructure/
│   └── neo4j/                 # Database initialization
├── docs/                      # Project documentation
├── tasks/                     # Development phases
├── docker-compose.yml         # Infrastructure setup
└── package.json              # Root workspace config
```

## 🛠️ Development Commands

### Essential Commands
```bash
# Setup and Installation
npm install                    # Install all dependencies
npm run docker:up             # Start infrastructure (Neo4j, PostgreSQL, Redis)
npm run build                 # Build all packages

# Development
npm run dev                   # Start development servers
cd apps/api && npm run dev    # Start API server only
npm run type-check           # TypeScript type checking
npm run lint                 # Lint all packages

# Database
npm run db:seed              # Seed sample data
npm run docker:logs          # View container logs

# Testing and Quality
npm run test                 # Run all tests
npm run test:watch          # Watch mode testing
```

### API-Specific Commands
```bash
cd apps/api
npm run dev                  # Development server with hot reload
npm run build               # Build for production
npm run start               # Production server
npm run type-check          # TypeScript checking
npm run test                # API tests
```

## 🗄️ Data Model

### Node Types (6 Core Types)
1. **Scene**: Narrative moments with emotional tone and panel information
2. **Character**: Story participants with roles, relationships, and development arcs
3. **Choice**: Decision points that create narrative branches
4. **Event**: Plot developments and world-building moments
5. **Location**: Settings with atmospheric details
6. **Item**: Objects that influence plot or character development

### Relationship Types (5 Core Types)
1. **LEADS_TO**: Sequential narrative flow between scenes/choices
2. **APPEARS_IN**: Character presence in scenes or events
3. **TRIGGERS**: Causal relationships between events
4. **REQUIRES**: Dependencies and prerequisites
5. **LOCATED_AT**: Spatial relationships (scenes/characters/items in locations)

### Key Properties
- All nodes have: `id`, `created_at`, `updated_at`
- Scenes: `title`, `description`, `chapter`, `sequence`, `emotional_tone`, `panel_count`
- Characters: `name`, `role`, `archetype`, `personality_traits`, `goals`
- Relationships: `weight`, `transition_type`, `causality_level`

## 🔌 API Architecture

### Endpoints Structure
```
/api/
├── nodes/                    # Node CRUD operations
├── relationships/            # Relationship management
├── graph/                    # Graph operations
│   ├── query                # Cypher query execution
│   ├── traverse            # Graph traversal
│   ├── stats               # Statistics
│   └── validate            # Structure validation
├── auth/                    # Authentication (placeholder)
└── health/                  # System health checks
```

### Service Layer
- **NodeService**: Complete CRUD for all node types with validation
- **RelationshipService**: Relationship management with compatibility checks
- **GraphService**: Graph operations, statistics, and validation

### Middleware Stack
- **Error Handling**: Comprehensive error types and HTTP status codes
- **Request Logging**: Performance monitoring with Winston
- **Validation**: Zod schemas for runtime type checking
- **Security**: Helmet, CORS, rate limiting

## 🚨 Important Development Notes

### When Working with This Project:

1. **Always Run Type Checking**: Before making changes, run `npm run type-check`
2. **Shared Package Dependencies**: The API depends on `@ryuk/shared` - build shared package first
3. **Database Dependencies**: Ensure Docker services are running (`npm run docker:up`)
4. **Environment Configuration**: Copy `.env.example` to `.env` in apps/api/

### Common Tasks:

**Adding New Node Type:**
1. Define type in `packages/shared/src/types/nodes.ts`
2. Add validation schema
3. Update constants in `packages/shared/src/utils/constants.ts`
4. Build shared package: `cd packages/shared && npm run build`
5. Update API service if needed

**Adding New Endpoint:**
1. Create route handler in `apps/api/src/routes/`
2. Add to main router in `apps/api/src/index.ts`
3. Update service layer if needed
4. Add proper error handling and validation

**Database Schema Changes:**
1. Update constraints in `infrastructure/neo4j/init/001-constraints.cypher`
2. Restart Neo4j container: `docker-compose restart neo4j`

### Debugging Tips:

- **API Issues**: Check `http://localhost:3001/api/health/detailed`
- **Database Issues**: View logs with `npm run docker:logs`
- **Type Issues**: Ensure shared package is built and linked correctly
- **Import Issues**: Use imports from `@ryuk/shared` (not subdirectories)

## 🧪 Testing Guidelines

### Test Structure
- Unit tests for services and utilities
- Integration tests for API endpoints
- Graph database tests with sample data

### Running Tests
```bash
npm run test                 # All tests
cd apps/api && npm run test  # API tests only
npm run test:watch          # Watch mode
```

## 📝 Code Style and Conventions

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- Interface definitions for complex objects
- Use Zod for runtime validation

### Naming Conventions
- **Files**: kebab-case (`node-service.ts`)
- **Functions**: camelCase (`validateNode`)
- **Types**: PascalCase (`NodeType`)
- **Constants**: SCREAMING_SNAKE_CASE (`NODE_TYPES`)

### Database Conventions
- **Node IDs**: UUID format
- **Relationship Properties**: snake_case in database, camelCase in TypeScript
- **Labels**: PascalCase (`Scene`, `Character`)
- **Relationship Types**: SCREAMING_SNAKE_CASE (`LEADS_TO`)

## 🔄 Development Workflow

### Typical Development Session:
1. Start infrastructure: `npm run docker:up`
2. Build shared package: `npm run build`
3. Start API development: `cd apps/api && npm run dev`
4. Make changes and test
5. Run type checking: `npm run type-check`
6. Commit changes with conventional commits

### Before Committing:
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Documentation updated if needed

## 🚀 Current Phase Status

**Phase 1 - Foundation (✅ Complete)**
- Monorepo setup with Turbo
- Docker infrastructure
- Neo4j database with constraints
- Complete API backend with CRUD operations
- TypeScript type safety
- Comprehensive error handling

**Next Priority Tasks:**
1. PostgreSQL setup with Prisma
2. React frontend development
3. Graph visualization component
4. Google OAuth authentication

## 🔍 When Claude Should Know

### Current Limitations:
- Authentication is placeholder implementation
- Frontend not yet implemented
- PostgreSQL integration pending
- AI features not yet implemented

### Strengths:
- Robust graph database foundation
- Complete API backend
- Type-safe development environment
- Comprehensive error handling
- Docker-based development setup

### Best Practices for This Project:
- Always validate inputs with Zod schemas
- Use the shared type system consistently
- Follow the established service layer patterns
- Maintain graph database constraints
- Keep documentation updated

---

This configuration helps Claude Code understand the project structure, development patterns, and common tasks for efficient assistance with the Ryuk manga generation system.