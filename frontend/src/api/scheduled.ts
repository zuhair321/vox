import { api } from './client';

export interface ScheduledMessage {
  id: string;
  channelId: string;
  channel?: { id: string; name: string; serverId: string | null };
  body: string;
  attachments: any | null;
  scheduledAt: string;
  sent: boolean;
  createdAt: string;
}

export const listScheduled = () => api<{ scheduled: ScheduledMessage[] }>('/api/messages/scheduled');
export const scheduleMessage = (data: { channelId: string; body: string; scheduledAt: string; attachments?: any }) =>
  api<{ scheduled: ScheduledMessage }>('/api/messages/scheduled', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const cancelScheduled = (id: string) =>
  api(`/api/messages/scheduled/${id}`, { method: 'DELETE' });
export const listChannelScheduled = (channelId: string) =>
  api<{ scheduled: ScheduledMessage[] }>(`/api/channels/${channelId}/scheduled`);
