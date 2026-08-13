import { api } from './client';

export interface UserNote {
  id: string;
  userId: string;
  targetId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  target?: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

export const fetchMyNotes = () => api<{ notes: UserNote[] }>('/api/users/me/notes');
export const getUserNote = (targetId: string) => api<{ note: { content: string; updatedAt: string } | null }>(`/api/users/${targetId}/notes`);
export const setUserNote = (targetId: string, text: string) =>
  api(`/api/users/${targetId}/notes`, {
    method: 'PUT',
    body: JSON.stringify({ text }),
  });
export const deleteUserNote = (targetId: string) =>
  api(`/api/users/${targetId}/notes`, { method: 'DELETE' });
