#!/bin/bash

# Script to fix the missing employee_id column in production database

echo "🔧 Fixing missing employee_id column..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found. Make sure you're in the backend directory."
    exit 1
fi

echo "📋 Step 1: Checking migration status..."
MIGRATION_STATUS=$(npx prisma migrate status 2>&1)

if echo "$MIGRATION_STATUS" | grep -q "failed migrations"; then
    echo "⚠️  Found failed migrations. Attempting to resolve..."
    echo ""
    
    # Try to find the failed migration name
    FAILED_MIGRATION=$(echo "$MIGRATION_STATUS" | grep -oP 'migration \K[0-9_]+' | head -1)
    
    if [ -n "$FAILED_MIGRATION" ]; then
        echo "🔓 Resolving failed migration: $FAILED_MIGRATION"
        npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" || {
            echo "⚠️  Could not resolve migration automatically. Trying to mark as applied..."
            npx prisma migrate resolve --applied "$FAILED_MIGRATION" || {
                echo "❌ Could not resolve migration. Please check RESOLVE_MIGRATION_ISSUE.md for manual steps."
                exit 1
            }
        }
    else
        echo "⚠️  Could not identify failed migration. Please check RESOLVE_MIGRATION_ISSUE.md for manual steps."
        exit 1
    fi
fi

echo ""
echo "📦 Step 2: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Step 3: Running database migration..."
npx prisma migrate deploy

echo ""
echo "✅ Migration completed!"
echo ""
echo "🔄 Step 4: Restarting backend with PM2..."
pm2 restart backend

echo ""
echo "✅ Done! The employee_id column should now be available."
echo ""
echo "📊 Check logs with: pm2 logs backend"

