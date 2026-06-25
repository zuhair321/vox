import { api } from './client';

export interface SearchParams {
  q: string;
  channelId?: string;
  serverId?: string;
  userId?: string;
  hasLink?: boolean;
  before?: string;
  after?: string;
  limit?: number;
}

export interface SearchResultMessage {
  id: string;
  channelId: string;
  userId?: string | null;
  author?: any;
  body: string;
  createdAt: string;
  channel?: { id: string; name: string; server?: { id: string; name: string } };
}

export const searchMessages = (params: SearchParams) => {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.channelId) sp.set('channelId', params.channelId);
  if (params.serverId) sp.set('serverId', params.serverId);
  if (params.userId) sp.set('userId', params.userId);
  if (params.hasLink) sp.set('hasLink', '1');
  if (params.before) sp.set('before', params.before);
  if (params.after) sp.set('after', params.after);
  if (params.limit) sp.set('limit', String(params.limit));
  return api(`/api/search?${sp.toString()}`);
};
