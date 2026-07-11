// Vox Mobile — Messages API

import { api } from './client';
import type { Message } from '../types';

export async function fetchMessages(channelId: string, before?: string, limit = 50): Promise<Message[]> {
  const query = new URLSearchParams();
  if (before) query.set('before', before);
  query.set('limit', String(limit));
  return api(`/api/channels/${channelId}/messages?${query.toString()}`);
}

export async function fetchPinnedMessages(channelId: string): Promise<Message[]> {
  return api(`/api/channels/${channelId}/messages/pinned`);
}

export async function sendMessage(channelId: string, body: string, parentId?: string, attachments?: any[]): Promise<Message> {
  return api(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, parentId, attachments }),
  });
}

export async function editMessage(messageId: string, body: string): Promise<Message> {
  return api(`/api/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  return api(`/api/messages/${messageId}`, { method: 'DELETE' });
}

export async function reactToMessage(messageId: string, emoji: string): Promise<void> {
  return api(`/api/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

export async function pinMessage(messageId: string): Promise<void> {
  return api(`/api/messages/${messageId}/pin`, { method: 'POST' });
}

export async function searchMessages(params: { q: string; channelId?: string; serverId?: string; limit?: number }): Promise<Message[]> {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.channelId) query.set('channelId', params.channelId);
  if (params.serverId) query.set('serverId', params.serverId);
  if (params.limit) query.set('limit', String(params.limit));
  return api(`/api/messages/search?${query.toString()}`);
}
