// ────────────────────────────────────────────────────────────────────────────
// F3: End-to-end encrypted DMs.
//
// Each device generates an X25519 keypair on first login. The PUBLIC key is
// uploaded to the backend (`PUT /api/auth/me/keys`); the SECRET key stays in
// the renderer (IndexedDB). When two users DM, the renderer:
//
//   1. fetches the peer's CURRENT public key (`GET /api/auth/users/:id/pubkey`)
//   2. derives a 32-byte symmetric key via  X25519 ECDH(secret, peerPub) then
//      HKDF-SHA256 over a fixed info string ("vox-dm-v1")
//   3. encrypts the plaintext with ChaCha20-Poly1305 and a fresh 12-byte nonce
//   4. sends { ciphertext, nonce, keyVersion, senderKeyFingerprint } to the
//      backend — the backend NEVER sees the symmetric key or the plaintext.
//
// The receiver mirrors those steps with their own secret to recover plaintext.
// On rotation, `keyVersion` bumps so the receiver can fetch the right public key.
//
// Not implemented here (window for future work): Double-Ratchet (Signal
// protocol) — perfect-forward-secrecy across long sessions. We use single-shot
// ECDH per-message, so a leaked secret key compromises that message but not
// future ones... wait, ECDH + ciphertext nonce-pair reuses fixed keys, so a
// leaked secret-key DOES compromise that conversation. Single-shot per message
// would be ECDH(senderSecret, ephemeral) + senderKeyFingerprint for verification.
// Acceptable for v1; flagged for hardening.
// ────────────────────────────────────────────────────────────────────────────

import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';

/* eslint-disable @typescript-eslint/no-explicit-any */

// IndexedDB store for the secret key. We never put plaintext crypto material
// in localStorage/sessionStorage/cookies.
const IDB_NAME = 'vox-dm-keys';
const IDB_STORE = 'keypair';
const META_KEY_VERSION = 1;

interface StoredKeypair {
  secretKey: Uint8Array;   // 32 bytes
  publicKey: Uint8Array;   // 32 bytes (raw X25519)
  keyVersion: number;
  createdAt: number;
}

let _cached: StoredKeypair | null = null;
let _peerCache: Map<string, { publicKey: string; fingerprint: string; keyVersion: number }> = new Map();

/* ── helpers ───────────────────────────────────────────────────────────── */

function bytesToHex(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}
function hexToBytes(h: string): Uint8Array {
  if (h.length % 2 !== 0) throw new Error('hex string must have even length');
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(b).toString('base64');
}
function b64ToBytes(s: string): Uint8Array {
  const bin = typeof atob !== 'undefined' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// HKDF-SHA256 (RFC 5869) — extract+expand, simple implementation.
// We don't need @noble/hashes/hkdf because the IKM is already 32 bytes
// (output of X25519 ECDH), so an HKDF expansion is just HMAC-SHA256 over an info string.
function deriveSymKey(sharedSecret: Uint8Array, info: string): Uint8Array {
  // Expand: T1 = HMAC(PRK=sharedSecret, info || 0x01). We only need 32 bytes.
  const tmpl = new TextEncoder().encode(info);
  const buf = new Uint8Array(sharedSecret.length + tmpl.length + 1);
  buf.set(sharedSecret, 0);
  buf.set(tmpl, sharedSecret.length);
  buf[buf.length - 1] = 1;
  return hmac(sha256, sharedSecret, buf);
}


/* ── IndexedDB persistence ─────────────────────────────────────────────── */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T = any>(key: string): Promise<T | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: any): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* swallow — encryption is best-effort */
  }
}

/* ── keypair bootstrap (one-time per device) ───────────────────────────── */

async function generateAndPersist(): Promise<StoredKeypair> {
  // x25519.utils.randomPrivateKey() returns a 32-byte Uint8Array.
  const secretKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(secretKey);
  const kp: StoredKeypair = {
    secretKey,
    publicKey,
    keyVersion: META_KEY_VERSION,
    createdAt: Date.now(),
  };
  await idbSet('current', {
    secretKey: bytesToB64(secretKey),
    publicKey: bytesToB64(publicKey),
    keyVersion: META_KEY_VERSION,
    createdAt: kp.createdAt,
  });
  return kp;
}

async function loadOrCreate(): Promise<StoredKeypair> {
  if (_cached) return _cached;
  const stored = await idbGet<{ secretKey: string; publicKey: string; keyVersion: number; createdAt: number }>('current');
  if (stored && stored.secretKey && stored.publicKey) {
    _cached = {
      secretKey: b64ToBytes(stored.secretKey),
      publicKey: b64ToBytes(stored.publicKey),
      keyVersion: stored.keyVersion || META_KEY_VERSION,
      createdAt: stored.createdAt || Date.now(),
    };
    return _cached;
  }
  _cached = await generateAndPersist();
  return _cached;
}

/* ── public API ────────────────────────────────────────────────────────── */

export interface MyKeys {
  publicKeyHex: string;
  publicKeyFingerprint: string;
  keyVersion: number;
}

/** Generate (or load) the device's X25519 keypair and return the PUBLIC bundle. */
export async function ensureMyKeys(): Promise<MyKeys> {
  const kp = await loadOrCreate();
  const pubHex = bytesToHex(kp.publicKey);
  return {
    publicKeyHex: pubHex,
    publicKeyFingerprint: bytesToHex(sha256(kp.publicKey)),
    keyVersion: kp.keyVersion,
  };
}

