import { api } from './client';

export interface Webhook {
  id: string;
  name: string;
  token: string;
  channelId: string;
  createdAt: string;
}

export const fetchServerWebhooks = (serverId: string) => api<Webhook[]>(`/api/servers/${serverId}/webhooks`);
export const createServerWebhook = (serverId: string, name: string, channelId: string) =>
  api(`/api/servers/${serverId}/webhooks`, {
    method: 'POST',
    body: JSON.stringify({ name, channelId }),
  });
export const updateServerWebhook = (webhookId: string, data: Partial<{ name: string; channelId: string }>) =>
  api(`/api/servers/webhooks/${webhookId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const deleteServerWebhook = (webhookId: string) =>
  api(`/api/servers/webhooks/${webhookId}`, { method: 'DELETE' });
export const sendWebhook = (token: string, content: string, username?: string, avatarUrl?: string) =>
  api(`/api/webhooks/${token}`, {
    method: 'POST',
    body: JSON.stringify({ content, username, avatarUrl }),
  });