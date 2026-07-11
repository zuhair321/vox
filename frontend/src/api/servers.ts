import { api } from './client';

export const fetchServers = () => api('/api/servers');

export const createServer = (name: string, description?: string) =>
  api('/api/servers', {
    method: 'POST',
    body: JSON.stringify({ name, description })
  });

export const createChannel = (serverId: string, name: string, type: 'TEXT' | 'VOICE') =>
  api(`/api/servers/${serverId}/channels`, {
    method: 'POST',
    body: JSON.stringify({ name, type })
  });

export const updateServer = (
  serverId: string,
  data: Partial<{ name: string; description: string; icon: string; banner: string; category: string; isPublic: boolean }>,
) =>
  api(`/api/servers/${serverId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const addServerMember = (serverId: string, username: string) =>
  api(`/api/servers/${serverId}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export interface Role {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

export interface Ban {
  id: string;
  userId: string;
  user: { id: string; username: string; avatarUrl?: string };
  reason?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  channels: { id: string; name: string; type: string }[];
}

export interface Webhook {
  id: string;
  name: string;
  token: string;
  channelId: string;
  createdAt: string;
}

export interface Emoji {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  user: { id: string; username: string };
  targetId?: string;
  targetType?: string;
  changes?: Record<string, any>;
  createdAt: string;
}

export const fetchServerRoles = (serverId: string) => api(`/api/servers/${serverId}/roles`);
export const createServerRole = (serverId: string, name: string, color: string) =>
  api(`/api/servers/${serverId}/roles`, { method: 'POST', body: JSON.stringify({ name, color }) });
export const deleteServerRole = (serverId: string, roleId: string) =>
  api(`/api/servers/${serverId}/roles/${roleId}`, { method: 'DELETE' });
export const assignRole = (serverId: string, userId: string, roleId: string) =>
  api(`/api/servers/${serverId}/members/${userId}/roles`, { method: 'POST', body: JSON.stringify({ roleId }) });
export const removeRoleFromMember = (serverId: string, userId: string, roleId: string) =>
  api(`/api/servers/${serverId}/members/${userId}/roles/${roleId}`, { method: 'DELETE' });

export const fetchServerBans = (serverId: string) => api(`/api/servers/${serverId}/bans`);
export const unbanUser = (serverId: string, userId: string) =>
  api(`/api/servers/${serverId}/bans/${userId}`, { method: 'DELETE' });

export const fetchServerCategories = (serverId: string) => api(`/api/servers/${serverId}/categories`);
export const createServerCategory = (serverId: string, name: string) =>
  api(`/api/servers/${serverId}/categories`, { method: 'POST', body: JSON.stringify({ name }) });
export const deleteServerCategory = (serverId: string, categoryId: string) =>
  api(`/api/servers/${serverId}/categories/${categoryId}`, { method: 'DELETE' });

export const fetchServerWebhooks = (serverId: string) => api(`/api/servers/${serverId}/webhooks`);
export const createServerWebhook = (serverId: string, name: string, channelId: string) =>
  api(`/api/servers/${serverId}/webhooks`, { method: 'POST', body: JSON.stringify({ name, channelId }) });
export const deleteServerWebhook = (serverId: string, webhookId: string) =>
  api(`/api/servers/${serverId}/webhooks/${webhookId}`, { method: 'DELETE' });

export const fetchServerEmojis = (serverId: string) => api(`/api/servers/${serverId}/emojis`);
export const createServerEmoji = (serverId: string, name: string, url: string) =>
  api(`/api/servers/${serverId}/emojis`, { method: 'POST', body: JSON.stringify({ name, url }) });
export const deleteServerEmoji = (serverId: string, emojiId: string) =>
  api(`/api/servers/${serverId}/emojis/${emojiId}`, { method: 'DELETE' });

export const fetchServerAuditLog = (serverId: string) => api(`/api/servers/${serverId}/audit`);
