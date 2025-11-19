# Quick Fix: Add employee_id Column Directly

## Problem
Migrations keep failing, blocking the `employee_id` column from being added. The quickest solution is to add it directly via SQL.

## Solution: Direct SQL Fix

Run these commands on your production server:

```bash
cd ~/apps/backend-ezifycloud

# Connect to your database and add the column
psql -U postgres -d ezifycloud << 'EOF'
-- Add employee_id column
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;

-- Create unique index (allows NULL values)
DROP INDEX IF EXISTS "users_employee_id_key";
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id") WHERE "employee_id" IS NOT NULL;
EOF

# Regenerate Prisma Client
npx prisma generate

# Restart backend
pm2 restart backend
```

## Or Use the Quick Fix Script

```bash
cd ~/apps/backend-ezifycloud
chmod +x quick-fix-employee-id.sh
./quick-fix-employee-id.sh
```

## Manual SQL (If psql command doesn't work)

If you need to connect to the database manually:

```bash
# Connect to database
psql -U postgres -d ezifycloud

# Then run these SQL commands:
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_employee_id_key" ON "users"("employee_id") WHERE "employee_id" IS NOT NULL;

# Exit
\q

# Regenerate Prisma Client
cd ~/apps/backend-ezifycloud
npx prisma generate

# Restart backend
pm2 restart backend
```

## Verify It Worked

1. **Check the column exists**:
   ```bash
   psql -U postgres -d ezifycloud -c "\d users" | grep employee_id
   ```

2. **Check backend logs**:
   ```bash
   pm2 logs backend --lines 20
   ```

3. **Try logging in** - The error should be gone

## Why This Works

- Bypasses Prisma migrations entirely
- Adds the column directly to the database
- Regenerates Prisma Client to recognize the new column
- The migration can be marked as applied later (or ignored)

## After This Works

Once the column is added and working, you can optionally:
1. Mark the migration as applied: `npx prisma migrate resolve --applied 20251119200000_add_employee_id_column`
2. Or just leave it - the column exists and works, that's what matters

