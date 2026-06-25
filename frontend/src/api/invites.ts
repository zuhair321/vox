import { api } from './client';

export interface Invite {
  id: string;
  code: string;
  serverId: string;
  creatorId: string;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
}

export const createInvite = (serverId: string, expiresIn = '7days', maxUses = 0) =>
  api(`/api/servers/${serverId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ expiresIn, maxUses }),
  });

export const fetchServerInvites = (serverId: string) =>
  api(`/api/servers/${serverId}/invites`);

export const resolveInvite = (code: string) =>
  api(`/api/invites/${code}`);

export const joinByInvite = (code: string) =>
  api(`/api/invites/${code}/join`, { method: 'POST' });

export const revokeInvite = (code: string) =>
  api(`/api/invites/${code}`, { method: 'DELETE' });
