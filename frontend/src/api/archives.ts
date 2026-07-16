import { api } from './client';

export interface ArchiveConfig {
  enabled: boolean;
  daysToKeep: number;
  lastArchivedAt: string | null;
}

export const getArchiveConfig = (channelId: string) =>
  api<{ config: ArchiveConfig }>(`/api/channels/${channelId}/archive`);
export const setArchiveConfig = (channelId: string, data: { enabled?: boolean; daysToKeep?: number }) =>
  api<{ config: ArchiveConfig }>(`/api/channels/${channelId}/archive`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
export const getArchivedMessages = (channelId: string, limit = 100) =>
  api<{ messages: any[]; cutoff: string }>(`/api/channels/${channelId}/archive/messages?limit=${limit}`);
