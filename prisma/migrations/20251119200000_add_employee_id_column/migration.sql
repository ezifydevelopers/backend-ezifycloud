-- Add employee_id column to users table
-- This migration adds the employee_id column that was missing from the production database

-- Add the employee_id column if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;

-- Add unique constraint (only for non-null values)
-- Drop index if it exists first to avoid errors
DROP INDEX IF EXISTS "users_employee_id_key";
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id") WHERE "employee_id" IS NOT NULL;

