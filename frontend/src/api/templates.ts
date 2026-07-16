import { api } from './client';

export interface ServerTemplate {
  id: string;
  name: string;
  description: string | null;
  uses: number;
  creator?: { id: string; username: string; displayName: string; avatarUrl: string | null };
  server?: { name: string; icon: string | null };
  channelCount: number;
  roleCount: number;
  createdAt: string;
}

export const saveServerTemplate = (serverId: string, data: { name: string; description?: string }) =>
  api<{ template: ServerTemplate }>(`/api/servers/${serverId}/templates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const listTemplates = () =>
  api<{ templates: ServerTemplate[] }>('/api/templates');

export const listMyTemplates = () =>
  api<{ templates: ServerTemplate[] }>('/api/templates/mine');

export const createFromTemplate = (data: { templateId: string; name?: string; description?: string; icon?: string }) =>
  api<{ server: any }>('/api/servers/from-template', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteTemplate = (id: string) =>
  api(`/api/templates/${id}`, { method: 'DELETE' });
