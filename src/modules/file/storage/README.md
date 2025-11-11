# File Storage Providers

This module provides a storage abstraction layer that supports multiple storage backends.

## Supported Storage Providers

### 1. Local Filesystem (Default)
- Stores files in the local filesystem
- Path: `./uploads` (configurable via `UPLOAD_PATH` env var)
- No additional dependencies required

### 2. AWS S3
- Stores files in Amazon S3
- Requires AWS SDK installation
- Configuration via environment variables

## Installation

### For S3 Support

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Configuration

### Environment Variables

```env
# Storage Provider (local | s3)
STORAGE_PROVIDER=local

# S3 Configuration (required if STORAGE_PROVIDER=s3)
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Local Storage Configuration

```env
UPLOAD_PATH=./uploads
```

## Usage

The storage provider is automatically selected based on the `STORAGE_PROVIDER` environment variable. The system will fall back to local storage if S3 is not properly configured.

## File Organization

Files can be organized into folders:

- Root folder: `null` or empty string
- Nested folders: `documents/invoices`, `images/thumbnails`, etc.

## Version Tracking

Files support version tracking:

- Each file has a `version` number (starts at 1)
- Replacing a file creates a new version
- Previous versions are marked as `isLatest: false`
- Latest version is always `isLatest: true`

