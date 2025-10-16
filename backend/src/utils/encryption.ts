/**
 * Encryption utilities for sensitive data (Telegram credentials).
 * Uses AES-256-CBC encryption.
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const IV_LENGTH = 16; // AES block size

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
    'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

/**
 * Encrypts plain text using AES-256-CBC.
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format "iv:encryptedData" (hex encoded)
 *
 * @example
 * const encrypted = encrypt('my-secret-telegram-session');
 * // Returns: "a1b2c3d4e5f6....:1234567890abcdef...."
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty string');
  }

  // Generate random IV for each encryption
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return IV:encrypted format
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts encrypted text using AES-256-CBC.
 *
 * @param encryptedText - Encrypted string in format "iv:encryptedData"
 * @returns Decrypted plain text
 *
 * @example
 * const decrypted = decrypt('a1b2c3d4e5f6....:1234567890abcdef....');
 * // Returns: 'my-secret-telegram-session'
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty string');
  }

  // Split IV and encrypted data
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format. Expected "iv:encryptedData"');
  }

  const [ivHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length. Expected ${IV_LENGTH} bytes, got ${iv.length}`);
  }

  // Create decipher
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  // Decrypt
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Tests encryption/decryption with sample data.
 * Useful for verifying ENCRYPTION_KEY is correct.
 *
 * @returns true if test passes, throws error if fails
 */
export function testEncryption(): boolean {
  const testData = 'test-telegram-session-string-12345';

  try {
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testData) {
      throw new Error('Decrypted data does not match original');
    }

    console.log(' Encryption test passed');
    return true;
  } catch (error) {
    console.error(' Encryption test failed:', error);
    throw error;
  }
}
