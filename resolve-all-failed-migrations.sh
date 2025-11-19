#!/bin/bash

# Script to resolve ALL failed migrations and apply pending ones

echo "🔧 Resolving ALL failed migrations..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found. Make sure you're in the backend directory."
    exit 1
fi

# Function to resolve all failed migrations
resolve_all_failed() {
    local max_attempts=20
    local attempt=1
    local resolved_count=0
    
    echo "🔍 Scanning for failed migrations..."
    
    while [ $attempt -le $max_attempts ]; do
        # Get migration status
        MIGRATION_OUTPUT=$(npx prisma migrate status 2>&1)
        
        # Check if there are failed migrations
        if echo "$MIGRATION_OUTPUT" | grep -q "failed migrations"; then
            # Extract failed migration name (get the one mentioned in the error)
            FAILED_MIGRATION=$(echo "$MIGRATION_OUTPUT" | grep -oP 'migration \K[0-9_]+' | head -1)
            
            if [ -n "$FAILED_MIGRATION" ]; then
                echo ""
                echo "   📋 Found failed migration: $FAILED_MIGRATION"
                echo "   🔓 Attempting to resolve..."
                
                # Try rolled back first
                if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" 2>&1 | grep -q "marked as rolled back"; then
                    echo "   ✅ Marked as rolled back"
                    resolved_count=$((resolved_count + 1))
                else
                    # Try applied
                    if npx prisma migrate resolve --applied "$FAILED_MIGRATION" 2>&1 | grep -q "marked as applied"; then
                        echo "   ✅ Marked as applied"
                        resolved_count=$((resolved_count + 1))
                    else
                        echo "   ⚠️  Could not automatically resolve. You may need to fix this manually."
                        echo "   💡 Try: npx prisma migrate resolve --rolled-back $FAILED_MIGRATION"
                        echo "   💡 Or: npx prisma migrate resolve --applied $FAILED_MIGRATION"
                        return 1
                    fi
                fi
                
                attempt=$((attempt + 1))
                sleep 1
            else
                break
            fi
        else
            if [ $resolved_count -gt 0 ]; then
                echo ""
                echo "   ✅ Resolved $resolved_count failed migration(s)"
            fi
            echo "   ✅ No more failed migrations found"
            return 0
        fi
    done
    
    if [ $resolved_count -gt 0 ]; then
        echo ""
        echo "   ✅ Resolved $resolved_count failed migration(s)"
    fi
    
    return 0
}

# Resolve all failed migrations
resolve_all_failed

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Some migrations could not be resolved automatically."
    echo "   Please check the output above and resolve manually."
    exit 1
fi

echo ""
echo "📦 Step 2: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Step 3: Applying all pending migrations..."
if npx prisma migrate deploy; then
    echo ""
    echo "✅ All migrations applied successfully!"
else
    echo ""
    echo "❌ Migration deployment failed. Check the error above."
    exit 1
fi

echo ""
echo "🔄 Step 4: Restarting backend with PM2..."
pm2 restart backend

echo ""
echo "✅ Done! All migrations have been resolved and applied."
echo ""
echo "📊 Check logs with: pm2 logs backend"

