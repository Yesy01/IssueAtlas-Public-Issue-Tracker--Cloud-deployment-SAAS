#!/bin/bash
# Database Restore Script
# Restores PostgreSQL database from a backup file

set -e

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "❌ Error: No backup file specified"
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Example: $0 backups/issues_db_20251207_020000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Database connection
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set"
  exit 1
fi

echo "⚠️  WARNING: This will replace all data in the database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

echo "🔄 Starting database restore..."

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "📂 Decompressing backup..."
  SQL_FILE="${BACKUP_FILE%.gz}"
  gunzip -c "$BACKUP_FILE" > "$SQL_FILE"
else
  SQL_FILE="$BACKUP_FILE"
fi

# Restore database
echo "📥 Restoring database..."
psql "$DATABASE_URL" < "$SQL_FILE"

# Clean up decompressed file if it was created
if [[ "$BACKUP_FILE" == *.gz ]] && [ -f "$SQL_FILE" ]; then
  rm "$SQL_FILE"
fi

echo "✅ Database restored successfully!"
echo "   From: $BACKUP_FILE"
