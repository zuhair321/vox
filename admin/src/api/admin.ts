import { api } from './client';

// Auth
export const authApi = {
  login: (emailOrUsername: string, password: string) =>
    api.post<{ user: any; tokens: { access: string; refresh: string } }>(
      '/auth/login',
      { emailOrUsername, password }
    ),
  me: () => api.get<{ user: any }>('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post<{ tokens: { access: string; refresh: string } }>(
      '/auth/refresh',
      { refreshToken }
    ),
  },
  get: (id: string) => api.get<{ user: UserDetail }>(`/admin/users/${id}`),
  update: (id: string, data: Partial<User>) =>
    api.patch<{ user: User }>(`/admin/users/${id}`, data),
  ban: (id: string, reason?: string) =>
    api.post(`/admin/users/${id}/ban`, { reason }),
  unban: (id: string) => api.delete(`/admin/users/${id}/ban`),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  resetPassword: (id: string) => api.post(`/admin/users/${id}/reset-password`),
  sessions: (id: string) => api.get<{ sessions: any[] }>(`/admin/users/${id}/sessions`),
};

// Servers
export const serversApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return api.get<{ servers: Server[]; total: number; page: number; pages: number }>(`/admin/servers?${q}`);
  },
  get: (id: string) => api.get<{ server: ServerDetail }>(`/admin/servers/${id}`),
  delete: (id: string) => api.delete(`/admin/servers/${id}`),
  update: (id: string, data: Partial<Server>) =>
    api.patch<{ server: Server }>(`/admin/servers/${id}`, data),
};

// Messages
export const messagesApi = {
  list: (params?: { search?: string; page?: number; limit?: number; channelId?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.channelId) q.set('channelId', params.channelId);
    return api.get<{ messages: Message[]; total: number; page: number; pages: number }>(`/admin/messages?${q}`);
  },
  delete: (id: string) => api.delete(`/admin/messages/${id}`),
};

// Reports
export const reportsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return api.get<{ reports: Report[]; total: number; page: number; pages: number }>(`/admin/reports?${q}`);
  },
  update: (id: string, data: { status: string; resolution?: string }) =>
    api.patch<{ report: Report }>(`/admin/reports/${id}`, data),
};

// Audit Logs
export const auditApi = {
  list: (params?: { page?: number; limit?: number; action?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.action) q.set('action', params.action);
    return api.get<{ logs: AuditLog[]; total: number; page: number; pages: number }>(`/admin/audit?${q}`);
  },
};

// System
export const systemApi = {
  health: () => api.get<SystemHealth>('/admin/health'),
  config: () => api.get<SystemConfig>('/admin/config'),
};

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count?: {
    channelMessages: number;
    serverMembers: number;
    dmsSent: number;
  };
}

export interface UserDetail extends User {
  ownedServers: Server[];
  serverMembers: { server: Server; role: string; joinedAt: string }[];
  refreshTokens: { id: string; deviceInfo: string | null; ipAddress: string | null; createdAt: string; revoked: boolean }[];
}

export interface Server {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  banner: string | null;
  category: string;
  isPublic: boolean;
  createdAt: string;
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  _count?: {
    members: number;
    channels: number;
    messages?: number;
  };
}

export interface ServerDetail extends Server {
  channels: { id: string; name: string; type: string; position: number }[];
  members: { user: User; role: string; joinedAt: string }[];
  invites: { code: string; uses: number; maxUses: number; expiresAt: string | null }[];
  webhooks: { id: string; name: string; channelId: string }[];
  auditLogs: AuditLog[];
}

export interface Message {
  id: string;
  body: string;
  createdAt: string;
  edited: boolean;
  deleted: boolean;
  pinned: boolean;
  attachments: any;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  authorOverride: string | null;
  channel: { id: string; name: string; server: { id: string; name: string } | null };
}

export interface Report {
  id: string;
  type: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string; displayName: string };
  reportedUser: { id: string; username: string; displayName: string } | null;
  messageId: string | null;
  serverId: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  targetId: string | null;
  details: any;
  createdAt: string;
  user: { id: string; username: string; displayName: string };
  server: { id: string; name: string };
}

export interface DashboardStats {
  totalUsers: number;
  totalServers: number;
  totalMessages: number;
  totalDms: number;
  onlineUsers: number;
  activeServers: number;
  newUsersToday: number;
  messagesToday: number;
  usersByStatus: { status: string; count: number }[];
  usersByDay: { date: string; count: number }[];
  messagesByDay: { date: string; count: number }[];
  topServers: { id: string; name: string; memberCount: number; messageCount: number }[];
  recentUsers: User[];
  recentMessages: Message[];
}

export interface ActivityEntry {
  type: string;
  description: string;
  timestamp: string;
  userId?: string;
  username?: string;
}

export interface SystemHealth {
  database: { connected: boolean; latency: number; version: string };
  redis: { connected: boolean; latency: number; memory: string };
  server: { uptime: number; memory: { used: number; total: number }; cpu: number; nodeVersion: string };
  counts: { users: number; servers: number; messages: number; channels: number };
}

export interface SystemConfig {
  registrationOpen: boolean;
  maxFileSize: number;
  maintenanceMode: boolean;
}
