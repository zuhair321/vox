import { api } from './client';
import type { Attachment } from '../types';

export const fetchDMMessages = (dmId: string) => api(`/api/dm/${dmId}/messages`);

export const sendDMHTTP = (dmId: string, content: string, attachments?: Attachment[]) =>
  api(`/api/dm/${dmId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, attachments })
  });
