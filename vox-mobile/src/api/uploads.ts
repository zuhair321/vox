// Vox Mobile — File upload API

import { API_BASE } from './client';
import { getAccessToken } from '../utils/storage';

export async function uploadFile(
  kind: 'avatar' | 'banner' | 'chat' | 'server-icon' | 'server-banner',
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<{ url: string }> {
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await fetch(`${API_BASE}/api/upload/${kind}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type — let the browser set multipart boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }

  return res.json();
}
