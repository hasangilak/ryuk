# Troubleshooting Guide - Ryuk Project

This guide helps resolve common issues encountered during development and deployment of the Ryuk manga generation system.

## 🚨 Quick Diagnostics

### Health Check Commands
```bash
# Check overall system health
curl http://localhost:3001/api/health/detailed

# Check database connectivity
npm run docker:logs neo4j
npm run docker:logs postgres
npm run docker:logs redis

# Verify all services are running
docker-compose ps
```

## 🐛 Common Issues and Solutions

### Database Connection Issues

#### Problem: "Failed to connect to Neo4j"
**Symptoms:**
- API returns 500 errors on database operations
- Error logs show "ServiceUnavailable" or "ConnectionError"

**Solutions:**
1. **Check Docker Services**
   ```bash
   docker-compose ps
   # If Neo4j is not running:
   docker-compose up -d neo4j
   ```

2. **Verify Environment Variables**
   ```bash
   # Check .env file in apps/api/
   cat apps/api/.env
   # Should contain:
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   ```

3. **Reset Neo4j Container**
   ```bash
   docker-compose down neo4j
   docker volume rm ryuk_neo4j_data
   docker-compose up -d neo4j
   # Wait 30 seconds for startup
   ```

4. **Check Port Conflicts**
   ```bash
   lsof -i :7687  # Neo4j bolt port
   lsof -i :7474  # Neo4j HTTP port
   ```

#### Problem: "Database constraints not applied"
**Symptoms:**
- Duplicate data being created
- Validation errors in unexpected places

**Solutions:**
1. **Reapply Constraints**
   ```bash
   docker-compose exec neo4j cypher-shell -u neo4j -p password
   # Run constraints from infrastructure/neo4j/init/001-constraints.cypher
   ```

2. **Check Constraint Status**
   ```cypher
   SHOW CONSTRAINTS;
   ```

### Build and Compilation Issues

#### Problem: "Cannot find module '@ryuk/shared'"
**Symptoms:**
- TypeScript compilation errors
- Import statements failing

**Solutions:**
1. **Build Shared Package**
   ```bash
   cd packages/shared
   npm run build
   ```

2. **Link Packages**
   ```bash
   npm install  # From root directory
   ```

3. **Clear Node Modules**
   ```bash
   rm -rf node_modules packages/*/node_modules apps/*/node_modules
   npm install
   ```

#### Problem: "Type errors in services"
**Symptoms:**
- TypeScript compilation fails
- Missing type definitions

**Solutions:**
1. **Update Shared Package**
   ```bash
   cd packages/shared
   npm run build
   cd ../..
   npm run type-check
   ```

2. **Clear TypeScript Cache**
   ```bash
   npx tsc --build --clean
   npm run build
   ```

### API Server Issues

#### Problem: "Port 3001 already in use"
**Solutions:**
1. **Kill Existing Process**
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

2. **Use Different Port**
   ```bash
   # In apps/api/.env
   PORT=3002
   ```

#### Problem: "CORS errors in browser"
**Solutions:**
1. **Check CORS Configuration**
   ```typescript
   // apps/api/src/middleware/security.ts
   app.use(cors({
     origin: ['http://localhost:3000', 'http://localhost:3002'],
     credentials: true
   }));
   ```

### Test Issues

#### Problem: "Tests failing with database errors"
**Symptoms:**
- Jest tests timeout
- Database connection errors in tests

**Solutions:**
1. **Setup Test Database**
   ```bash
   # Create .env.test file
   cp apps/api/.env.example apps/api/.env.test
   # Update with test database credentials
   ```

2. **Run Tests with Proper Setup**
   ```bash
   cd apps/api
   npm run test -- --runInBand  # Run tests sequentially
   ```

3. **Clean Test Data**
   ```bash
   # Manual cleanup if needed
   docker-compose exec neo4j cypher-shell -u neo4j -p password
   # Run: MATCH (n) WHERE n.id STARTS WITH 'test-' DETACH DELETE n
   ```

#### Problem: "Jest configuration errors"
**Solutions:**
1. **Verify Jest Config**
   ```bash
   # Check apps/api/jest.config.js exists and is valid
   cd apps/api
   npx jest --showConfig
   ```

2. **TypeScript Compilation for Tests**
   ```bash
   npm install --save-dev ts-jest @types/jest
   ```

