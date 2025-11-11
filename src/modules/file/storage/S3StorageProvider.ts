import { IStorageProvider } from './IStorageProvider';

/**
 * S3/AWS Storage Provider
 * Note: Requires @aws-sdk/client-s3 package
 * Install with: npm install @aws-sdk/client-s3
 */
export class S3StorageProvider implements IStorageProvider {
  private bucket: string;
  private region: string;
  private accessKeyId?: string;
  private secretAccessKey?: string;
  private s3Client: any; // S3Client from @aws-sdk/client-s3

  constructor(config: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;

    // Initialize S3 client if SDK is available
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Dynamic import to avoid errors if package is not installed
      const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

      this.s3Client = new S3Client({
        region: this.region,
        ...(this.accessKeyId && this.secretAccessKey ? {
          credentials: {
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
          },
        } : {}),
      });

      // Store getSignedUrl for later use
      (this as any).getSignedUrl = getSignedUrl;
      (this as any).PutObjectCommand = PutObjectCommand;
      (this as any).GetObjectCommand = GetObjectCommand;
      (this as any).DeleteObjectCommand = DeleteObjectCommand;
      (this as any).HeadObjectCommand = HeadObjectCommand;
    } catch (error) {
      console.warn('AWS SDK not installed. S3 storage will not be available. Install with: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
      this.s3Client = null;
    }
  }

  async upload(
    buffer: Buffer,
    key: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url?: string }> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Please install @aws-sdk/client-s3');
    }

    const { PutObjectCommand } = require('@aws-sdk/client-s3');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      Metadata: metadata,
    });

    await this.s3Client.send(command);

    return {
      key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }

  async download(key: string): Promise<Buffer> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Please install @aws-sdk/client-s3');
    }

    const { GetObjectCommand } = require('@aws-sdk/client-s3');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(Buffer.from(chunk));
    }
    
    return Buffer.concat(chunks);
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Please install @aws-sdk/client-s3');
    }

    const { GetObjectCommand } = require('@aws-sdk/client-s3');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Body as NodeJS.ReadableStream;
  }

  async delete(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Please install @aws-sdk/client-s3');
    }

    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    try {
      const { HeadObjectCommand } = require('@aws-sdk/client-s3');

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getUrl(key: string): Promise<string | null> {
    if (!this.s3Client) {
      return null;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    if (!this.s3Client) {
      return null;
    }

    try {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  }
}

