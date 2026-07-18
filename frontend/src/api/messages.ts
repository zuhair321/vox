import { api } from './client';
import type { Attachment } from '../types';

export const fetchMessages = (channelId: string, before?: string) =>
  api(`/api/channels/${channelId}/messages${before ? '?before=' + before : ''}`);

export const sendMessageHTTP = (
  channelId: string,
  content: string,
  parentId?: string,
  attachments?: Attachment[],
) =>
  api(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, parentId, channelId, attachments })
  });

// Read receipts
export interface MessageReadUser {
  userId: string;
  username: string;
  avatar: string | null;
  status: string;
  readAt: string;
}

export const markMessageRead = (messageId: string) =>
  api(`/api/messages/${messageId}/read`, { method: 'POST' });

export const getMessageReads = (messageId: string) =>
  api(`/api/messages/${messageId}/read`) as Promise<{ reads: MessageReadUser[] }>;
