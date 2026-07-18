import { api } from './client';

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string;
  hoist: boolean;
  mentionable: boolean;
  position: number;
  permissions: string; // BigInt stored as string
  createdAt: string;
  updatedAt: string;
}

export interface MemberRole {
  id: string;
  memberId: string;
  roleId: string;
}

export const fetchRoles = (serverId: string) =>
  api<{ roles: Role[] }>(`/api/${serverId}/roles`);

export const createRole = (serverId: string, data: Partial<Role>) =>
  api<{ role: Role }>(`/api/${serverId}/roles`, {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      color: data.color,
      hoist: data.hoist,
      position: data.position,
      permissions: data.permissions,
    }),
  });

export const updateRole = (serverId: string, roleId: string, data: Partial<Role>) =>
  api<{ role: Role }>(`/api/${serverId}/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.hoist !== undefined ? { hoist: data.hoist } : {}),
      ...(data.mentionable !== undefined ? { mentionable: data.mentionable } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
    }),
  });

export const deleteRole = (serverId: string, roleId: string) =>
  api(`/api/${serverId}/roles/${roleId}`, { method: 'DELETE' });

export const assignRole = (serverId: string, memberId: string, roleId: string) =>
  api(`/api/${serverId}/members/${memberId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleId }),
  });

export const removeMemberRole = (serverId: string, memberId: string, roleId: string) =>
  api(`/api/${serverId}/members/${memberId}/roles/${roleId}`, { method: 'DELETE' });

export const fetchMemberRoles = (serverId: string, memberId: string) =>
  api<{ roles: MemberRole[] }>(`/api/${serverId}/members/${memberId}/roles`);
