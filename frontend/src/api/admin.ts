import { api } from './client';

export interface AdminStats {
  totalUsers: number;
  totalServers: number;
  totalMessages: number;
  onlineUsers: number;
  uptime: number;
  totalDms: number;
  activeServers: number;
  newUsersToday: number;
  messagesToday: number;
  usersByStatus: { status: string; count: number }[];
  usersByDay: { date: string; count: number }[];
  messagesByDay: { date: string; count: number }[];
  topServers: { id: string; name: string; memberCount: number; messageCount: number }[];
  recentUsers: any[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  _count?: { serverMembers: number; channelMessages: number };
}

export interface AdminServer {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  owner?: { id: string; username: string; displayName: string };
  _count?: { members: number; channels: number; messages: number };
}

export const fetchAdminStats = () => api<AdminStats>('/api/admin/stats');
export const fetchAllUsers = (page = 1, search = '') =>
  api<{ users: AdminUser[]; total: number; page: number; pages: number }>(
    `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`
  );
export const fetchAllServers = (page = 1, search = '') =>
  api<{ servers: AdminServer[]; total: number; page: number; pages: number }>(
    `/api/admin/servers?page=${page}&search=${encodeURIComponent(search)}`
  );
export const banUserGlobally = (userId: string, reason?: string) =>
  api(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
export const unbanUserGlobally = (userId: string) =>
  api(`/api/admin/users/${userId}/ban`, { method: 'DELETE' });
export const deleteUser = (userId: string) =>
  api(`/api/admin/users/${userId}`, { method: 'DELETE' });
export const deleteServer = (serverId: string) =>
  api(`/api/admin/servers/${serverId}`, { method: 'DELETE' });
export const updateUserRole = (userId: string, role: string) =>
  api(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
export const sendAnnouncement = (message: string) =>
  api('/api/admin/announcement', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
