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
