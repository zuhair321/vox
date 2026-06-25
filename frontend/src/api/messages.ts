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
