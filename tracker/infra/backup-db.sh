#!/bin/bash
# Database Backup Script
# Automatically backs up PostgreSQL database and optionally uploads to Azure Blob Storage

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/issues_db_$TIMESTAMP.sql"
KEEP_DAYS=7

# Database connection (from environment or .env file)
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set"
  exit 1
fi

echo "🔄 Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Dump database
echo "📦 Creating database dump..."
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Compress backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_FILE"

COMPRESSED_FILE="$BACKUP_FILE.gz"
FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)

echo "✅ Backup created successfully!"
echo "   File: $COMPRESSED_FILE"
echo "   Size: $FILE_SIZE"

# Optional: Upload to Azure Blob Storage
if [ ! -z "$AZURE_STORAGE_ACCOUNT_NAME" ] && [ ! -z "$AZURE_STORAGE_KEY" ]; then
  echo "☁️  Uploading to Azure Blob Storage..."
  
  az storage blob upload \
    --account-name "$AZURE_STORAGE_ACCOUNT_NAME" \
    --account-key "$AZURE_STORAGE_KEY" \
    --container-name "backups" \
    --file "$COMPRESSED_FILE" \
    --name "issues_db_$TIMESTAMP.sql.gz" \
    --overwrite
  
  echo "✅ Backup uploaded to Azure"
fi

# Clean up old backups
echo "🧹 Cleaning up old backups (older than $KEEP_DAYS days)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "✨ Backup complete!"
