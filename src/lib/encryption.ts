import crypto from 'crypto';

/**
 * Encryption service for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Get encryption key from environment or generate a default (for development only)
 * In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)');
    // Default key for development - NEVER use in production
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
  }
  return Buffer.from(key, 'hex');
}

/**
 * Derive a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(data: string): string {
  try {
    const masterKey = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(masterKey.toString('hex'), salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  try {
    const masterKey = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = deriveKey(masterKey.toString('hex'), salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way, for passwords, etc.)
 */
export function hash(data: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto
    .pbkdf2Sync(data, generatedSalt, ITERATIONS, KEY_LENGTH, 'sha512')
    .toString('hex');
  return { hash, salt: generatedSalt };
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashData(data, salt);
  return computedHash === hash;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash data with salt (internal helper)
 */
function hashData(data: string, salt: string): { hash: string; salt: string } {
  const hash = crypto
    .pbkdf2Sync(data, salt, ITERATIONS, KEY_LENGTH, 'sha512')
    .toString('hex');
  return { hash, salt };
}

