// Vox Mobile — DM API

import { api } from './client';
import type { DMMessage } from '../types';

export async function fetchDMMessages(dmId: string): Promise<DMMessage[]> {
  return api(`/api/dm/${dmId}/messages`);
}

export async function sendDM(dmId: string, content: string, attachments?: any[]): Promise<DMMessage> {
  return api(`/api/dm/${dmId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, attachments }),
  });
}

export async function editDM(dmId: string, messageId: string, content: string): Promise<DMMessage> {
  return api(`/api/dm/${dmId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export async function deleteDM(dmId: string, messageId: string): Promise<void> {
  return api(`/api/dm/${dmId}/messages/${messageId}`, { method: 'DELETE' });
}
