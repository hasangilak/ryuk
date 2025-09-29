# Backup and Restore Procedures - Ryuk Project

This guide provides comprehensive procedures for backing up and restoring data in the Ryuk manga generation system.

## 🎯 Backup Strategy Overview

### Backup Types
1. **Full System Backup**: Complete database dump + application state
2. **Incremental Backup**: Changes since last backup
3. **Point-in-Time Backup**: Specific timestamp recovery
4. **Configuration Backup**: Environment settings and configurations

### Backup Schedule Recommendations
- **Production**: Daily full backups, hourly incrementals
- **Development**: Weekly full backups
- **Testing**: Before major updates or migrations

## 🗄️ Neo4j Database Backup

### Manual Backup Procedures

#### 1. Full Database Dump
```bash
#!/bin/bash
# scripts/backup-neo4j.sh

set -e

# Configuration
BACKUP_DIR="/backup/ryuk/neo4j"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="ryuk_neo4j_backup_${TIMESTAMP}.dump"
NEO4J_CONTAINER="ryuk-neo4j-1"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting Neo4j backup at $(date)"

# Create database dump
docker exec $NEO4J_CONTAINER neo4j-admin database dump \
  --database=neo4j \
  --to-path=/backups \
  --overwrite-destination=true

# Copy dump file from container
docker cp $NEO4J_CONTAINER:/backups/neo4j.dump "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "Backup completed: $BACKUP_DIR/$BACKUP_FILE.gz"

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup process finished at $(date)"
```

#### 2. Cypher Export Backup
```bash
#!/bin/bash
# scripts/backup-cypher.sh

set -e

BACKUP_DIR="/backup/ryuk/cypher"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="password"

mkdir -p "$BACKUP_DIR"

echo "Starting Cypher export backup at $(date)"

# Export all nodes and relationships as Cypher statements
docker exec ryuk-neo4j-1 cypher-shell \
  -u $NEO4J_USER -p $NEO4J_PASSWORD \
  "CALL apoc.export.cypher.all('/backups/export_${TIMESTAMP}.cypher', {
    format: 'cypher-shell',
    useOptimizations: {type: 'UNWIND_BATCH'},
    batchSize: 1000
  })"

# Copy export file from container
docker cp ryuk-neo4j-1:/backups/export_${TIMESTAMP}.cypher "$BACKUP_DIR/"

# Compress export
gzip "$BACKUP_DIR/export_${TIMESTAMP}.cypher"

echo "Cypher export completed: $BACKUP_DIR/export_${TIMESTAMP}.cypher.gz"
```

### Automated Backup with Cron
```bash
# Add to crontab: crontab -e
# Daily backup at 2 AM
0 2 * * * /path/to/ryuk/scripts/backup-neo4j.sh >> /var/log/ryuk-backup.log 2>&1

# Weekly Cypher export backup on Sundays at 3 AM
0 3 * * 0 /path/to/ryuk/scripts/backup-cypher.sh >> /var/log/ryuk-backup.log 2>&1
```

## 🔄 Neo4j Database Restore

### Full Database Restore
```bash
#!/bin/bash
# scripts/restore-neo4j.sh

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup_file.dump.gz>"
    exit 1
fi

BACKUP_FILE="$1"
NEO4J_CONTAINER="ryuk-neo4j-1"
TEMP_DIR="/tmp/ryuk-restore"

echo "Starting Neo4j restore from $BACKUP_FILE"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file $BACKUP_FILE not found"
    exit 1
fi

# Create temporary directory
mkdir -p "$TEMP_DIR"

# Extract backup file
gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/neo4j.dump"

# Stop Neo4j service
echo "Stopping Neo4j..."
docker-compose stop neo4j

# Copy dump file to container
docker cp "$TEMP_DIR/neo4j.dump" $NEO4J_CONTAINER:/backups/

# Start Neo4j temporarily for restore
docker-compose start neo4j
sleep 30  # Wait for Neo4j to start

# Restore database
echo "Restoring database..."
docker exec $NEO4J_CONTAINER neo4j-admin database load \
  --from-path=/backups \
  --database=neo4j \
  --overwrite-destination=true

# Restart Neo4j to apply changes
echo "Restarting Neo4j..."
docker-compose restart neo4j

# Wait for Neo4j to be ready
sleep 30

# Verify restore
echo "Verifying restore..."
docker exec $NEO4J_CONTAINER cypher-shell \
  -u neo4j -p password \
  "MATCH (n) RETURN count(n) as total_nodes"

# Clean up
rm -rf "$TEMP_DIR"

echo "Restore completed successfully"
```

