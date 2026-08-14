import { api } from './client';
import type { Attachment } from '../types';

/**
 * Build the canonical DM channel id for two users. Matches the backend
 * convention (dm.js / handlers.js): the two participant ids sorted ascending
 * and joined by '_'. Sorting makes the id identical for both parties, so
 * either side derives the same conversation key.
 */
export function buildDmId(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join('_');
}

export const fetchDMMessages = (dmId: string) => api(`/api/dm/${dmId}/messages`);

export interface DMEnvelope {
  ciphertext: string;
  nonce: string;
  keyVersion: number;
  senderKeyFingerprint: string;
}

export const sendDMHTTP = (
  dmId: string,
  content: string,
  attachments?: Attachment[],
  envelope?: DMEnvelope | null,
) =>
  api(`/api/dm/${dmId}/messages`, {
    method: 'POST',
    // F3: if the envelope is present, the SERVER ONLY sees ciphertext + nonce;
    // content is left blank so the wire never carries plaintext.
    body: JSON.stringify(
      envelope
        ? {
            ciphertext: envelope.ciphertext,
            nonce: envelope.nonce,
            keyVersion: envelope.keyVersion,
            senderKeyFingerprint: envelope.senderKeyFingerprint,
            attachments,
          }
        : { content, attachments },
    ),
  });

export const editDM = (dmId: string, messageId: string, content: string) =>
  api(`/api/dm/${dmId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content })
  });

export const deleteDM = (dmId: string, messageId: string) =>
  api(`/api/dm/${dmId}/messages/${messageId}`, {
    method: 'DELETE'
  });
