import path from 'path';
import fs from 'fs';
import { IStorageProvider } from './IStorageProvider';

/**
 * Local filesystem storage provider
 */
export class LocalStorageProvider implements IStorageProvider {
  private basePath: string;

  constructor(basePath: string = './uploads') {
    this.basePath = basePath;
  }

  async upload(
    buffer: Buffer,
    key: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url?: string }> {
    const fullPath = path.join(this.basePath, key);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, buffer);

    return {
      key,
      url: `/uploads/${key.replace(/\\/g, '/')}`, // Relative URL
    };
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    return fs.readFileSync(fullPath);
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const fullPath = path.join(this.basePath, key);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    return fs.createReadStream(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, key);
    return fs.existsSync(fullPath);
  }

  async getUrl(key: string): Promise<string | null> {
    // For local storage, return relative path
    return `/uploads/${key.replace(/\\/g, '/')}`;
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string | null> {
    // Local storage doesn't need signed URLs, return regular URL
    return this.getUrl(key);
  }
}

