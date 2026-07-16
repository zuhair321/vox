import { api } from './client';

export interface Sticker {
  id: string;
  name: string;
  url: string;
  type: string;
  serverId: string | null;
}

export const fetchStickers = (serverId?: string) =>
  api<{ stickers: Sticker[] }>(`/api/stickers${serverId ? `?serverId=${serverId}` : ''}`);

export const createServerSticker = (serverId: string, name: string, url: string, type = 'PNG') =>
  api<{ sticker: Sticker }>(`/api/servers/${serverId}/stickers`, {
    method: 'POST',
    body: JSON.stringify({ name, url, type }),
  });

export const deleteSticker = (id: string) =>
  api(`/api/stickers/${id}`, { method: 'DELETE' });
