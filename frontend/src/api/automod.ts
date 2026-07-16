import { api } from './client';

export interface AutomodConfig {
  id: string;
  serverId: string;
  filterWords: boolean;
  filterLinks: boolean;
  filterSpam: boolean;
  maxStrikes: number;
  strikeTimeout: number;
}

export interface Strike {
  id: string;
  serverId: string;
  userId: string;
  issuedBy: string;
  reason: string;
  auto: boolean;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export const fetchAutomodConfig = (serverId: string) =>
  api<{ automod: AutomodConfig | null }>(`/api/servers/${serverId}/automod`);

export const updateAutomodConfig = (serverId: string, settings: Partial<Omit<AutomodConfig, 'id' | 'serverId'>>) =>
  api<{ automod: AutomodConfig }>(`/api/servers/${serverId}/automod/settings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });

export const fetchUserStrikes = (serverId: string, userId: string) =>
  api<{ strikes: Strike[]; activeCount: number }>(`/api/servers/${serverId}/strikes/${userId}`);

export const issueStrike = (serverId: string, userId: string, reason: string) =>
  api<{ strike: Strike; strikeCount: number; timedOut: boolean }>(`/api/servers/${serverId}/strikes/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const removeStrike = (serverId: string, strikeId: string) =>
  api(`/api/servers/${serverId}/strikes/${strikeId}`, { method: 'DELETE' });
