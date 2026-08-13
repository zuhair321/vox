// Per-channel notification preference (3-way picker).
import { api } from './client';

export async function putNotificationLevel(opts: { serverId?: string; channelId?: string; level: 'ALL'|'MENTIONS'|'NOTHING'|'DEFAULT' }) {
  return api<any>('/api/users/me/notifications/level', {
    method: 'PUT',
    body: JSON.stringify(opts),
  });
}

export async function getNotifications() {
  return api<any>('/api/users/me/notifications', { method: 'GET' });
}
