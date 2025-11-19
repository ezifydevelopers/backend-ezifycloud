#!/bin/bash

# Script to resolve failed migrations and add employee_id column

echo "🔧 Resolving failed migrations..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found. Make sure you're in the backend directory."
    exit 1
fi

echo "📋 Step 1: Checking migration status..."
npx prisma migrate status

echo ""
echo "🔓 Step 2: Resolving failed migration..."
echo "   Marking failed migration as rolled back..."

# Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back 20251014201055_add_holiday_model

echo ""
echo "📦 Step 3: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Step 4: Applying all pending migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migration completed!"
echo ""
echo "🔄 Step 5: Restarting backend with PM2..."
pm2 restart backend

echo ""
echo "✅ Done! The employee_id column should now be available."
echo ""
echo "📊 Check logs with: pm2 logs backend"