### Performance Issues

#### Problem: "Slow API responses"
**Diagnostics:**
1. **Check Response Times**
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3001/api/nodes"
   # Create curl-format.txt with timing variables
   ```

2. **Monitor Database Queries**
   ```cypher
   // In Neo4j Browser
   :queries
   ```

**Solutions:**
1. **Add Database Indexes**
   ```cypher
   CREATE INDEX node_id_index FOR (n:Scene) ON (n.id);
   CREATE INDEX node_type_index FOR (n) ON (n.type);
   ```

2. **Optimize Queries**
   ```typescript
   // Use LIMIT and pagination
   const result = await session.run(
     'MATCH (n:Scene) RETURN n ORDER BY n.sequence LIMIT $limit SKIP $skip',
     { limit: 20, skip: page * 20 }
   );
   ```

### Memory Issues

#### Problem: "Node.js out of memory"
**Solutions:**
1. **Increase Node Memory**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run dev
   ```

2. **Monitor Memory Usage**
   ```bash
   # Add to package.json scripts
   "monitor": "clinic doctor -- node dist/index.js"
   ```

## 🔧 Development Environment Setup Issues

### Docker Issues

#### Problem: "Docker compose fails to start"
**Solutions:**
1. **Check Docker Status**
   ```bash
   docker info
   docker version
   ```

2. **Restart Docker**
   ```bash
   # On macOS
   sudo systemctl restart docker
   # Or restart Docker Desktop
   ```

3. **Clean Docker State**
   ```bash
   docker-compose down --volumes
   docker system prune -f
   docker-compose up -d
   ```

### Environment Variables

#### Problem: "Environment variables not loading"
**Solutions:**
1. **Check .env File Location**
   ```bash
   # Should be in apps/api/.env
   ls -la apps/api/.env*
   ```

2. **Verify dotenv Loading**
   ```typescript
   // In apps/api/src/index.ts
   import { config } from 'dotenv';
   config({ path: '.env' });
   console.log('NEO4J_URI:', process.env.NEO4J_URI);
   ```

## 📊 Monitoring and Logging

### Enable Debug Logging
```bash
# Set environment variable
export DEBUG=ryuk:*
npm run dev

# Or in .env file
DEBUG=ryuk:*
```

### Database Query Logging
```typescript
// apps/api/src/database/connections.ts
const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(user, password),
  {
    logging: neo4j.logging.console('debug')  // Add this for query logging
  }
);
```

### Performance Monitoring
```typescript
// apps/api/src/middleware/monitoring.ts
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });

  next();
};
```

## 🚀 Deployment Issues

### Production Database
1. **Connection String Format**
   ```bash
   # For Neo4j Aura
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   ```

2. **SSL Configuration**
   ```typescript
   const driver = neo4j.driver(uri, auth, {
     encrypted: 'ENCRYPTION_ON',
     trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES'
   });
   ```

### Memory Optimization
```bash
# Production environment variables
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048"
```

## 🔍 Diagnostic Commands

### System Information
```bash
# Node.js and npm versions
node --version
npm --version

# Package versions
npm list --depth=0

# Docker status
docker-compose ps
docker stats --no-stream

# Database connectivity
curl -f http://localhost:7474/browser/ || echo "Neo4j not accessible"
```

### Database Health
```cypher
// Check database status
SHOW DATABASES;

// Check constraint status
SHOW CONSTRAINTS;

// Check index status
SHOW INDEXES;

// Count nodes and relationships
MATCH (n) RETURN count(n) as total_nodes;
MATCH ()-[r]-() RETURN count(r) as total_relationships;
```

## 📞 Getting Help

### Log Collection
```bash
# Collect all relevant logs
mkdir -p debug-logs
docker-compose logs neo4j > debug-logs/neo4j.log
docker-compose logs postgres > debug-logs/postgres.log
npm run dev 2>&1 | tee debug-logs/api.log
```

### Useful Commands for Bug Reports
```bash
# System information
uname -a
node --version
npm --version
docker --version
docker-compose --version

# Project state
git status
git log --oneline -5
npm list --depth=0
```

---

*This troubleshooting guide covers the most common issues. If you encounter problems not listed here, check the logs and create an issue with the diagnostic information.*