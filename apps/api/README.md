# Ryuk API - Backend Service

The backend API service for the Ryuk manga generation system, built with Express.js, TypeScript, and Neo4j.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose running
- Neo4j, PostgreSQL, and Redis containers started

### Development Setup

```bash
# Install dependencies
npm install

# Start infrastructure (from project root)
npm run docker:up

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

## 📚 API Documentation

### Health Check
```bash
# Basic health check
GET /api/health

# Detailed system status
GET /api/health/detailed
```

### Nodes API
```bash
# List nodes with filtering and pagination
GET /api/nodes?type=Scene&page=1&limit=20&search=battle

# Create a new node
POST /api/nodes
{
  "type": "Scene",
  "title": "Epic Battle Scene",
  "description": "Hero faces the final boss",
  "chapter": 1,
  "sequence": 5,
  "emotional_tone": "tension",
  "panel_count": 8
}

# Get specific node
GET /api/nodes/:id

# Update node
PUT /api/nodes/:id
{
  "title": "Updated Scene Title",
  "description": "Modified description"
}

# Delete node
DELETE /api/nodes/:id

# Get node relationships
GET /api/nodes/:id/relationships?direction=both
```

### Relationships API
```bash
# List relationships
GET /api/relationships?type=LEADS_TO&fromNodeId=scene-1

# Create relationship
POST /api/relationships
{
  "type": "LEADS_TO",
  "fromNodeId": "uuid-1",
  "toNodeId": "uuid-2",
  "transition_type": "sequential",
  "weight": 1.0
}

# Get specific relationship
GET /api/relationships/:id

# Update relationship
PUT /api/relationships/:id
{
  "weight": 0.8,
  "causality_level": 7
}

# Delete relationship
DELETE /api/relationships/:id
```

### Graph Operations
```bash
# Execute custom Cypher query
POST /api/graph/query
{
  "query": "MATCH (s:Scene)-[r:LEADS_TO]->(s2:Scene) RETURN s, r, s2 LIMIT 10",
  "parameters": {}
}

# Traverse graph from starting point
GET /api/graph/traverse?startNodeId=uuid&maxDepth=3&direction=outgoing&nodeTypes=Scene,Character

# Get graph statistics
GET /api/graph/stats

# Validate graph structure
POST /api/graph/validate
```

## 🏗️ Architecture

### Directory Structure
```
src/
├── database/          # Database connections and configuration
│   └── connections.ts
├── middleware/        # Express middleware
│   ├── errorHandler.ts
│   └── requestLogger.ts
├── routes/           # API route handlers
│   ├── nodes.ts
│   ├── relationships.ts
│   ├── graph.ts
│   ├── health.ts
│   └── auth.ts
├── services/         # Business logic layer
│   ├── nodeService.ts
│   ├── relationshipService.ts
│   └── graphService.ts
├── utils/           # Utility functions
│   ├── logger.ts
│   └── validateEnv.ts
└── index.ts         # Main application entry point
```

### Service Layer

**NodeService**
- Complete CRUD operations for all 6 node types
- Input validation with Zod schemas
- Business logic validation
- Pagination and filtering
- Error handling

**RelationshipService**
- Relationship CRUD with compatibility validation
- Node-relationship type compatibility checking
- Relationship traversal by node
- Proper error handling

**GraphService**
- Safe Cypher query execution
- Graph traversal with depth limits
- Graph statistics and health metrics
- Structure validation

### Error Handling

```typescript
// Custom error types
ValidationError      // 400 - Input validation failures
NotFoundError       // 404 - Resource not found
DatabaseError       // 500 - Database operation failures
AuthenticationError // 401 - Authentication required
AuthorizationError  // 403 - Insufficient permissions
```

### Validation

All inputs are validated using Zod schemas from the shared package:
- Runtime type checking
- Comprehensive error messages
- Business logic validation
- Node-relationship compatibility checks

## 🗄️ Database Integration

### Neo4j Integration
```typescript
// Connection management
const driver = getNeo4jDriver();
const session = driver.session();

// Transaction handling
await session.run(cypherQuery, parameters);
await session.close();
```

### Redis Integration
```typescript
// Caching layer
const redis = getRedisClient();
await redis.set(key, value);
const cached = await redis.get(key);
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure
```
tests/
├── unit/             # Unit tests for services
├── integration/      # API endpoint tests
└── fixtures/         # Test data and helpers
```

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
NODE_ENV=development          # Environment mode
API_PORT=3001                # Server port
LOG_LEVEL=info               # Logging level

# Database URLs
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:3000
```

### Docker Services Required
- **Neo4j**: Port 7687 (Bolt), 7474 (HTTP)
- **Redis**: Port 6379
- **PostgreSQL**: Port 5432 (future)

## 📈 Monitoring and Logging

### Health Checks
- Basic health endpoint for uptime monitoring
- Detailed health check with dependency status
- Database connectivity verification
- Performance metrics

### Logging
```typescript
// Structured logging with Winston
logger.info('Request completed', {
  method: req.method,
  url: req.url,
  statusCode: res.statusCode,
  duration: '45ms'
});
```

### Metrics
- Request/response logging
- Database query performance
- Error rate tracking
- System resource usage

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin request handling
- **Rate Limiting**: Request throttling
- **Input Validation**: Comprehensive validation
- **Error Sanitization**: Safe error responses

## 🚀 Deployment

### Production Build
```bash
# Build TypeScript
npm run build

# Start production server
npm run start
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure proper database URLs
- Set strong JWT secrets
- Enable proper logging levels

## 🔄 Development Workflow

### Making Changes
1. Ensure Docker services are running
2. Make code changes
3. TypeScript compiles automatically (watch mode)
4. Test changes with curl or API client
5. Run tests: `npm run test`
6. Check types: `npm run type-check`

### Adding New Endpoints
1. Create route handler in `src/routes/`
2. Add business logic to appropriate service
3. Add route to main application in `src/index.ts`
4. Update shared types if needed
5. Add tests

### Database Schema Changes
1. Update Neo4j constraints in project root
2. Restart Neo4j container
3. Update shared type definitions
4. Test with new data structures

## 🐛 Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
# Rebuild shared package
cd ../../packages/shared
npm run build
cd ../../apps/api
npm run dev
```

**Database connection errors:**
```bash
# Check Docker services
docker-compose ps

# View container logs
docker-compose logs neo4j
docker-compose logs redis
```

**Type checking failures:**
```bash
# Run explicit type check
npm run type-check

# Check shared package build
cd ../../packages/shared
npm run build
```

### Debug Commands
```bash
# View detailed health status
curl http://localhost:3001/api/health/detailed

# Check database connectivity
curl http://localhost:3001/api/graph/stats

# View application logs
npm run dev | grep ERROR
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Node validation failed: title is required",
    "details": { ... }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

For more information, see the main project [README](../../README.md) and [CLAUDE.md](../../CLAUDE.md) configuration.