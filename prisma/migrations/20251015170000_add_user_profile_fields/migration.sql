-- Add profile fields to users table
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "address" TEXT;
ALTER TABLE "users" ADD COLUMN "emergencyContact" TEXT;
ALTER TABLE "users" ADD COLUMN "emergencyPhone" TEXT;
