import { api } from './client';

export interface Sound {
  id: string;
  name: string;
  url: string;
  volume: number;
  serverId: string | null;
}

export const fetchSounds = (serverId?: string) =>
  api<{ sounds: Sound[] }>(`/api/sounds${serverId ? `?serverId=${serverId}` : ''}`);

export const createServerSound = (serverId: string, name: string, url: string, volume = 1.0) =>
  api<{ sound: Sound }>(`/api/servers/${serverId}/sounds`, {
    method: 'POST',
    body: JSON.stringify({ name, url, volume }),
  });

export const deleteSound = (id: string) =>
  api(`/api/sounds/${id}`, { method: 'DELETE' });
