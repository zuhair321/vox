import { api } from './client';

export interface ModAction {
  id: string;
  actionType: string;
  targetId: string;
  targetType: string;
  moderatorId: string;
  reason?: string;
  createdAt: string;
}

export const fetchModActions = (serverId: string) => api<ModAction[]>(`/api/mod/${serverId}/actions`);
export const addModAction = (serverId: string, action: Omit<ModAction, 'id' | 'createdAt'>) =>
  api(`/api/mod/${serverId}/actions`, {
    method: 'POST',
    body: JSON.stringify(action),
  });