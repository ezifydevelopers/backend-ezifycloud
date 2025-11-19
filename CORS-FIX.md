# CORS Configuration Fix

## Problem
CORS error: `Access to fetch at 'http://31.97.72.136:9001/api/auth/login' from origin 'http://31.97.72.136:3000' has been blocked by CORS policy`

## Solution

### 1. Update Environment Variable

Add or update the `CORS_ORIGIN` environment variable in your `.env` file:

```env
CORS_ORIGIN=http://31.97.72.136:3000,http://localhost:3000
```

For multiple origins, separate them with commas:
```env
CORS_ORIGIN=http://31.97.72.136:3000,http://localhost:3000,https://yourdomain.com
```

### 2. Restart the Server

After updating the `.env` file, restart your backend server:

```bash
# If using PM2
pm2 restart backend-ezifycloud

# Or if running directly
npm run dev
# or
npm start
```

### 3. Verify CORS Configuration

The CORS middleware has been updated to:
- Handle preflight OPTIONS requests properly
- Allow credentials (cookies, authorization headers)
- Support multiple HTTP methods
- Work in development mode (allows all origins)

### 4. Production Setup

For production, make sure to:
1. Set `NODE_ENV=production` in your `.env`
2. Add your production frontend URL to `CORS_ORIGIN`
3. Use HTTPS for both frontend and backend

Example production `.env`:
```env
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
PORT=9001
```

## Testing

After making changes, test the CORS configuration:

```bash
# Test preflight request
curl -X OPTIONS http://31.97.72.136:9001/api/auth/login \
  -H "Origin: http://31.97.72.136:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Should return:
# Access-Control-Allow-Origin: http://31.97.72.136:3000
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

## Changes Made

1. **Moved CORS middleware before security middleware** - Ensures preflight requests are handled
2. **Updated CORS configuration** - Now properly handles:
   - Dynamic origin checking
   - Development mode (allows all origins)
   - Proper preflight handling
   - Credentials support
3. **Updated security headers** - Added CORS headers to security middleware
4. **Helmet configuration** - Set `crossOriginResourcePolicy: "cross-origin"`

## Troubleshooting

If you still see CORS errors:

1. **Check environment variable**: Make sure `CORS_ORIGIN` is set correctly
2. **Check server logs**: Look for CORS-related errors
3. **Verify origin**: The frontend origin must exactly match one in `CORS_ORIGIN`
4. **Check protocol**: Make sure both use HTTP or both use HTTPS
5. **Clear browser cache**: Sometimes browsers cache CORS responses

## Quick Fix for Development

If you want to allow all origins in development (not recommended for production):

The code already does this - in development mode (`NODE_ENV=development`), all origins are allowed.

