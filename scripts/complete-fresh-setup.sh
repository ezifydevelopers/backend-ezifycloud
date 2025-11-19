#!/bin/bash

# Complete Fresh Database Setup Script
# This script handles everything for a fresh database setup

set -e

echo "🚀 Complete Fresh Database Setup"
echo "================================"
echo ""

# Step 1: Fix Permissions
echo "📋 Step 1: Setting up database permissions..."
echo "Please run these SQL commands as postgres user:"
echo ""
echo "sudo -u postgres psql -d ezifycloud << 'EOF'"
cat << 'PERMSQL'
GRANT ALL PRIVILEGES ON SCHEMA public TO ezifyuser;
GRANT USAGE, CREATE ON SCHEMA public TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ezifyuser;
GRANT ALL PRIVILEGES ON DATABASE ezifycloud TO ezifyuser;
\q
EOF
PERMSQL
echo ""
read -p "Press Enter after running the SQL commands above..."

# Step 2: Backup old migrations
echo ""
echo "📦 Step 2: Backing up old migrations..."
if [ -d "prisma/migrations" ]; then
    BACKUP_DIR="prisma/migrations_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    # Keep migration_lock.toml, backup everything else
    if [ -f "prisma/migrations/migration_lock.toml" ]; then
        cp prisma/migrations/migration_lock.toml "$BACKUP_DIR/"
    fi
    # Backup migration folders
    for dir in prisma/migrations/*/; do
        if [ -d "$dir" ]; then
            cp -r "$dir" "$BACKUP_DIR/" 2>/dev/null || true
        fi
    done
    echo "✅ Backed up to $BACKUP_DIR"
fi

# Step 3: Clean up old migrations (remove SQL files, keep structure)
echo "🗑️  Step 3: Cleaning up old migration files..."
# Remove migration.sql files but keep directories and migration_lock.toml
find prisma/migrations -type f -name "migration.sql" -delete 2>/dev/null || true
# Remove empty directories
find prisma/migrations -type d -empty -delete 2>/dev/null || true

# Step 4: Generate Prisma Client
echo "📋 Step 4: Generating Prisma Client..."
npx prisma generate

# Step 5: Push schema directly (this creates all tables)
echo "📋 Step 5: Pushing schema to database (creating all tables)..."
npx prisma db push --accept-data-loss --skip-generate

# Step 6: Create baseline migration
echo "📋 Step 6: Creating baseline migration from current database state..."
# Disable shadow database to avoid issues
export PRISMA_MIGRATE_SKIP_GENERATE=1
npx prisma migrate dev --name init --create-only --skip-seed 2>&1 | grep -v "shadow" || {
    echo "⚠️  Migration creation encountered shadow DB warning, but continuing..."
}

# Step 7: Mark migration as applied
echo "📋 Step 7: Marking migration as applied..."
LATEST_MIGRATION=$(ls -t prisma/migrations 2>/dev/null | grep -E '^[0-9]+_' | head -1)
if [ -n "$LATEST_MIGRATION" ]; then
    echo "   Found migration: $LATEST_MIGRATION"
    npx prisma migrate resolve --applied "$LATEST_MIGRATION" 2>/dev/null || {
        echo "⚠️  Could not mark as applied automatically"
        echo "   You may need to run: npx prisma migrate resolve --applied $LATEST_MIGRATION"
    }
else
    echo "⚠️  No migration found to mark as applied"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📊 Verification:"
echo "   Check tables: psql -d ezifycloud -c '\\dt'"
echo "   Check status: npx prisma migrate status"
echo ""

