# Quick Start: Production Database Setup

## Your Current Situation
- ✅ Database `ezifycloud` is freshly created (empty)
- ❌ Migrations are failing because they reference tables that don't exist
- ❌ Permission denied errors for schema public
- ✅ You have the correct schema in `prisma/schema.prisma`

## Solution: Fix Permissions First, Then Setup

### Step 0: Fix Database Permissions (CRITICAL - Do This First!)

```bash
# Run as postgres user to fix permissions
sudo -u postgres psql -d ezifycloud << 'EOF'
GRANT ALL PRIVILEGES ON SCHEMA public TO ezifyuser;
GRANT USAGE, CREATE ON SCHEMA public TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ezifyuser;
GRANT ALL PRIVILEGES ON DATABASE ezifycloud TO ezifyuser;
\q
EOF
```

### Step 1-3: Setup Database Schema

### Step 1: Clean Up Old Migrations

```bash
cd ~/apps/backend-ezifycloud

# Backup old migrations
mkdir -p prisma/migrations_backup
cp -r prisma/migrations/* prisma/migrations_backup/ 2>/dev/null || true

# Remove old migration SQL files (keep migration_lock.toml)
find prisma/migrations -name "migration.sql" -delete
find prisma/migrations -type d -empty -delete
```

### Step 2: Push Schema Directly (Creates All Tables)

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push --accept-data-loss
```

This will create ALL tables from your schema directly in the database.

### Step 3: Create Baseline Migration

```bash
# Create migration from current state (disable shadow DB check)
PRISMA_MIGRATE_SKIP_GENERATE=1 npx prisma migrate dev --name init --create-only --skip-seed
```

This creates a migration file that represents your current database state.

### Step 4: Mark Migration as Applied

```bash
# Get the migration name
MIGRATION_NAME=$(ls -t prisma/migrations | grep -E '^[0-9]+_' | head -1)

# Mark as applied
npx prisma migrate resolve --applied "$MIGRATION_NAME"
```

This tells Prisma that the migration has already been applied (since we used `db push`).

## Complete Command Sequence

```bash
# Navigate to backend
cd ~/apps/backend-ezifycloud

# Ensure DATABASE_URL is set in .env
# DATABASE_URL="postgresql://ezifyuser:password@localhost:5432/ezifycloud?schema=public"

# STEP 0: Fix permissions (run as postgres user)
sudo -u postgres psql -d ezifycloud << 'EOF'
GRANT ALL PRIVILEGES ON SCHEMA public TO ezifyuser;
GRANT USAGE, CREATE ON SCHEMA public TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ezifyuser;
GRANT ALL PRIVILEGES ON DATABASE ezifycloud TO ezifyuser;
\q
EOF

# STEP 1: Clean up old migrations
mkdir -p prisma/migrations_backup
cp -r prisma/migrations/* prisma/migrations_backup/ 2>/dev/null || true
find prisma/migrations -name "migration.sql" -delete
find prisma/migrations -type d -empty -delete

# STEP 2: Generate Prisma Client
npx prisma generate

# STEP 3: Push schema to database (creates all tables)
npx prisma db push --accept-data-loss

# STEP 4: Create initial migration
PRISMA_MIGRATE_SKIP_GENERATE=1 npx prisma migrate dev --name init --create-only --skip-seed

# STEP 5: Mark as applied
MIGRATION_NAME=$(ls -t prisma/migrations | grep -E '^[0-9]+_' | head -1)
npx prisma migrate resolve --applied "$MIGRATION_NAME"

# STEP 6: Verify
npx prisma migrate status
```

## Verify It Worked

```bash
# Check if tables exist
psql -d ezifycloud -c "\dt"

# You should see tables like:
# - users
# - leave_requests
# - leave_policies
# - etc.
```

## For Future Migrations

After this initial setup, use normal migration workflow:

```bash
# When you change schema.prisma:
npx prisma migrate dev --name descriptive_name

# In production:
npx prisma migrate deploy
```

## Troubleshooting

### Error: "shadow database" issues

If you get shadow database errors, temporarily disable it:

```bash
# Add to .env
PRISMA_MIGRATE_SKIP_GENERATE=1

# Or use db push instead
npx prisma db push
```

### Error: Permission denied for schema public

This is the most common error. Fix it with:

```bash
sudo -u postgres psql -d ezifycloud << 'EOF'
GRANT ALL PRIVILEGES ON SCHEMA public TO ezifyuser;
GRANT USAGE, CREATE ON SCHEMA public TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ezifyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ezifyuser;
GRANT ALL PRIVILEGES ON DATABASE ezifycloud TO ezifyuser;
\q
EOF
```

**Important:** You must run this as the `postgres` user, not as `ezifyuser`.

### Error: Migration already exists

If you see conflicts, you can:

1. **Delete the problematic migration folder:**
   ```bash
   rm -rf prisma/migrations/[timestamp]_init
   ```

2. **Or reset everything:**
   ```bash
   # Backup first!
   cp -r prisma/migrations prisma/migrations_backup
   rm -rf prisma/migrations/[timestamp]*
   ```

## Alternative: Manual SQL Approach

If the above doesn't work, you can generate SQL and apply manually:

```bash
# Generate migration SQL
npx prisma migrate dev --name init --create-only

# Review the SQL file
cat prisma/migrations/*/migration.sql

# Apply manually (if needed)
psql -d ezifycloud -f prisma/migrations/*/migration.sql
```

