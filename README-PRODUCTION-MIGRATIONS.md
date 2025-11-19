# Production Database Migration Guide

## Problem
When setting up a fresh production database, you may encounter errors like:
```
ERROR: relation "users" does not exist
Error: P3018 - A migration failed to apply
```

This happens because incremental migrations assume base tables already exist, but your database is fresh/empty.

## Quick Fix for Fresh Database

If you just dropped and recreated your database (like you did), use this approach:

### Method 1: Direct Schema Push (Fastest for Fresh DB)

```bash
cd ~/apps/backend-ezifycloud

# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema directly to database (creates all tables)
npx prisma db push --accept-data-loss

# 3. Create baseline migration from current state
npx prisma migrate dev --name init --create-only

# 4. Mark it as applied (since we already pushed)
npx prisma migrate resolve --applied init
```

### Method 2: Reset Migrations and Create Fresh One

```bash
cd ~/apps/backend-ezifycloud

# Run the reset script (Linux)
chmod +x scripts/reset-migrations.sh
./scripts/reset-migrations.sh

# Or manually:
# 1. Backup old migrations
mkdir -p prisma/migrations_backup
cp -r prisma/migrations/* prisma/migrations_backup/

# 2. Remove old migration SQL files (keep migration_lock.toml)
find prisma/migrations -name "migration.sql" -delete
find prisma/migrations -type d -empty -delete

# 3. Create fresh migration
npx prisma migrate dev --name init --create-only

# 4. Deploy
npx prisma migrate deploy
```

## Solution: Fresh Database Setup

### Option 1: Using Prisma Migrate (Recommended)

1. **Ensure your database is empty or freshly created:**
   ```sql
   DROP DATABASE IF EXISTS ezifycloud;
   CREATE DATABASE ezifycloud;
   ```

2. **Grant necessary permissions:**
   ```sql
   GRANT ALL PRIVILEGES ON SCHEMA public TO ezifyuser;
   GRANT USAGE, CREATE ON SCHEMA public TO ezifyuser;
   ```

3. **Generate a fresh initial migration:**
   ```bash
   cd backend-ezifycloud
   npx prisma migrate dev --name init_production --create-only
   ```

4. **Review the generated migration** in `prisma/migrations/[timestamp]_init_production/migration.sql`

5. **Deploy to production:**
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: Using Prisma DB Push (Development/Quick Setup)

For development or when you need a quick setup without migration history:

```bash
npx prisma db push
```

**⚠️ Warning:** `db push` doesn't create migration files and should not be used in production with existing data.

### Option 3: Manual SQL Script (Advanced)

If you need full control, you can:

1. Generate the SQL from your schema:
   ```bash
   npx prisma migrate dev --create-only --name init
   ```

2. Review and edit the generated SQL file

3. Apply manually:
   ```bash
   psql -d ezifycloud -f prisma/migrations/[timestamp]_init/migration.sql
   ```

## Production Deployment Steps

### On Your Production Server:

1. **SSH into your server:**
   ```bash
   ssh leavesystem@srv990936
   ```

2. **Navigate to your backend directory:**
   ```bash
   cd ~/apps/backend-ezifycloud
   ```

3. **Ensure DATABASE_URL is set in .env:**
   ```bash
   # Check your .env file
   cat .env | grep DATABASE_URL
   ```

4. **Run the setup script (Linux):**
   ```bash
   chmod +x scripts/setup-production-db.sh
   ./scripts/setup-production-db.sh
   ```

   Or manually:
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Create and apply migrations
   npx prisma migrate deploy
   ```

5. **Verify the setup:**
   ```bash
   # Check if tables were created
   psql -d ezifycloud -c "\dt"
   
   # Or use Prisma Studio (for verification only, not in production)
   npx prisma studio
   ```

## Troubleshooting

### Error: "A migration failed to apply"

If you see this error, you need to resolve it:

1. **Check the migration status:**
   ```bash
   npx prisma migrate status
   ```

2. **If migrations are in a bad state, you can:**
   - Mark migrations as applied (if you've manually fixed the database):
     ```bash
     npx prisma migrate resolve --applied [migration_name]
     ```
   - Or reset and start fresh (⚠️ **WILL DELETE ALL DATA**):
     ```bash
     npx prisma migrate reset
     ```

### Error: "relation does not exist"

This means the base tables haven't been created. Follow Option 1 above to create a fresh initial migration.

### Error: Permission denied

Ensure your database user has the necessary permissions:
```sql
GRANT ALL PRIVILEGES ON SCHEMA public TO ezifyuser;
GRANT USAGE, CREATE ON SCHEMA public TO ezifyuser;
GRANT ALL PRIVILEGES ON DATABASE ezifycloud TO ezifyuser;
```

## Best Practices

1. **Always backup your database before migrations:**
   ```bash
   pg_dump ezifycloud > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations on a staging environment first**

3. **Review generated migrations before applying**

4. **Keep migration files in version control**

5. **Never edit applied migrations** - create new ones instead

## Migration Workflow

```
Development:
1. Make schema changes in schema.prisma
2. Run: npx prisma migrate dev --name descriptive_name
3. Test locally
4. Commit migration files to git

Production:
1. Pull latest code
2. Run: npx prisma migrate deploy
3. Verify application works
```

## Quick Reference Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create a new migration (development)
npx prisma migrate dev --name migration_name

# Apply pending migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Push schema changes without migrations (dev only)
npx prisma db push

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

