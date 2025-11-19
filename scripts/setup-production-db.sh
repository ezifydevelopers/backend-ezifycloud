#!/bin/bash

# Production Database Setup Script
# This script sets up a fresh database for production deployment

set -e  # Exit on error

echo "🚀 Starting Production Database Setup..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1: Generating Prisma Client...${NC}"
npx prisma generate

echo -e "${YELLOW}📋 Step 2: Creating fresh initial migration...${NC}"
# Create a fresh migration from current schema
npx prisma migrate dev --name init_production --create-only

echo -e "${YELLOW}📋 Step 3: Applying migrations to database...${NC}"
# Deploy migrations to production database
npx prisma migrate deploy

echo -e "${YELLOW}📋 Step 4: Verifying database schema...${NC}"
# Verify the schema matches
npx prisma db pull --force

echo -e "${GREEN}✅ Production database setup completed successfully!${NC}"
echo -e "${GREEN}📊 You can now run 'npx prisma studio' to view your database${NC}"

