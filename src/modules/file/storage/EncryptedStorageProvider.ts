import { IStorageProvider } from './IStorageProvider';
import { encrypt, decrypt } from '../../../lib/encryption';

/**
 * Encrypted Storage Provider Wrapper
 * Wraps any storage provider to add encryption at rest
 */
export class EncryptedStorageProvider implements IStorageProvider {
  private provider: IStorageProvider;
  private encryptFiles: boolean;

  constructor(provider: IStorageProvider, encryptFiles: boolean = true) {
    this.provider = provider;
    this.encryptFiles = encryptFiles;
  }

  /**
   * Upload a file with optional encryption
   */
  async upload(
    buffer: Buffer,
    key: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url?: string }> {
    let dataToUpload = buffer;

    // Encrypt if enabled
    if (this.encryptFiles) {
      const encryptedData = encrypt(buffer.toString('base64'));
      dataToUpload = Buffer.from(encryptedData, 'utf8');
      
      // Add encryption flag to metadata
      metadata = {
        ...metadata,
        encrypted: 'true',
        originalSize: buffer.length.toString(),
      };
    }

    return this.provider.upload(dataToUpload, key, metadata);
  }

  /**
   * Download and decrypt a file
   */
  async download(key: string): Promise<Buffer> {
    const encryptedBuffer = await this.provider.download(key);
    
    // Check if file is encrypted (would need metadata check in real implementation)
    // For now, try to decrypt if it looks like base64 encrypted data
    try {
      const encryptedString = encryptedBuffer.toString('utf8');
      const decryptedString = decrypt(encryptedString);
      return Buffer.from(decryptedString, 'base64');
    } catch (error) {
      // If decryption fails, assume file is not encrypted
      return encryptedBuffer;
    }
  }

  /**
   * Get a readable stream (decrypted)
   */
  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const buffer = await this.download(key);
    const { Readable } = await import('stream');
    return Readable.from(buffer);
  }

  /**
   * Delete a file
   */
  async delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  /**
   * Get file URL (for public access)
   * Note: Encrypted files may not be directly accessible via URL
   */
  async getUrl(key: string): Promise<string | null> {
    // For encrypted files, we might want to return null or a signed URL
    if (this.encryptFiles) {
      return this.getSignedUrl(key);
    }
    return this.provider.getUrl(key);
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string | null> {
    return this.provider.getSignedUrl(key, expiresIn);
  }
}

