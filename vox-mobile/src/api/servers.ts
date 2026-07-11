// Vox Mobile — Servers API

import { api } from './client';
import type { Server, Channel, ServerMember } from '../types';

export async function fetchServers(): Promise<Server[]> {
  return api('/api/servers');
}

export async function createServer(data: { name: string; description?: string; icon?: string; isPublic?: boolean }): Promise<Server> {
  return api('/api/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateServer(id: string, data: Partial<Pick<Server, 'name' | 'description' | 'icon' | 'banner' | 'category' | 'isPublic'>>): Promise<Server> {
  return api(`/api/servers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteServer(id: string): Promise<void> {
  return api(`/api/servers/${id}`, { method: 'DELETE' });
}

export async function discoverServers(params?: { category?: string; search?: string; limit?: number }): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.limit) query.set('limit', String(params.limit));
  return api(`/api/servers/discover?${query.toString()}`);
}

export async function joinServer(id: string): Promise<void> {
  return api(`/api/servers/${id}/join`, { method: 'POST' });
}

export async function leaveServer(id: string): Promise<void> {
  return api(`/api/servers/${id}/leave`, { method: 'POST' });
}

export async function createChannel(serverId: string, data: { name: string; type?: 'TEXT' | 'VOICE'; topic?: string }): Promise<Channel> {
  return api(`/api/servers/${serverId}/channels`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateChannel(serverId: string, channelId: string, data: Partial<Channel>): Promise<Channel> {
  return api(`/api/servers/${serverId}/channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
  return api(`/api/servers/${serverId}/channels/${channelId}`, { method: 'DELETE' });
}

export async function addMember(serverId: string, username: string): Promise<ServerMember> {
  return api(`/api/servers/${serverId}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function kickMember(serverId: string, userId: string): Promise<void> {
  return api(`/api/servers/${serverId}/kick/${userId}`, { method: 'POST' });
}

export async function banUser(serverId: string, userId: string, reason?: string): Promise<void> {
  return api(`/api/servers/${serverId}/bans`, {
    method: 'POST',
    body: JSON.stringify({ userId, reason }),
  });
}

export async function unbanUser(serverId: string, userId: string): Promise<void> {
  return api(`/api/servers/${serverId}/bans/${userId}`, { method: 'DELETE' });
}

export async function createInvite(serverId: string, data?: { expiresIn?: string; maxUses?: number }): Promise<{ code: string }> {
  return api(`/api/servers/${serverId}/invites`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function resolveInvite(code: string): Promise<any> {
  return api(`/api/invites/${code}`, { skipAuth: true });
}

export async function joinByInvite(code: string): Promise<void> {
  return api(`/api/invites/${code}/join`, { method: 'POST' });
}

export interface Webhook {
  id: string;
  name: string;
  channelId: string;
  url: string | null;
  token: string;
  createdAt: string;
}

export async function fetchWebhooks(serverId: string): Promise<{ webhooks: Webhook[] }> {
  return api(`/api/servers/${serverId}/webhooks`);
}

export async function createWebhook(serverId: string, data: { name: string; channelId: string; url?: string }): Promise<{ webhook: Webhook }> {
  return api(`/api/servers/${serverId}/webhooks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWebhook(serverId: string, webhookId: string, data: { name?: string; url?: string }): Promise<{ webhook: Webhook }> {
  return api(`/api/servers/${serverId}/webhooks/${webhookId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteWebhook(serverId: string, webhookId: string): Promise<{ deleted: boolean }> {
  return api(`/api/servers/${serverId}/webhooks/${webhookId}`, { method: 'DELETE' });
}

export interface InsightsData {
  period: string;
  totalMembers: number;
  totalMessages: number;
  periodMessages: number;
  activeMembers: number;
  newJoins: number;
  channelActivity: { channelId: string; name: string; count: number }[];
  topMembers: { userId: string; username: string; count: number }[];
}

export async function fetchInsights(serverId: string, period: '7d' | '30d' | '90d' = '7d'): Promise<InsightsData> {
  return api(`/api/servers/${serverId}/insights?period=${period}`);
}
