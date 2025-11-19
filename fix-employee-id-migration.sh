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

echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Step 2: Running database migration..."
npx prisma migrate deploy

echo ""
echo "✅ Migration completed!"
echo ""
echo "🔄 Step 3: Restarting backend with PM2..."
pm2 restart backend

echo ""
echo "✅ Done! The employee_id column should now be available."
echo ""
echo "📊 Check logs with: pm2 logs backend"

