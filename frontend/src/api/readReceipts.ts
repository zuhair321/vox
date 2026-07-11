import { api } from './client';

export const markMessageRead = (messageId: string) =>
  api(`/api/messages/${messageId}/read`, {
    method: 'POST'
  });

export const getMessageReads = (messageId: string) =>
  api(`/api/messages/${messageId}/read`);
