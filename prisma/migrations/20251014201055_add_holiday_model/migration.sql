-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'employee');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('annual', 'sick', 'casual', 'maternity', 'paternity', 'emergency');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'escalated');

-- CreateEnum
CREATE TYPE "HalfDayPeriod" AS ENUM ('morning', 'afternoon');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('public', 'company', 'religious', 'national');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" TEXT,
    "manager_id" TEXT,
    "profile_picture" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DECIMAL(3,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_period" "HalfDayPeriod",
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annual_total" INTEGER NOT NULL DEFAULT 25,
    "annual_used" INTEGER NOT NULL DEFAULT 0,
    "annual_remaining" INTEGER NOT NULL DEFAULT 0,
    "sick_total" INTEGER NOT NULL DEFAULT 10,
    "sick_used" INTEGER NOT NULL DEFAULT 0,
    "sick_remaining" INTEGER NOT NULL DEFAULT 0,
    "casual_total" INTEGER NOT NULL DEFAULT 8,
    "casual_used" INTEGER NOT NULL DEFAULT 0,
    "casual_remaining" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "total_days_per_year" INTEGER NOT NULL,
    "can_carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward_days" INTEGER,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "allow_half_day" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "target_type" TEXT,
    "details" TEXT,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_documents" (
    "id" TEXT NOT NULL,
    "leave_request_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "HolidayType" NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_user_id_year_key" ON "leave_balances"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_leave_type_key" ON "leave_policies"("leave_type");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_name_date_key" ON "holidays"("name", "date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_documents" ADD CONSTRAINT "leave_documents_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
