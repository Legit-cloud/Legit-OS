import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_SEED = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'legit-innovation-hub-secure-salt-2026';
// Derive 32-byte key using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest();

/**
 * Encrypts private chat content (DMs, Support) using authenticated AES-256-GCM.
 * Public community channels remain plaintext for open search and performance.
 */
export function encryptMessage(content: string, channel: string): string {
  if (!content) return content;
  // Only encrypt private channels (direct messages and support lines)
  if (!channel.startsWith('dm:') && !channel.startsWith('support:')) {
    return content;
  }

  try {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    // Add channel name as Authenticated Additional Data (AAD) to prevent channel-spoofing
    cipher.setAAD(Buffer.from(channel, 'utf8'));

    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return `enc:v1:${iv.toString('base64')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return content;
  }
}

/**
 * Decrypts AES-256-GCM encrypted messages.
 * Verifies authenticity tag and AAD channel matching.
 */
export function decryptMessage(storedContent: string, channel: string): string {
  if (!storedContent || !storedContent.startsWith('enc:v1:')) {
    return storedContent;
  }

  try {
    const parts = storedContent.split(':');
    if (parts.length !== 5) return storedContent;

    const [, , ivBase64, authTagBase64, cipherText] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAAD(Buffer.from(channel, 'utf8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // If decryption fails or authentication tag does not match, return fallback
    return '[Protected message]';
  }
}
