import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const KEY_SALT = 'dentist-app-integration';

function deriveKey(encryptionKey: string): Buffer {
  return scryptSync(encryptionKey, KEY_SALT, 32);
}

export function encryptIntegrationSecret(
  plain: string,
  encryptionKey: string,
): string {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
}

export function decryptIntegrationSecret(
  stored: string,
  encryptionKey: string,
): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }

  const payload = Buffer.from(stored.slice(PREFIX.length), 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const key = deriveKey(encryptionKey);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}

export function maskIntegrationSecret(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return `****${value.slice(-4)}`;
}
