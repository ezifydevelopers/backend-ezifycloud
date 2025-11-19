#!/bin/bash

# Reset Migrations Script
# This script backs up old migrations and creates a fresh initial migration
# Use this when you have a fresh database and need to start migration history from scratch

set -e

echo "🔄 Resetting migrations for fresh database setup..."

# Backup old migrations
BACKUP_DIR="prisma/migrations_backup_$(date +%Y%m%d_%H%M%S)"
if [ -d "prisma/migrations" ]; then
    echo "📦 Backing up existing migrations to $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    cp -r prisma/migrations/* "$BACKUP_DIR/" 2>/dev/null || true
fi

# Remove old migrations (keep migration_lock.toml)
echo "🗑️  Removing old migration files..."
find prisma/migrations -type f -name "migration.sql" -delete
find prisma/migrations -type d -empty -delete

# Create fresh initial migration
echo "✨ Creating fresh initial migration..."
npx prisma migrate dev --name init --create-only

echo "✅ Migration reset complete!"
echo "📝 Review the generated migration in prisma/migrations/"
echo "🚀 Then run: npx prisma migrate deploy"

