/**
 * Storage Provider Interface
 * Abstract interface for different storage backends (local, S3, etc.)
 */
export interface IStorageProvider {
  /**
   * Upload a file to storage
   */
  upload(
    buffer: Buffer,
    key: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url?: string }>;

  /**
   * Download a file from storage
   */
  download(key: string): Promise<Buffer>;

  /**
   * Get a readable stream for a file
   */
  getStream(key: string): Promise<NodeJS.ReadableStream>;

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get file URL (for public access)
   */
  getUrl(key: string): Promise<string | null>;

  /**
   * Get signed URL for temporary access
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string | null>;
}

