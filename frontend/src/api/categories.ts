import { api } from './client';

export interface Category {
  id: string;
  name: string;
  position?: number;
  channels: { id: string; name: string; type: string }[];
}

export const fetchServerCategories = (serverId: string) => api(`/api/servers/${serverId}/categories`);
export const createServerCategory = (serverId: string, name: string, position?: number) =>
  api(`/api/servers/${serverId}/categories`, {
    method: 'POST',
    body: JSON.stringify({ name, position }),
  });
export const updateServerCategory = (serverId: string, categoryId: string, data: Partial<{ name: string; position?: number }>) =>
  api(`/api/servers/${serverId}/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const deleteServerCategory = (serverId: string, categoryId: string) =>
  api(`/api/servers/${serverId}/categories/${categoryId}`, { method: 'DELETE' });