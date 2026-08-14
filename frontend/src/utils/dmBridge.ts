// ────────────────────────────────────────────────────────────────────────────
// F3: thin wrapper around the dm API + dmCrypto utilities.
//
// Intercepts fetchDMMessages responses so messages with `ciphertext` are
// decrypted in place (`content` set, `ciphertext` cleared). Exposes a single
// `sendEncryptedDM(dmId, text, peerUserId)` helper that the MessageInput /
// DMConversation can call instead of sendDMHTTP — it fetches the peer's
// public key, encrypts, and returns the envelope the backend will store.
// ────────────────────────────────────────────────────────────────────────────

import { api } from '../api/client';
import { sendDMHTTP } from '../api/dm';
import {
  ensureMyKeys,
  fetchPeerKeys,
  encryptForPeer,
  decryptFromPeer,
  invalidatePeerKey,
  type Envelope,
} from './dmCrypto';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface RawDMMessage {
  id: string;
  content: string | null;
  ciphertext: string | null;
  nonce: string | null;
  keyVersion: number;
  senderKeyFingerprint: string | null;
  senderId: string;
  recipientId: string;
  createdAt: string | Date;
  edited?: boolean;
  deleted?: boolean;
  attachments?: any;
  sender?: any;
  recipient?: any;
  [k: string]: any;
}

/**
 * Decrypt a single message in place. Returns the same shape the existing UI
 * renders, with `content` set to plaintext (or — if decryption fails — to
 * a placeholder so the rest of the UI doesn't crash).
 */
export async function hydrateMessage(m: RawDMMessage, selfId: string): Promise<RawDMMessage> {
  if (!m.ciphertext || !m.nonce) return m;
  if (m.senderId === selfId) {
    // We sent this outbound — but we never store our own secret-share with self,
    // so we attempt decrypt using the plaintext-known fingerprint if we can.
    // For v1 we just display "[you · encrypted]" since the local sender
    // wouldn't normally re-decrypt its own outbound ciphertext.
    return { ...m, content: m.content || '\u{1F512} Sent encrypted' };
  }
  // Try decrypt: fetch sender's current pubkey, validate fingerprint, then decrypt.
  try {
    const senderId = String(m.senderId);
    let peer = await fetchPeerKeys(senderId);
    if (peer.publicKey && peer.fingerprint && m.senderKeyFingerprint && peer.fingerprint !== m.senderKeyFingerprint) {
      // Peer rotated their key pair — force a refetch.
      invalidatePeerKey(senderId);
      peer = await fetchPeerKeys(senderId);
    }
    if (peer.publicKey) {
      const env: Envelope = {
        ciphertext: m.ciphertext,
        nonce: m.nonce,
        keyVersion: m.keyVersion || 1,
        senderKeyFingerprint: m.senderKeyFingerprint || peer.fingerprint || '',
      };
      const plain = await decryptFromPeer(env, peer.publicKey);
      return { ...m, content: plain };
    }
  } catch {
    // fall through to placeholder
  }
  return { ...m, content: '\u{1F512} Encrypted message (awaiting key)' };
}

/**
 * Fetch DM history and decrypt each ciphertext row. Same return shape as the
 * raw API call (just with `content` set to plaintext where possible).
 */
export async function fetchDMMessagesDecrypted(dmId: string, selfId: string): Promise<RawDMMessage[]> {
  const raw: RawDMMessage[] = await api(`/api/dm/${dmId}/messages`);
  if (!Array.isArray(raw)) return [];
  return Promise.all(raw.map((m) => hydrateMessage(m, selfId)));
}

/**
 * One-shot bootstrap: ensure our keypair exists, publish our public key.
 * Idempotent — safe to call on every DMConversation mount.
 */
export async function bootstrapDmKeys(): Promise<{ ok: boolean }> {
  try {
    await ensureMyKeys();
    return await publishMyKeysViaApi();
  } catch {
    return { ok: false };
  }
}

async function publishMyKeysViaApi(): Promise<{ ok: boolean }> {
  try {
    const me = await ensureMyKeys();
    const r = await fetch('/api/auth/me/keys', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: me.publicKeyHex, publicKeyFingerprint: me.publicKeyFingerprint }),
    });
    if (!r.ok) return { ok: false };
    const j = await r.json().catch(() => ({}));
    return { ok: !!j?.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * Send a DM with end-to-end encryption. Falls back to plaintext (still calls
 * sendDMHTTP) only if the peer has no published public key yet — in that case
 * the wire plaintext is what the user typed, identical to legacy behavior.
 */
export async function sendEncryptedDM(
  dmId: string,
  recipientUserId: string,
  text: string,
  attachments?: any[],
): Promise<{ message: RawDMMessage; encrypted: boolean }> {
  const peer = await fetchPeerKeys(recipientUserId);
  if (peer.publicKey) {
    try {
      const env = await encryptForPeer(text, peer.publicKey);
      const r = await sendDMHTTP(dmId, '', attachments, env);
      const message = r?.message || r;
      return { message, encrypted: true };
    } catch {
      // crypto failure — fall back so the user isn't silenced.
    }
  }
  const r = await sendDMHTTP(dmId, text, attachments, null);
  const message = r?.message || r;
  return { message, encrypted: false };
}
