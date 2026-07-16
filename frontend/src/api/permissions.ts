import { api } from './client';

export interface PermissionOverride {
  id: string;
  role: string;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canAdmin: boolean;
}

export const fetchChannelPermissions = (channelId: string) => api<PermissionOverride[]>(`/api/channels/${channelId}/permissions`);
export const createPermissionOverride = (channelId: string, override: Omit<PermissionOverride, 'id'>) =>
  api(`/api/channels/${channelId}/permissions`, {
    method: 'POST',
    body: JSON.stringify(override),
  });
export const updatePermissionOverride = (overrideId: string, override: Partial<PermissionOverride>) =>
  api(`/api/channels/permissions/${overrideId}`, {
    method: 'PATCH',
    body: JSON.stringify(override),
  });
export const deletePermissionOverride = (overrideId: string) =>
  api(`/api/channels/permissions/${overrideId}`, { method: 'DELETE' });