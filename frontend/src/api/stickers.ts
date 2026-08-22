// ═══════════════════════════════════════════════════════════════
// VOX — Sticker API
// ═══════════════════════════════════════════════════════════════
import { API_BASE } from './client';

async function api(method: string, path: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Sticker {
  id: string;
  name: string;
  tags: string;
  assetUrl: string;
  type: string;
  available: boolean;
  serverId?: string;
  creatorId: string;
  createdAt: string;
  usageCount: number;
}

export async function getGlobalStickers(): Promise<{ stickers: Sticker[] }> {
  return api('GET', '/api/stickers/global');
}

export async function getServerStickers(serverId: string): Promise<{ stickers: Sticker[] }> {
  return api('GET', `/api/servers/${serverId}/stickers`);
}

export async function createSticker(serverId: string, name: string, tags: string, assetUrl: string, type?: string): Promise<{ sticker: Sticker }> {
  return api('POST', `/api/servers/${serverId}/stickers`, { name, tags, assetUrl, type });
}

export async function deleteSticker(id: string): Promise<{ deleted: boolean }> {
  return api('DELETE', `/api/stickers/${id}`);
}

export async function searchStickers(query: string, serverId?: string): Promise<{ stickers: Sticker[] }> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (serverId) params.set('serverId', serverId);
  return api('GET', `/api/stickers/search?${params}`);
}
