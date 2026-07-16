import { api } from './client';

export interface Emoji {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export const fetchServerEmojis = (serverId: string) => api<Emoji[]>(`/api/servers/${serverId}/emojis`);
export const createServerEmoji = (serverId: string, name: string, url: string) =>
  api(`/api/servers/${serverId}/emojis`, {
    method: 'POST',
    body: JSON.stringify({ name, url }),
  });
export const deleteServerEmoji = (serverId: string, emojiId: string) =>
  api(`/api/servers/${serverId}/emojis/${emojiId}`, { method: 'DELETE' });