# Fix Missing employee_id Column

## Problem
The production database is missing the `employee_id` column, causing login errors:
```
The column `users.employee_id` does not exist in the current database.
```

## Solution

### Option 1: Run the Migration Script (Recommended)

On your production server:

```bash
cd ~/apps/backend-ezifycloud
chmod +x fix-employee-id-migration.sh
./fix-employee-id-migration.sh
```

### Option 2: Manual Steps

1. **Generate Prisma Client**:
   ```bash
   cd ~/apps/backend-ezifycloud
   npx prisma generate
   ```

2. **Run Database Migration**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Restart Backend**:
   ```bash
   pm2 restart backend
   ```

### Option 3: Direct SQL (If migrations fail)

If the migration doesn't work, you can add the column directly:

```bash
# Connect to your database
psql -U postgres -d ezify_cloud

# Run this SQL:
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_employee_id_key" ON "users"("employee_id") WHERE "employee_id" IS NOT NULL;

# Exit psql
\q

# Regenerate Prisma Client
cd ~/apps/backend-ezifycloud
npx prisma generate

# Restart backend
pm2 restart backend
```

## Verification

After running the migration, verify it worked:

1. **Check PM2 logs**:
   ```bash
   pm2 logs backend --lines 50
   ```

2. **Test login** - Try logging in through the frontend

3. **Check database** (optional):
   ```bash
   psql -U postgres -d ezify_cloud -c "\d users" | grep employee_id
   ```

## What the Migration Does

The migration file `20251119200000_add_employee_id_column/migration.sql`:
- Adds the `employee_id` column to the `users` table (if it doesn't exist)
- Creates a unique index on `employee_id` (allowing NULL values)
- Is safe to run multiple times (uses IF NOT EXISTS)

## Troubleshooting

### Migration fails with "relation already exists"
- The column might already exist but Prisma client is out of sync
- Run: `npx prisma generate` and restart

### Migration fails with permission errors
- Make sure your database user has ALTER TABLE permissions
- Check DATABASE_URL in `.env` file

### Still getting the error after migration
- Verify the column exists: `psql -U postgres -d ezify_cloud -c "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='employee_id';"`
- Regenerate Prisma client: `npx prisma generate`
- Restart backend: `pm2 restart backend`

