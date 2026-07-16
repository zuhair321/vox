import { api } from './client';

export interface BlockInfo {
  id: string;
  userId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: string;
}

export const fetchBlocks = () => api('/api/blocks');
export const blockUser = (userId: string, reason?: string) =>
  api('/api/blocks', {
    method: 'POST',
    body: JSON.stringify({ userId, reason }),
  });
export const unblockUser = (userId: string) =>
  api(`/api/blocks/${userId}`, { method: 'DELETE' });
export const checkBlockStatus = (userId: string) =>
  api(`/api/blocks/check/${userId}`);