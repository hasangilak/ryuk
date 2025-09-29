# Ryuk - AI-Powered Manga Generation System

![Phase](https://img.shields.io/badge/Phase-1%20Foundation-green)
![Version](https://img.shields.io/badge/Version-0.1.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

An intelligent manga generation system that uses sophisticated story graph architecture to create compelling narratives with AI assistance. Built with Neo4j graph database for complex narrative relationships and modern web technologies.

## 🌟 Overview

Ryuk transforms the manga creation process by providing:

- **Story Graph Architecture**: Complex narrative structures using Neo4j
- **AI-Powered Generation**: Intelligent content creation and scene generation
- **Interactive Development**: Real-time story graph visualization and editing
- **Hierarchical Organization**: Story → Knot → Stitch → Content structure
- **Character Development**: Deep character relationships and progression tracking

## 🏗️ Architecture

```
ryuk/
├── apps/
│   ├── api/           # Express.js Backend API
│   └── web/           # Next.js Frontend (Coming Soon)
├── packages/
│   └── shared/        # Shared TypeScript types and utilities
├── infrastructure/
│   └── neo4j/         # Database initialization scripts
├── docs/              # Project documentation
└── tasks/             # Phase-based development tasks
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd ryuk
npm install
```

### 2. Environment Setup

```bash
# Copy environment file
cp apps/api/.env.example apps/api/.env

# Edit with your configuration
nano apps/api/.env
```

### 3. Start Infrastructure

```bash
# Start databases (Neo4j, PostgreSQL, Redis)
npm run docker:up

# Wait for services to be ready (~30 seconds)
```

### 4. Build and Start

```bash
# Build shared packages
npm run build

# Start API development server
cd apps/api
npm run dev
```

### 5. Verify Installation

```bash
# Check API health
curl http://localhost:3001/api/health

# View API documentation
open http://localhost:3001/api/docs
```

## 📚 Core Concepts

### Story Graph Structure

**Nodes (6 Types):**
- **Scene**: Core narrative moments with emotional tone and visual elements
- **Character**: Protagonists, antagonists, and supporting cast with relationships
- **Choice**: Decision points that branch the narrative
- **Event**: Plot developments and world-building moments
- **Location**: Settings with atmospheric and contextual details
- **Item**: Objects that drive plot or character development

**Relationships (5 Types):**
- **LEADS_TO**: Sequential narrative flow
- **APPEARS_IN**: Character presence in scenes/events
- **TRIGGERS**: Causal event chains
- **REQUIRES**: Dependencies and prerequisites
- **LOCATED_AT**: Spatial relationships

### Hierarchical Organization

```
Story (Top Level)
├── Knot 1 (Chapter/Arc)
│   ├── Stitch 1.1 (Scene Sequence)
│   │   ├── Scene A
│   │   ├── Choice Point
│   │   └── Scene B
│   └── Stitch 1.2
└── Knot 2
```

## 🛠️ Development

### Available Scripts

```bash
# Root commands
npm run build          # Build all packages
npm run dev            # Start development servers
npm run lint           # Lint all packages
npm run test           # Run all tests
npm run type-check     # TypeScript type checking

# Docker commands
npm run docker:up      # Start infrastructure
npm run docker:down    # Stop infrastructure
npm run docker:logs    # View container logs

# Database commands
npm run db:seed        # Seed sample data
npm run db:migrate     # Run migrations
```

### API Development

```bash
cd apps/api

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Run production server
npm run start

# Run tests
npm run test
```

### Project Structure

```
apps/api/src/
├── database/          # Neo4j and Redis connections
├── middleware/        # Express middleware (auth, error handling)
├── routes/           # API endpoints
├── services/         # Business logic layer
└── utils/            # Utilities and helpers

packages/shared/src/
├── types/            # TypeScript type definitions
└── utils/            # Validation and constants
```

## 🔌 API Endpoints

### Core Operations

```bash
# Nodes
GET    /api/nodes              # List nodes with filtering
POST   /api/nodes              # Create new node
GET    /api/nodes/:id          # Get specific node
PUT    /api/nodes/:id          # Update node
DELETE /api/nodes/:id          # Delete node

# Relationships
GET    /api/relationships      # List relationships
POST   /api/relationships      # Create relationship
GET    /api/relationships/:id  # Get specific relationship
PUT    /api/relationships/:id  # Update relationship
DELETE /api/relationships/:id  # Delete relationship

# Graph Operations
POST   /api/graph/query        # Execute Cypher queries
GET    /api/graph/traverse     # Graph traversal
GET    /api/graph/stats        # Graph statistics
POST   /api/graph/validate     # Structure validation

# System
GET    /api/health             # Health check
GET    /api/health/detailed    # Detailed system status
GET    /api/docs              # API documentation
```

### Example Usage

```bash
# Create a scene
curl -X POST http://localhost:3001/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Scene",
    "title": "Opening Scene",
    "description": "Hero discovers mysterious power",
    "chapter": 1,
    "sequence": 1,
    "emotional_tone": "wonder",
    "panel_count": 5
  }'

# Create a relationship
curl -X POST http://localhost:3001/api/relationships \
  -H "Content-Type: application/json" \
  -d '{
    "type": "LEADS_TO",
    "fromNodeId": "scene-1-id",
    "toNodeId": "scene-2-id",
    "transition_type": "sequential",
    "weight": 1.0
  }'
```

## 🗄️ Database Schema

### Neo4j Graph Model

```cypher
# Node constraints
CREATE CONSTRAINT scene_id IF NOT EXISTS FOR (s:Scene) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT character_id IF NOT EXISTS FOR (c:Character) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT choice_id IF NOT EXISTS FOR (ch:Choice) REQUIRE ch.id IS UNIQUE;
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE;
CREATE CONSTRAINT item_id IF NOT EXISTS FOR (i:Item) REQUIRE i.id IS UNIQUE;

# Performance indexes
CREATE INDEX scene_chapter IF NOT EXISTS FOR (s:Scene) ON (s.chapter);
CREATE INDEX scene_sequence IF NOT EXISTS FOR (s:Scene) ON (s.sequence);
CREATE INDEX character_role IF NOT EXISTS FOR (c:Character) ON (c.role);
```

## 🔧 Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development
API_PORT=3001
LOG_LEVEL=info

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:3000
```

### Docker Services

- **Neo4j**: Graph database on port 7474 (HTTP) / 7687 (Bolt)
- **PostgreSQL**: Relational data on port 5432
- **Redis**: Caching layer on port 6379

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run API tests only
cd apps/api && npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📈 Current Status

### ✅ Phase 1 - Foundation (Complete)
- [x] Monorepo structure with Turbo
- [x] Docker environment setup
- [x] Neo4j database with constraints
- [x] Core node and relationship models
- [x] Express API with full CRUD operations
- [x] TypeScript type safety
- [x] Comprehensive error handling
- [x] Health monitoring

### ✅ Phase 2 - Story Graph Architecture (Complete)
- [x] Enhanced Choice nodes with metadata and analytics
- [x] Convergent paths system for multiple choice destinations
- [x] Character supernode architecture with centrality analysis
- [x] Hierarchical container model (Story/Knot/Stitch)
- [x] Advanced relationship types and properties
- [x] Reader journey tracking and analytics
- [x] Graph algorithms (PageRank, centrality measures)

### 🚧 Phase 3 - Supporting Infrastructure (In Progress)
- [ ] PostgreSQL with Prisma integration
- [ ] React frontend with Tailwind CSS
- [ ] Graph visualization component
- [ ] Google OAuth authentication
- [ ] Comprehensive test suite

### 🔮 Phase 4 - AI Integration (Planned)
- [ ] OpenAI API integration
- [ ] Scene generation algorithms
- [ ] Character development AI
- [ ] Story coherence validation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use conventional commits
- Add tests for new features
- Update documentation
- Ensure all checks pass

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by advanced interactive fiction systems
- Built with modern web technologies
- Powered by Neo4j graph database
- Designed for AI-assisted creativity

## 📞 Support

- **Documentation**: `/docs` directory
- **API Docs**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/api/health`
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

**Built with ❤️ for the manga creation community**