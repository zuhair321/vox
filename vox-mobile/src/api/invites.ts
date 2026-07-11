// Vox Mobile — Invites API

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

export interface InviteInfo {
  code: string;
  server: {
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    banner?: string | null;
    memberCount: number;
  };
}

export async function resolveInvite(code: string): Promise<InviteInfo> {
  return api(`/api/invites/${code}`);
}

export async function joinByInvite(code: string): Promise<{ server: { id: string; name: string; channels?: Array<{ id: string }> } }> {
  return api(`/api/invites/${code}/join`, { method: 'POST' });
}

export async function createInvite(serverId: string, expiresIn = '7days', maxUses = 0): Promise<Invite> {
  return api(`/api/servers/${serverId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ expiresIn, maxUses }),
  });
}

export async function fetchServerInvites(serverId: string): Promise<Invite[]> {
  return api(`/api/servers/${serverId}/invites`);
}

export async function revokeInvite(code: string): Promise<void> {
  return api(`/api/invites/${code}`, { method: 'DELETE' });
}
