import { API_BASE, getToken } from './client';
import type { Attachment, AttachmentKind } from '../types';

export type UploadKind = 'avatar' | 'banner' | 'chat';

export interface ChatUploadResponse {
  url: string;
  kind: AttachmentKind;
  name: string;
  size: number;
  mime: string;
}

export async function uploadMedia(kind: UploadKind, file: File) {
  const token = getToken();
  if (!token) {
    throw new Error('Please log in before uploading media.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/upload/${kind}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Upload failed.');
  }

  return data;
}

export const uploadProfileImage = uploadMedia;

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
