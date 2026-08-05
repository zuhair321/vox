import { API_BASE, tryRefresh } from './client';
import type { Attachment, AttachmentKind } from '../types';

export type UploadKind = 'avatar' | 'banner' | 'chat' | 'server-icon' | 'server-banner' | 'sound';

export interface ChatUploadResponse {
  url: string;
  kind: AttachmentKind;
  name: string;
  size: number;
  mime: string;
}

export async function uploadMedia(kind: UploadKind, file: File, extraFields?: Record<string, string>) {
  // Upload responses are open-shaped JSON; callers cast to the shape they need.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped upload response
  async function attempt(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/api/upload/${kind}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || 'Upload failed.');
    }
    return data;
  }

  const formData = new FormData();
  formData.append('file', file);
  Object.entries(extraFields || {}).forEach(([key, value]) => formData.append(key, value));

  try {
    return await attempt(formData);
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('Authentication required')) {
      try {
        // Go through the shared deduped refresh (api/client.ts) so this can't
        // race another in-flight refresh and invalidate the session.
        const refreshed = await tryRefresh();
        if (!refreshed) throw new Error('Session expired. Please log in again.');
        const retryData = new FormData();
        retryData.append('file', file);
        Object.entries(extraFields || {}).forEach(([key, value]) => retryData.append(key, value));
        return await attempt(retryData);
      } catch {
        throw new Error('Session expired. Please log in again.');
      }
    }
    throw err;
  }
}

export const uploadProfileImage = uploadMedia;

export const uploadServerIcon = (serverId: string, file: File) =>
  uploadMedia('server-icon', file, { serverId });

export const uploadServerBanner = (serverId: string, file: File) =>
  uploadMedia('server-banner', file, { serverId });

// Upload a chat attachment (image/video/file). Returns the Attachment shape the
// stores and renderer expect, ready to attach to an outgoing message.
export async function uploadChatAttachment(file: File): Promise<Attachment> {
  const data = await uploadMedia('chat', file) as ChatUploadResponse;
  return {
    url: data.url,
    kind: data.kind,
    name: data.name,
    size: data.size,
    mime: data.mime,
  };
}

export interface AssetUploadResponse { url: string; kind: string; name: string; size: number; mime: string; }

export const uploadSound = (file: File) => uploadMedia('sound', file) as Promise<AssetUploadResponse>;
