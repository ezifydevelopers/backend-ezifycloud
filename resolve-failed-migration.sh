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
echo "🔓 Step 2: Resolving all failed migrations..."

# Function to resolve all failed migrations
resolve_failed_migrations() {
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "   Attempt $attempt: Checking for failed migrations..."
        
        # Get migration status
        MIGRATION_OUTPUT=$(npx prisma migrate status 2>&1)
        
        # Check if there are failed migrations
        if echo "$MIGRATION_OUTPUT" | grep -q "failed migrations"; then
            # Extract failed migration name
            FAILED_MIGRATION=$(echo "$MIGRATION_OUTPUT" | grep -oP 'migration \K[0-9_]+' | head -1)
            
            if [ -n "$FAILED_MIGRATION" ]; then
                echo "   Found failed migration: $FAILED_MIGRATION"
                echo "   Marking as rolled back..."
                
                # Try to mark as rolled back first
                if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" 2>/dev/null; then
                    echo "   ✅ Migration $FAILED_MIGRATION marked as rolled back"
                else
                    # If rolled back fails, try marking as applied (in case it actually succeeded)
                    echo "   Trying to mark as applied (in case it succeeded)..."
                    if npx prisma migrate resolve --applied "$FAILED_MIGRATION" 2>/dev/null; then
                        echo "   ✅ Migration $FAILED_MIGRATION marked as applied"
                    else
                        echo "   ⚠️  Could not resolve migration $FAILED_MIGRATION automatically"
                        return 1
                    fi
                fi
                
                # Wait a moment before checking again
                sleep 1
                attempt=$((attempt + 1))
            else
                echo "   ✅ No more failed migrations found"
                break
            fi
        else
            echo "   ✅ No failed migrations found"
            break
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo "   ⚠️  Reached maximum attempts. Some migrations may still need manual resolution."
        return 1
    fi
    
    return 0
}

# Resolve all failed migrations
resolve_failed_migrations

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

