-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "hours_worked" DECIMAL(4,2) DEFAULT 0,
    "overtime_hours" DECIMAL(4,2) DEFAULT 0,
    "notes" TEXT,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "is_weekend" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "working_hours_per_day" DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    "late_threshold_minutes" INTEGER NOT NULL DEFAULT 15,
    "overtime_threshold_hours" DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    "allow_flexible_hours" BOOLEAN NOT NULL DEFAULT false,
    "require_check_in" BOOLEAN NOT NULL DEFAULT true,
    "require_check_out" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_user_id_date_key" ON "attendance_records"("user_id", "date");

-- CreateIndex
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");

-- CreateIndex
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
