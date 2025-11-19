# Reset Migrations Script for Windows PowerShell
# This script backs up old migrations and creates a fresh initial migration

$ErrorActionPreference = "Stop"

Write-Host "🔄 Resetting migrations for fresh database setup..." -ForegroundColor Cyan

# Backup old migrations
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "prisma\migrations_backup_$timestamp"

if (Test-Path "prisma\migrations") {
    Write-Host "📦 Backing up existing migrations to $backupDir..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item -Path "prisma\migrations\*" -Destination $backupDir -Recurse -Force
}

# Remove old migrations (keep migration_lock.toml)
Write-Host "🗑️  Removing old migration files..." -ForegroundColor Yellow
Get-ChildItem -Path "prisma\migrations" -Recurse -File -Filter "migration.sql" | Remove-Item -Force
Get-ChildItem -Path "prisma\migrations" -Recurse -Directory | Where-Object { (Get-ChildItem $_.FullName).Count -eq 0 } | Remove-Item -Force

# Create fresh initial migration
Write-Host "✨ Creating fresh initial migration..." -ForegroundColor Yellow
npx prisma migrate dev --name init --create-only

Write-Host "✅ Migration reset complete!" -ForegroundColor Green
Write-Host "📝 Review the generated migration in prisma\migrations\" -ForegroundColor Green
Write-Host "🚀 Then run: npx prisma migrate deploy" -ForegroundColor Green