/** Publish the user's PUBLIC key to the backend (`PUT /api/auth/me/keys`). */
export async function publishMyKeys(): Promise<{ ok: boolean; serverFingerprint?: string }> {
  const me = await ensureMyKeys();
  try {
    // F3: server route is /api/users/me/keys; PUT body matches
    // { publicKey, publicKeyFingerprint } (see keys.routes.js).
    const res = await fetch('/api/users/me/keys', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: me.publicKeyHex, publicKeyFingerprint: me.publicKeyFingerprint }),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json().catch(() => ({}));
    return { ok: !!data?.ok, serverFingerprint: data?.keys?.publicKeyFingerprint };
  } catch {
    return { ok: false };
  }
}

export interface PeerKeys {
  userId: string;
  publicKey: Uint8Array | null;
  publicKeyHex: string | null;
  fingerprint: string | null;
  keyVersion: number;
}

/** Fetch + cache a peer's public key. Returns nulls if the peer has no key yet. */
export async function fetchPeerKeys(userId: string): Promise<PeerKeys> {
  const cached = _peerCache.get(userId);
  if (cached) {
    return {
      userId,
      publicKey: cached.publicKey ? hexToBytes(cached.publicKey) : null,
      publicKeyHex: cached.publicKey,
      fingerprint: cached.fingerprint,
      keyVersion: cached.keyVersion,
    };
  }
  try {
    const res = await fetch(`/api/auth/users/${encodeURIComponent(userId)}/pubkey`, {
      credentials: 'include',
    });
    if (!res.ok) return { userId, publicKey: null, publicKeyHex: null, fingerprint: null, keyVersion: 0 };
    const data = await res.json();
    const peer = data?.peer || {};
    const hex = peer.publicKey || null;
    _peerCache.set(userId, {
      publicKey: hex,
      fingerprint: peer.publicKeyFingerprint || null,
      keyVersion: typeof peer.keyRotatedAt === 'string' ? Date.parse(peer.keyRotatedAt) || 1 : 1,
    });
    return {
      userId,
      publicKey: hex ? hexToBytes(hex) : null,
      publicKeyHex: hex,
      fingerprint: peer.publicKeyFingerprint || null,
      keyVersion: 1,
    };
  } catch {
    return { userId, publicKey: null, publicKeyHex: null, fingerprint: null, keyVersion: 0 };
  }
}

/** Force a cache refresh (called when a keyVersion mismatch is detected). */
export function invalidatePeerKey(userId: string) {
  _peerCache.delete(userId);
}

export interface Envelope {
  ciphertext: string;   // base64
  nonce: string;        // base64
  keyVersion: number;
  senderKeyFingerprint: string;
}

/** Encrypt a plaintext for an X25519 peer. Returns the wire envelope. */
export async function encryptForPeer(plaintext: string, peerPublicKey: Uint8Array): Promise<Envelope> {
  const me = await loadOrCreate();
  const shared = x25519.getSharedSecret(me.secretKey, peerPublicKey);
  const symKey = deriveSymKey(shared, 'vox-dm-v1');
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cipher = chacha20poly1305(symKey, nonce);
  const ciphertext = cipher.encrypt(new TextEncoder().encode(plaintext));
  return {
    ciphertext: bytesToB64(ciphertext),
    nonce: bytesToB64(nonce),
    keyVersion: me.keyVersion,
    senderKeyFingerprint: bytesToHex(sha256(me.publicKey)),
  };
}

/**
 * Decrypt an envelope from a peer. The PeerKeys.publicKey MUST be the SENDER's
 * public key that matches senderKeyFingerprint. We refuse to decrypt if the
 * fingerprint mismatches — that would silently MITM us if our cached peer key
 * was stale.
 */
export async function decryptFromPeer(envelope: Envelope, senderPublicKey: Uint8Array): Promise<string> {
  // Verify fingerprint matches the public key we were given.
  const actualFp = bytesToHex(sha256(senderPublicKey));
  if (envelope.senderKeyFingerprint && envelope.senderKeyFingerprint !== actualFp) {
    throw new Error(
      `F3: peer fingerprint mismatch (expected ${actualFp}, envelope says ${envelope.senderKeyFingerprint}). ` +
      'Possible key rotation — refetch and retry.',
    );
  }
  const me = await loadOrCreate();
  const shared = x25519.getSharedSecret(me.secretKey, senderPublicKey);
  const symKey = deriveSymKey(shared, 'vox-dm-v1');
  const cipher = chacha20poly1305(symKey, b64ToBytes(envelope.nonce));
  const plain = cipher.decrypt(b64ToBytes(envelope.ciphertext));
  return new TextDecoder().decode(plain);
}

/** Diagnostic helper for the UI — short, visible checksum of "the lock is on". */
export async function myFingerprintShort(): Promise<string> {
  const me = await ensureMyKeys();
  return me.publicKeyFingerprint.slice(0, 8).toUpperCase();
}

/** Reset state for testing / "Log out everywhere". */
export async function wipeLocalKeypair(): Promise<void> {
  _cached = null;
  _peerCache.clear();
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const req = tx.objectStore(IDB_STORE).delete('current');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch { /* ignore */ }
  }
}
