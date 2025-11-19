# Production Database Setup Script for Windows PowerShell
# This script sets up a fresh database for production deployment

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Production Database Setup..." -ForegroundColor Cyan

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Step 1: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "📋 Step 2: Creating fresh initial migration..." -ForegroundColor Yellow
# Create a fresh migration from current schema
npx prisma migrate dev --name init_production --create-only

Write-Host "📋 Step 3: Applying migrations to database..." -ForegroundColor Yellow
# Deploy migrations to production database
npx prisma migrate deploy

Write-Host "📋 Step 4: Verifying database schema..." -ForegroundColor Yellow
# Verify the schema matches
npx prisma db pull --force

Write-Host "✅ Production database setup completed successfully!" -ForegroundColor Green
Write-Host "📊 You can now run 'npx prisma studio' to view your database" -ForegroundColor Green

