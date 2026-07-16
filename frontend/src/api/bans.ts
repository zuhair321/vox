import { api } from './client';

export interface BanInfo {
  id: string;
  userId: string;
  user: { id: string; username: string; avatarUrl?: string };
  reason?: string;
  createdAt: string;
  expiresAt?: string;
}

export const fetchServerBans = (serverId: string) => api(`/api/servers/${serverId}/bans`);
export const banUser = (serverId: string, userId: string, reason?: string, expiresAt?: string) =>
  api(`/api/servers/${serverId}/bans`, {
    method: 'POST',
    body: JSON.stringify({ userId, reason, expiresAt }),
  });
export const unbanUser = (serverId: string, userId: string) =>
  api(`/api/servers/${serverId}/bans/${userId}`, { method: 'DELETE' });