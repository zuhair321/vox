import { api } from './client';

export interface DiscoverServer {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  banner: string | null;
  category: string;
  memberCount: number;
  online: number;
  joined: boolean;
}

export const discoverServers = (category = 'ALL', search = '', limit = 20) => {
  const sp = new URLSearchParams({ category, limit: String(limit) });
  if (search) sp.set('search', search);
  return api(`/api/servers/discover?${sp.toString()}`) as Promise<{ servers: DiscoverServer[] }>;
};

export const joinServerById = (serverId: string) =>
  api(`/api/servers/${serverId}/join`, { method: 'POST' });

export const leaveServer = (serverId: string) =>
  api(`/api/servers/${serverId}/leave`, { method: 'POST' });