### Point-in-Time Restore
```bash
#!/bin/bash
# scripts/restore-point-in-time.sh

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <backup_file.dump.gz> <target_timestamp>"
    echo "Example: $0 backup_20240115_020000.dump.gz '2024-01-15 14:30:00'"
    exit 1
fi

BACKUP_FILE="$1"
TARGET_TIMESTAMP="$2"

echo "Performing point-in-time restore to: $TARGET_TIMESTAMP"

# First restore the full backup
./restore-neo4j.sh "$BACKUP_FILE"

# Then remove data created after target timestamp
docker exec ryuk-neo4j-1 cypher-shell \
  -u neo4j -p password \
  "MATCH (n)
   WHERE n.created_at > datetime('$TARGET_TIMESTAMP')
   DETACH DELETE n"

echo "Point-in-time restore completed"
```

## 🗃️ PostgreSQL Backup (Future Implementation)

### PostgreSQL Backup Script
```bash
#!/bin/bash
# scripts/backup-postgresql.sh

set -e

BACKUP_DIR="/backup/ryuk/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="ryuk_production"
POSTGRES_CONTAINER="ryuk-postgres-1"

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup at $(date)"

# Create database dump
docker exec $POSTGRES_CONTAINER pg_dump \
  -U postgres \
  -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file=/backups/ryuk_postgres_backup_${TIMESTAMP}.sql

# Copy backup from container
docker cp $POSTGRES_CONTAINER:/backups/ryuk_postgres_backup_${TIMESTAMP}.sql \
  "$BACKUP_DIR/"

echo "PostgreSQL backup completed: $BACKUP_DIR/ryuk_postgres_backup_${TIMESTAMP}.sql"
```

### PostgreSQL Restore Script
```bash
#!/bin/bash
# scripts/restore-postgresql.sh

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup_file.sql>"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="ryuk_production"
POSTGRES_CONTAINER="ryuk-postgres-1"

echo "Starting PostgreSQL restore from $BACKUP_FILE"

# Copy backup to container
docker cp "$BACKUP_FILE" $POSTGRES_CONTAINER:/backups/

# Restore database
docker exec $POSTGRES_CONTAINER pg_restore \
  -U postgres \
  -d $DB_NAME \
  --clean \
  --if-exists \
  /backups/$(basename "$BACKUP_FILE")

echo "PostgreSQL restore completed"
```

## 📁 Application Configuration Backup

### Configuration Backup Script
```bash
#!/bin/bash
# scripts/backup-config.sh

set -e

BACKUP_DIR="/backup/ryuk/config"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROJECT_ROOT="/path/to/ryuk"

mkdir -p "$BACKUP_DIR"

echo "Starting configuration backup at $(date)"

# Create configuration archive
tar -czf "$BACKUP_DIR/config_backup_${TIMESTAMP}.tar.gz" \
  -C "$PROJECT_ROOT" \
  apps/api/.env \
  apps/api/.env.production \
  docker-compose.yml \
  docker-compose.prod.yml \
  infrastructure/neo4j/neo4j.conf \
  package.json \
  packages/shared/package.json \
  apps/api/package.json

echo "Configuration backup completed: $BACKUP_DIR/config_backup_${TIMESTAMP}.tar.gz"
```

## ☁️ Cloud Backup Integration

### AWS S3 Backup
```bash
#!/bin/bash
# scripts/backup-to-s3.sh

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <local_backup_file> <s3_bucket>"
    exit 1
fi

LOCAL_FILE="$1"
S3_BUCKET="$2"
FILENAME=$(basename "$LOCAL_FILE")
S3_KEY="ryuk-backups/$(date +%Y/%m/%d)/$FILENAME"

echo "Uploading $LOCAL_FILE to s3://$S3_BUCKET/$S3_KEY"

# Upload to S3 with server-side encryption
aws s3 cp "$LOCAL_FILE" "s3://$S3_BUCKET/$S3_KEY" \
  --storage-class STANDARD_IA \
  --server-side-encryption AES256

# Verify upload
aws s3 ls "s3://$S3_BUCKET/$S3_KEY"

echo "Backup uploaded successfully to S3"
```

