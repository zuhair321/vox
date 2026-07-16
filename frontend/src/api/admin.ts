import { api } from './client';

export interface AdminStats {
  totalUsers: number;
  totalServers: number;
  totalMessages: number;
  onlineUsers: number;
  uptime: number;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: string;
  isActive: boolean;
  lastSeen: string;
}

export interface ServerInfo {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  createdAt: string;
}

export const fetchAdminStats = () => api('/api/admin/stats');
export const fetchAllUsers = () => api('/api/admin/users');
export const fetchAllServers = () => api('/api/admin/servers');
export const banUserGlobally = (userId: string, reason?: string) =>
  api(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
export const unbanUserGlobally = (userId: string) =>
  api(`/api/admin/users/${userId}/unban`, { method: 'POST' });
export const sendAnnouncement = (message: string) =>
  api('/api/admin/announcement', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });