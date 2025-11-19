# Resolve Failed Migration Issue

## Problem
Prisma found a failed migration in the database:
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251014201055_add_holiday_model` migration started at 2025-11-13 14:50:24.319584 UTC failed
```

## Solution

### Option 1: Use the Resolution Script (Recommended)

Run the script that handles everything:

```bash
cd ~/apps/backend-ezifycloud
chmod +x resolve-failed-migration.sh
./resolve-failed-migration.sh
```

### Option 2: Manual Steps

1. **Mark the failed migration as rolled back**:
   ```bash
   cd ~/apps/backend-ezifycloud
   npx prisma migrate resolve --rolled-back 20251014201055_add_holiday_model
   ```

2. **Apply all pending migrations**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

4. **Restart backend**:
   ```bash
   pm2 restart backend
   ```

### Option 3: If the Holiday Migration is Already Applied

If the holiday model already exists in your database, mark it as applied instead:

```bash
cd ~/apps/backend-ezifycloud
npx prisma migrate resolve --applied 20251014201055_add_holiday_model
npx prisma migrate deploy
npx prisma generate
pm2 restart backend
```

### Option 4: Direct SQL Fix (If Prisma commands fail)

If Prisma commands don't work, you can manually fix the migration table and add the column:

```bash
# Connect to database
psql -U postgres -d ezifycloud

# Fix the migration status
UPDATE "_prisma_migrations" 
SET "finished_at" = NOW(), 
    "rolled_back_at" = NULL,
    "logs" = NULL,
    "applied_steps_count" = 1
WHERE "migration_name" = '20251014201055_add_holiday_model' 
  AND "finished_at" IS NULL;

# Add employee_id column directly
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_employee_id_key" ON "users"("employee_id") WHERE "employee_id" IS NOT NULL;

# Exit
\q

# Regenerate Prisma client
cd ~/apps/backend-ezifycloud
npx prisma generate
pm2 restart backend
```

## Verification

After resolving the issue:

1. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

2. **Check backend logs**:
   ```bash
   pm2 logs backend --lines 30
   ```

3. **Test login** - Try logging in through the frontend

## Understanding the Issue

- Prisma tracks migration state in the `_prisma_migrations` table
- If a migration fails partway through, Prisma marks it as failed
- New migrations won't be applied until failed migrations are resolved
- You can either mark it as "rolled back" (if it didn't apply) or "applied" (if it did apply)

## What the Script Does

1. Checks current migration status
2. Marks the failed migration as rolled back
3. Generates Prisma Client
4. Applies all pending migrations (including the employee_id one)
5. Restarts the backend

