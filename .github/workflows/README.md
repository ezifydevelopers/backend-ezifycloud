# Backend Deployment Workflow

This workflow automatically deploys the backend application to the server when changes are pushed to `main` or `develop` branches.

## Server Configuration

- **Host**: `srv990936`
- **Username**: `leavesystem`
- **Deployment Path**: `~/apps/backend-ezifycloud` (expands to `/home/leavesystem/apps/backend-ezifycloud`)

## Required GitHub Secrets

These secrets should already be configured in your GitHub repository (Settings → Secrets → Actions):

```
PROD_HOST=srv990936
PROD_USERNAME=leavesystem
SSH_KEY=your_private_ssh_key_content
SSH_PORT=22 (optional, defaults to 22)
```

## Deployment Process

When you push to `main` or `develop` branch, the workflow will:

1. **Checkout** the latest code
2. **SSH into the server** (`srv990936`)
3. **Navigate** to `~/apps/backend-ezifycloud`
4. **Pull** latest changes from GitHub
5. **Install** dependencies (`npm ci`)
6. **Generate** Prisma Client (`npx prisma generate`)
7. **Run** database migrations (`npx prisma migrate deploy`)
8. **Build** TypeScript code (`npm run build`)
9. **Restart** the application with PM2 (`pm2 restart backend-ezifycloud`)

## PM2 Process Name

The application runs as `backend-ezifycloud` in PM2. Make sure this matches your PM2 configuration on the server.

## Manual Deployment

You can also trigger the deployment manually:
1. Go to **Actions** tab in GitHub
2. Select **Deploy Backend** workflow
3. Click **Run workflow**
4. Choose the branch and click **Run workflow**

## Troubleshooting

- **SSH Connection Failed**: Check that `SSH_PRIVATE_KEY` secret is correctly set
- **PM2 Not Found**: Install PM2 on the server: `npm install -g pm2`
- **Database Migration Failed**: Check database connection and credentials
- **Build Failed**: Check Node.js version on server (should be 18.x or higher)
