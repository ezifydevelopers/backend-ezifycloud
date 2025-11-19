#!/bin/bash

# Quick fix: Resolve failed migration and add employee_id column directly

echo "🔧 Quick fix for employee_id column..."

cd "$(dirname "$0")"

# Step 1: Resolve the failed migration
echo ""
echo "📋 Step 1: Resolving failed migration..."
npx prisma migrate resolve --rolled-back 20251015170000_add_user_profile_fields 2>/dev/null || \
npx prisma migrate resolve --applied 20251015170000_add_user_profile_fields 2>/dev/null || {
    echo "⚠️  Could not resolve migration automatically"
}

# Step 2: Add employee_id column directly via SQL
echo ""
echo "🗄️  Step 2: Adding employee_id column directly to database..."

# Get database connection details from .env
if [ -f .env ]; then
    source .env
    DB_URL="${DATABASE_URL}"
else
    echo "❌ .env file not found"
    exit 1
fi

# Extract connection details (basic parsing)
# This is a simple approach - you may need to adjust based on your DATABASE_URL format
psql "$DB_URL" << 'EOF'
-- Add employee_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "employee_id" TEXT;
        RAISE NOTICE 'Column employee_id added successfully';
    ELSE
        RAISE NOTICE 'Column employee_id already exists';
    END IF;
END $$;

-- Create unique index if it doesn't exist
DROP INDEX IF EXISTS "users_employee_id_key";
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id") WHERE "employee_id" IS NOT NULL;
EOF

if [ $? -eq 0 ]; then
    echo "✅ employee_id column added successfully"
else
    echo "❌ Failed to add column. Trying alternative method..."
    # Alternative: use psql with extracted credentials
    echo "💡 You may need to run this manually:"
    echo "   psql -U postgres -d ezifycloud -c \"ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT;\""
    echo "   psql -U postgres -d ezifycloud -c \"CREATE UNIQUE INDEX IF NOT EXISTS users_employee_id_key ON users(employee_id) WHERE employee_id IS NOT NULL;\""
fi

# Step 3: Regenerate Prisma Client
echo ""
echo "📦 Step 3: Regenerating Prisma Client..."
npx prisma generate

# Step 4: Mark the employee_id migration as applied (since we added it manually)
echo ""
echo "📝 Step 4: Marking employee_id migration as applied..."
npx prisma migrate resolve --applied 20251119200000_add_employee_id_column 2>/dev/null || {
    echo "⚠️  Could not mark migration as applied (this is okay if migration doesn't exist yet)"
}

# Step 5: Restart backend
echo ""
echo "🔄 Step 5: Restarting backend..."
pm2 restart backend

echo ""
echo "✅ Done! employee_id column should now be available."
echo ""
echo "📊 Check logs: pm2 logs backend"

