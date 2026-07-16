import { api } from './client';

export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchUserNotes = () => api<Note[]>('/api/notes');
export const createNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) =>
  api('/api/notes', {
    method: 'POST',
    body: JSON.stringify(note),
  });
export const updateNote = (noteId: string, note: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>) =>
  api(`/api/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(note),
  });
export const deleteNote = (noteId: string) =>
  api(`/api/notes/${noteId}`, { method: 'DELETE' });