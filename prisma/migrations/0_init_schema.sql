-- This is a consolidated initial migration for production
-- It creates all base tables and structures from the current schema
-- Generated for fresh database setup

-- Create Enums
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE "LeaveType" AS ENUM ('annual', 'sick', 'casual', 'maternity', 'paternity', 'emergency');
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'escalated');
CREATE TYPE "HalfDayPeriod" AS ENUM ('morning', 'afternoon');
CREATE TYPE "HolidayType" AS ENUM ('public', 'company', 'religious', 'national');
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');
CREATE TYPE "SalaryStatus" AS ENUM ('draft', 'calculated', 'approved', 'paid', 'cancelled');
CREATE TYPE "DeductionType" AS ENUM ('leave_deduction', 'tax_deduction', 'other_deduction', 'bonus', 'overtime');
CREATE TYPE "WorkspaceRole" AS ENUM ('owner', 'admin', 'finance', 'member', 'viewer');
CREATE TYPE "BoardRole" AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE "ColumnRole" AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE "BoardType" AS ENUM ('invoices', 'payments', 'clients', 'custom');
CREATE TYPE "ColumnType" AS ENUM ('TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'CURRENCY', 'PERCENTAGE', 'DATE', 'DATETIME', 'WEEK', 'MONTH', 'YEAR', 'CHECKBOX', 'DROPDOWN', 'MULTI_SELECT', 'RADIO', 'PEOPLE', 'STATUS', 'TIMELINE', 'FILE', 'FORMULA', 'AUTO_NUMBER', 'LINK', 'RATING', 'VOTE', 'PROGRESS', 'LOCATION', 'MIRROR');
CREATE TYPE "ViewType" AS ENUM ('TABLE', 'KANBAN', 'CALENDAR', 'TIMELINE', 'GALLERY', 'DASHBOARD', 'FORM');
CREATE TYPE "ApprovalLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3');
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ReportType" AS ENUM ('invoice_summary', 'approval_status', 'payment_status', 'aging', 'custom');
CREATE TYPE "NotificationType" AS ENUM ('approval_requested', 'approval_approved', 'approval_rejected', 'changes_requested', 'approval_complete', 'approval_reminder', 'approval_deadline_approaching', 'approval_deadline_passed', 'mention', 'assignment');

-- Create Users table (base table)
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" TEXT,
    "manager_id" TEXT,
    "profile_picture" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "address" TEXT,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "join_date" TIMESTAMP(3),
    "probation_status" TEXT,
    "probation_start_date" TIMESTAMP(3),
    "probation_end_date" TIMESTAMP(3),
    "probation_duration" INTEGER,
    "probation_completed_at" TIMESTAMP(3),
    "employee_type" TEXT,
    "region" TEXT,
    "timezone" TEXT,
    "last_login" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create indexes for users
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- Add foreign key for manager relationship
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Continue with all other tables...
-- Note: This is a template. The actual migration should be generated using:
-- npx prisma migrate dev --name init --create-only
-- Then manually consolidate or use prisma db push for initial setup

