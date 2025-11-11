import { IStorageProvider } from './IStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';
import { APP_CONFIG } from '../../../config/app';

/**
 * Factory to create storage providers based on configuration
 */
export class StorageFactory {
  private static providers: Map<string, IStorageProvider> = new Map();

  /**
   * Get storage provider based on type
   */
  static getProvider(type: 'local' | 's3' = 'local'): IStorageProvider {
    // Return cached provider if exists
    if (this.providers.has(type)) {
      return this.providers.get(type)!;
    }

    let provider: IStorageProvider;

    switch (type) {
      case 's3':
        const s3Config = {
          bucket: APP_CONFIG.UPLOAD.S3.BUCKET || process.env.AWS_S3_BUCKET || '',
          region: APP_CONFIG.UPLOAD.S3.REGION || process.env.AWS_REGION || 'us-east-1',
          accessKeyId: APP_CONFIG.UPLOAD.S3.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: APP_CONFIG.UPLOAD.S3.SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
        };

        if (!s3Config.bucket) {
          console.warn('S3 bucket not configured. Falling back to local storage.');
          provider = new LocalStorageProvider(APP_CONFIG.UPLOAD.PATH);
        } else {
          provider = new S3StorageProvider(s3Config);
        }
        break;

      case 'local':
      default:
        provider = new LocalStorageProvider(APP_CONFIG.UPLOAD.PATH);
        break;
    }

    // Cache provider
    this.providers.set(type, provider);

    return provider;
  }

  /**
   * Get default storage provider based on environment
   */
  static getDefaultProvider(): IStorageProvider {
    const storageType = (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3';
    return this.getProvider(storageType);
  }

  /**
   * Clear cached providers (useful for testing)
   */
  static clearCache(): void {
    this.providers.clear();
  }
}

