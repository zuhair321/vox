import { api } from './client';

export type ApiKeyScope = 'read' | 'write' | 'admin';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKey {
  token: string;
}

export const listApiKeys = () => api<{ keys: ApiKey[] }>('/api/users/me/api-keys');
export const createApiKey = (data: { name: string; scopes?: ApiKeyScope[]; expiresAt?: string }) =>
  api<{ key: CreatedApiKey }>('/api/users/me/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const revokeApiKey = (id: string) =>
  api(`/api/users/me/api-keys/${id}`, { method: 'DELETE' });
