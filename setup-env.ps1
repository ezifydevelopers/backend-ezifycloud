# PowerShell script to set up environment files for backend

Write-Host "Setting up backend environment files..." -ForegroundColor Cyan

# Create .env.local for local development
@"
# Local Development Environment
# Server Configuration
PORT=9001
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:123@localhost:5432/ezify_cloud?schema=public"

# JWT Configuration
JWT_SECRET=f3d29a7c01d64a86bb912c2f8d9fa4c67b82f1e6a07c25a14a7e0c639c37d2c5
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration - Allow local frontend
CORS_ORIGIN=http://localhost:3000,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Email Configuration (for future use)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
"@ | Out-File -FilePath .env.local -Encoding utf8

Write-Host "✅ Created .env.local" -ForegroundColor Green

# Create .env.production for production
@"
# Production Environment
# Server Configuration
PORT=9001
NODE_ENV=production

# Database Configuration
DATABASE_URL="postgresql://postgres:123@localhost:5432/ezify_cloud?schema=public"

# JWT Configuration
JWT_SECRET=f3d29a7c01d64a86bb912c2f8d9fa4c67b82f1e6a07c25a14a7e0c639c37d2c5
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration - Allow production frontend
CORS_ORIGIN=http://31.97.72.136:3000,http://31.97.72.136

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Email Configuration (for future use)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
"@ | Out-File -FilePath .env.production -Encoding utf8

Write-Host "✅ Created .env.production" -ForegroundColor Green
Write-Host ""
Write-Host "Environment files created successfully!" -ForegroundColor Cyan
Write-Host "For local development, use: .env.local" -ForegroundColor Yellow
Write-Host "For production, use: .env.production" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Update DATABASE_URL with your actual production database credentials!" -ForegroundColor Red

