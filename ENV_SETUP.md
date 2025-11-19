# Environment Setup Guide

This guide explains how to set up environment variables for local development and production.

## Environment Files

Create the appropriate `.env` file based on your environment:

### Local Development (`.env.local`)

Create `backend-ezifycloud/.env.local`:

```env
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
```

### Production (`.env.production`)

Create `backend-ezifycloud/.env.production`:

```env
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
```

## CORS Configuration

The `CORS_ORIGIN` environment variable accepts multiple origins separated by commas. This allows the backend to accept requests from multiple frontend URLs.

### Local Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:9001`
- CORS: `http://localhost:3000,http://localhost:8080`

### Production
- Frontend: `http://31.97.72.136:3000`
- Backend: `http://31.97.72.136:9001` (or `http://31.97.72.136/api`)
- CORS: `http://31.97.72.136:3000,http://31.97.72.136`

## Important Notes

1. **CORS Origins**: Make sure to include all frontend URLs that will access the API
2. **Port Configuration**: Backend runs on port `9001` by default
3. **Environment Variables**: The backend uses `dotenv` to load `.env` files
4. **Security**: Never commit `.env.local` or `.env.production` files with real secrets
5. **Database URL**: Update the `DATABASE_URL` with your actual production database credentials

## Troubleshooting CORS Issues

If you encounter CORS errors:

1. **Check CORS_ORIGIN**: Verify the frontend URL is included in `CORS_ORIGIN`
2. **Check Protocol**: Ensure both HTTP and HTTPS are included if needed
3. **Check Port**: Include the port number if the frontend uses a specific port
4. **Restart Server**: Restart the backend server after changing `.env` files
5. **Check Browser Console**: Look for specific CORS error messages

## Example CORS Error Fix

If you see:
```
Access to fetch at 'http://localhost:9001/api/auth/login' from origin 'http://31.97.72.136:3000' has been blocked by CORS policy
```

**Solution**: 
1. Update frontend `.env.production` to use `VITE_API_URL=http://31.97.72.136/api`
2. Update backend `.env.production` to include `CORS_ORIGIN=http://31.97.72.136:3000,http://31.97.72.136`
3. Rebuild frontend and restart backend