### Google Cloud Storage Backup
```bash
#!/bin/bash
# scripts/backup-to-gcs.sh

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <local_backup_file> <gcs_bucket>"
    exit 1
fi

LOCAL_FILE="$1"
GCS_BUCKET="$2"
FILENAME=$(basename "$LOCAL_FILE")
GCS_PATH="ryuk-backups/$(date +%Y/%m/%d)/$FILENAME"

echo "Uploading $LOCAL_FILE to gs://$GCS_BUCKET/$GCS_PATH"

# Upload to Google Cloud Storage
gsutil cp "$LOCAL_FILE" "gs://$GCS_BUCKET/$GCS_PATH"

# Set lifecycle policy for cost optimization
gsutil lifecycle set lifecycle.json "gs://$GCS_BUCKET"

echo "Backup uploaded successfully to Google Cloud Storage"
```

## 🔍 Backup Verification

### Backup Integrity Check
```bash
#!/bin/bash
# scripts/verify-backup.sh

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE="$1"

echo "Verifying backup integrity: $BACKUP_FILE"

# Check file exists and is not empty
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found"
    exit 1
fi

if [ ! -s "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file is empty"
    exit 1
fi

# Check file format
case "$BACKUP_FILE" in
    *.dump.gz)
        echo "Verifying Neo4j dump format..."
        gunzip -t "$BACKUP_FILE"
        ;;
    *.sql)
        echo "Verifying PostgreSQL dump format..."
        head -n 10 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"
        ;;
    *.tar.gz)
        echo "Verifying tar archive format..."
        tar -tzf "$BACKUP_FILE" > /dev/null
        ;;
    *)
        echo "WARNING: Unknown backup format"
        ;;
esac

echo "Backup verification completed successfully"
```

### Test Restore Procedure
```bash
#!/bin/bash
# scripts/test-restore.sh

set -e

BACKUP_FILE="$1"
TEST_CONTAINER_PREFIX="ryuk-test"

echo "Starting test restore procedure..."

# Create test environment
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
sleep 60

# Perform restore in test environment
case "$BACKUP_FILE" in
    *.dump.gz)
        # Test Neo4j restore
        ./restore-neo4j.sh "$BACKUP_FILE"
        ;;
    *.sql)
        # Test PostgreSQL restore
        ./restore-postgresql.sh "$BACKUP_FILE"
        ;;
esac

# Verify data integrity
echo "Verifying restored data..."
docker exec ${TEST_CONTAINER_PREFIX}-neo4j-1 cypher-shell \
  -u neo4j -p password \
  "MATCH (n) RETURN count(n) as total_nodes, labels(n) as node_types"

# Clean up test environment
docker-compose -f docker-compose.test.yml down -v

echo "Test restore completed successfully"
```

## 📋 Disaster Recovery Plan

### Recovery Time Objectives (RTO)
- **Database Restore**: 30 minutes for full restore
- **Application Restart**: 5 minutes
- **Full System Recovery**: 45 minutes

### Recovery Point Objectives (RPO)
- **Production**: Maximum 1 hour of data loss
- **Development**: Maximum 24 hours of data loss

### Emergency Recovery Checklist
1. **Assess Damage**
   - [ ] Identify affected components
   - [ ] Determine extent of data loss
   - [ ] Check backup availability

2. **Initial Response**
   - [ ] Stop affected services
   - [ ] Notify stakeholders
   - [ ] Document incident timeline

3. **Data Recovery**
   - [ ] Identify latest viable backup
   - [ ] Verify backup integrity
   - [ ] Execute restore procedures

4. **System Validation**
   - [ ] Verify data consistency
   - [ ] Test critical functionality
   - [ ] Check system performance

5. **Post-Recovery**
   - [ ] Monitor system stability
   - [ ] Update backup procedures
   - [ ] Conduct post-mortem analysis

## 🔧 Monitoring and Alerting

### Backup Monitoring Script
```bash
#!/bin/bash
# scripts/monitor-backups.sh

BACKUP_DIR="/backup/ryuk"
MAX_AGE_HOURS=25  # Alert if backup is older than 25 hours

# Check latest backup age
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BACKUP" ]; then
    echo "CRITICAL: No backups found in $BACKUP_DIR"
    exit 2
fi

BACKUP_AGE_HOURS=$((($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600))

if [ $BACKUP_AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "WARNING: Latest backup is $BACKUP_AGE_HOURS hours old (threshold: $MAX_AGE_HOURS hours)"
    exit 1
else
    echo "OK: Latest backup is $BACKUP_AGE_HOURS hours old"
    exit 0
fi
```

### Alerting Integration
```bash
# Add to crontab for regular monitoring
*/30 * * * * /path/to/ryuk/scripts/monitor-backups.sh || echo "Backup monitoring failed" | mail -s "Ryuk Backup Alert" admin@example.com
```

---

*This backup and restore guide should be tested regularly and updated based on operational experience and changing requirements.*