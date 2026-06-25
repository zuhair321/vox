// Symmetric encryption for secrets stored at rest (currently: the TOTP
// secret used by 2FA). Uses Node's built-in crypto — AES-256-GCM.
//
// Why: we never want to store the raw TOTP secret in the DB, even though
// it would technically "work". An attacker with a DB dump still can't
// reconstruct codes without the encryption key.
import crypto from 'node:crypto';
import { env } from './env.js';

const ALGO = 'aes-256-gcm';

function getKey() {
  // The key is a 64-char hex string (32 bytes → AES-256).
  const raw = Buffer.from(env.twoFactor.encryptionKey, 'hex');
  if (raw.length !== 32) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be 32 bytes (64 hex chars).');
  }
  return raw;
}

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12); // 96-bit IV is standard for GCM
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack iv + tag + ciphertext into one string for easy DB storage.
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(packed) {
  const buf = Buffer.from(packed, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
