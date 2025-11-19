#!/bin/bash

# Fresh Database Setup Script
# Use this when you have a completely fresh/empty database

set -e

echo "🚀 Setting up fresh production database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Step 1: Generate Prisma Client
echo "📋 Step 1: Generating Prisma Client..."
npx prisma generate

# Step 2: Push schema directly (for fresh DB, this is faster)
echo "📋 Step 2: Pushing schema to database..."
npx prisma db push --accept-data-loss

# Step 3: Create initial migration from current state
echo "📋 Step 3: Creating initial migration from current database state..."
npx prisma migrate dev --name init --create-only

# Step 4: Mark migration as applied (since we already pushed)
echo "📋 Step 4: Marking migration as applied..."
npx prisma migrate resolve --applied init

echo "✅ Fresh database setup completed!"
echo "📊 Database is ready for production use"

