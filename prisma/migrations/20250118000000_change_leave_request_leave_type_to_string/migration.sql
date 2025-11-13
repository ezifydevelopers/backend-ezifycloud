-- AlterTable: Change leave_type from enum to text
-- This allows custom leave types that match leave policies

-- Step 1: Add a new temporary column with text type
ALTER TABLE "leave_requests" 
ADD COLUMN "leave_type_temp" TEXT;

-- Step 2: Copy data from enum column to text column (cast enum to text)
UPDATE "leave_requests" 
SET "leave_type_temp" = "leave_type"::TEXT;

-- Step 3: Drop the old enum column
ALTER TABLE "leave_requests" 
DROP COLUMN "leave_type";

-- Step 4: Rename the temporary column to the original name
ALTER TABLE "leave_requests" 
RENAME COLUMN "leave_type_temp" TO "leave_type";

-- Step 5: Add NOT NULL constraint back
ALTER TABLE "leave_requests" 
ALTER COLUMN "leave_type" SET NOT NULL;

-- Note: The LeaveType enum still exists in the database but is no longer used by leave_requests table
-- You can drop it later if it's not used elsewhere, but we'll keep it for now to avoid breaking other tables

