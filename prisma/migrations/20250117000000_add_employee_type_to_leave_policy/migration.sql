-- AlterTable: Add employee_type column
ALTER TABLE "leave_policies" ADD COLUMN IF NOT EXISTS "employee_type" TEXT;

-- Drop the old unique constraint on leave_type if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leave_policies_leave_type_key'
    ) THEN
        ALTER TABLE "leave_policies" DROP CONSTRAINT "leave_policies_leave_type_key";
    END IF;
END $$;

-- Create new composite unique constraint on (leave_type, employee_type)
CREATE UNIQUE INDEX IF NOT EXISTS "leave_policies_leave_type_employee_type_key" 
ON "leave_policies"("leave_type", "employee_type");

