// Custom emoji upload + listing.
import { api } from './client';

export async function fetchServerEmojis(serverId: string): Promise<any[]> {
  const j = await api<any>(`/api/servers/${encodeURIComponent(serverId || '')}/emojis`, { method: 'GET' });
  return (j && j.emojis) || [];
}

export async function uploadCustomEmoji(serverId: string, name: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('name', name);
  const res = await fetch(`/api/servers/${encodeURIComponent(serverId)}/emojis/upload`, {
    method: 'POST', credentials: 'include', body: fd,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || ('Upload failed (' + res.status + ')'));
  }
  return res.json();
}

export async function deleteServerEmoji(serverId: string, emojiId: string) {
  return api<any>(`/api/servers/${encodeURIComponent(serverId)}/emojis/${encodeURIComponent(emojiId)}`, { method: 'DELETE' });
}
