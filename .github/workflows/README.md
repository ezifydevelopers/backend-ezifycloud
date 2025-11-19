# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD of the Ezify Cloud application.

**Note:** These workflow files must be in `.github/workflows/` at the repository root for GitHub Actions to recognize them. They automatically trigger when changes are made to the `frontend-ezifycloud/` or `backend-ezifycloud/` directories.

## Workflows

### 1. `ci.yml` - Continuous Integration
Runs on every push and pull request to `main` and `develop` branches.
- **Frontend CI**: Lints and builds the frontend application
- **Backend CI**: Lints, builds, and tests the backend application with a PostgreSQL database

### 2. `frontend-deploy.yml` - Frontend Deployment
Deploys the frontend application when changes are pushed to `main` or `develop` branches.
- Builds the frontend application
- Supports multiple deployment platforms:
  - **Vercel** (default, if configured)
  - Netlify
  - AWS S3 + CloudFront
  - GitHub Pages

### 3. `backend-deploy.yml` - Backend Deployment
Deploys the backend application when changes are pushed to `main` or `develop` branches.
- Builds and tests the backend application
- Runs database migrations
- Supports multiple deployment platforms:
  - **AWS Elastic Beanstalk** (default, if configured)
  - Heroku
  - Railway
  - DigitalOcean App Platform
  - Custom server via SSH
  - Docker registry

## Setup Instructions

### Required GitHub Secrets

#### Frontend Deployment (Vercel)
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
VITE_API_URL=https://your-api-url.com
```

#### Frontend Deployment (Netlify)
```
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
```

#### Frontend Deployment (AWS)
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
CLOUDFRONT_DISTRIBUTION_ID=your_distribution_id
```

#### Backend Deployment (AWS Elastic Beanstalk)
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
EB_APPLICATION_NAME=ezify-backend
EB_ENVIRONMENT_NAME=ezify-backend-prod
```

#### Backend Deployment (Heroku)
```
HEROKU_API_KEY=your_heroku_api_key
HEROKU_APP_NAME=your-app-name
HEROKU_EMAIL=your-email@example.com
```

#### Backend Deployment (Custom Server)
```
SSH_PRIVATE_KEY=your_ssh_private_key
SSH_USER=deploy
SSH_HOST=your-server-ip
```

### How to Add Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

### Enabling Deployment

1. **Choose your deployment platform** from the options in the workflow files
2. **Uncomment the relevant deployment section** in the workflow file
3. **Comment out or remove other deployment options** you're not using
4. **Add the required secrets** to your GitHub repository
5. **Push to main or develop branch** to trigger deployment

### Workflow Triggers

- **Push to main/develop**: Triggers build, test, and deploy
- **Pull Request**: Triggers build and test only (no deployment)
- **Manual trigger**: Use `workflow_dispatch` to manually trigger workflows

### Customization

You can customize the workflows by:
- Changing the Node.js version in the `NODE_VERSION` env variable
- Adding additional build steps
- Modifying deployment configurations
- Adding environment-specific deployments (staging, production)

## Notes

- The workflows use `npm ci` for faster, reliable builds
- Build artifacts are stored for 7 days
- Database migrations run automatically during backend deployment
- Tests are set to `continue-on-error: true` to not block deployments if tests fail (you can change this)

