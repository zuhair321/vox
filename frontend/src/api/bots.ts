// Bots management.
import { api } from './client';

export async function listBots(serverId: string): Promise<any[]> {
  const j = await api<any>(`/api/servers/${encodeURIComponent(serverId)}/bots`, { method: 'GET' });
  return (j && j.bots) || [];
}

export async function addBot(serverId: string, payload: { name: string; displayName?: string; color?: string }) {
  return api<any>(`/api/servers/${encodeURIComponent(serverId)}/bots`, {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export async function removeBot(serverId: string, botId: string) {
  return api<any>(`/api/servers/${encodeURIComponent(serverId)}/bots/${encodeURIComponent(botId)}`, {
    method: 'DELETE',
  });
}
