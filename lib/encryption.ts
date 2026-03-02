/**
 * AES-256-GCM encryption for sensitive data (account numbers).
 * Server-only. Uses ENCRYPTION_KEY (32 bytes, base64) from env.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || typeof raw !== "string") {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (base64 encoded)");
  }
  return key;
}

/**
 * Encrypts plaintext. Returns base64 string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts ciphertext (base64 iv:authTag:ciphertext). Returns plaintext.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64");
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext");
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Returns true if the value looks like encrypted data (base64, correct length).
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 50) return false;
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length >= IV_LENGTH + AUTH_TAG_LENGTH && /^[A-Za-z0-9+/=]+$/.test(value);
  } catch {
    return false;
  }
}
