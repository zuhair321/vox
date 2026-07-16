import { api } from './client';

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  type: string;
  color: string | null;
  serverId: string | null;
  assignedAt?: string;
}

export const fetchBadges = (serverId?: string) =>
  api<{ badges: Badge[] }>(`/api/badges${serverId ? `?serverId=${serverId}` : ''}`);

export const fetchUserBadges = (userId: string) =>
  api<{ badges: Badge[] }>(`/api/users/${userId}/badges`);

export const createServerBadge = (
  serverId: string,
  body: { name: string; icon: string; description?: string; type?: string; color?: string },
) =>
  api<{ badge: Badge }>(`/api/servers/${serverId}/badges`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const assignBadge = (serverId: string, badgeId: string, userId: string) =>
  api(`/api/servers/${serverId}/badges/${badgeId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

export const deleteBadge = (id: string) =>
  api(`/api/badges/${id}`, { method: 'DELETE' });

export const removeUserBadge = (userId: string, badgeId: string) =>
  api(`/api/users/${userId}/badges/${badgeId}`, { method: 'DELETE' });
