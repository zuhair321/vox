import { create } from 'zustand';
import { dashboardApi, usersApi, serversApi, messagesApi, reportsApi, auditApi, systemApi } from '../api/admin';
import type { DashboardStats, User, UserDetail, Server, ServerDetail, Message, Report, AuditLog, SystemHealth, ActivityEntry } from '../api/admin';

interface AdminState {
  // Dashboard
  stats: DashboardStats | null;
  activity: ActivityEntry[];
  health: SystemHealth | null;
  
  // Users
  users: User[];
  usersTotal: number;
  usersPage: number;
  usersPages: number;
  selectedUser: UserDetail | null;
  
  // Servers
  servers: Server[];
  serversTotal: number;
  serversPage: number;
  serversPages: number;
  selectedServer: ServerDetail | null;
  
  // Messages
  messages: Message[];
  messagesTotal: number;
  messagesPage: number;
  messagesPages: number;
  
  // Reports
  reports: Report[];
  reportsTotal: number;
  reportsPage: number;
  reportsPages: number;
  
  // Audit
  auditLogs: AuditLog[];
  auditTotal: number;
  auditPage: number;
  auditPages: number;
  
  // Loading states
  loading: {
    dashboard: boolean;
    users: boolean;
    servers: boolean;
    messages: boolean;
    reports: boolean;
    audit: boolean;
    health: boolean;
  };
  
  // Actions
  fetchDashboard: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  
  fetchUsers: (params?: { search?: string; page?: number; limit?: number; status?: string; role?: string }) => Promise<void>;
  fetchUser: (id: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  banUser: (id: string, reason?: string) => Promise<void>;
  unbanUser: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  fetchServers: (params?: { search?: string; page?: number; limit?: number }) => Promise<void>;
  fetchServer: (id: string) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  
  fetchMessages: (params?: { search?: string; page?: number; limit?: number; channelId?: string }) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  
  fetchReports: (params?: { status?: string; page?: number; limit?: number }) => Promise<void>;
  updateReport: (id: string, data: { status: string; resolution?: string }) => Promise<void>;
  
  fetchAuditLogs: (params?: { page?: number; limit?: number; action?: string }) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  activity: [],
  health: null,
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersPages: 1,
  selectedUser: null,
  servers: [],
  serversTotal: 0,
  serversPage: 1,
  serversPages: 1,
  selectedServer: null,
  messages: [],
  messagesTotal: 0,
  messagesPage: 1,
  messagesPages: 1,
  reports: [],
  reportsTotal: 0,
  reportsPage: 1,
  reportsPages: 1,
  auditLogs: [],
  auditTotal: 0,
  auditPage: 1,
  auditPages: 1,
  loading: {
    dashboard: false,
    users: false,
    servers: false,
    messages: false,
    reports: false,
    audit: false,
    health: false,
  },

  fetchDashboard: async () => {
    set(s => ({ loading: { ...s.loading, dashboard: true } }));
    try {
      const [stats, activity] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(),
      ]);
      set({ stats, activity });
    } catch (e) {
      console.error('Failed to fetch dashboard:', e);
    }
    set(s => ({ loading: { ...s.loading, dashboard: false } }));
  },

  fetchHealth: async () => {
    set(s => ({ loading: { ...s.loading, health: true } }));
    try {
      const health = await systemApi.health();
      set({ health });
    } catch (e) {
      console.error('Failed to fetch health:', e);
    }
    set(s => ({ loading: { ...s.loading, health: false } }));
  },

  fetchUsers: async (params) => {
    set(s => ({ loading: { ...s.loading, users: true } }));
    try {
      const res = await usersApi.list(params);
      set({ users: res.users, usersTotal: res.total, usersPage: res.page, usersPages: res.pages });
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
    set(s => ({ loading: { ...s.loading, users: false } }));
  },

  fetchUser: async (id) => {
    set(s => ({ loading: { ...s.loading, users: true } }));
    try {
      const { user } = await usersApi.get(id);
      set({ selectedUser: user });
    } catch (e) {
      console.error('Failed to fetch user:', e);
    }
    set(s => ({ loading: { ...s.loading, users: false } }));
  },

  updateUser: async (id, data) => {
    const { user } = await usersApi.update(id, data);
    set(s => ({
      users: s.users.map(u => u.id === id ? { ...u, ...user } : u),
      selectedUser: s.selectedUser?.id === id ? { ...s.selectedUser, ...user } : s.selectedUser,
    }));
  },

  banUser: async (id, reason) => {
    await usersApi.ban(id, reason);
    set(s => ({
      users: s.users.map(u => u.id === id ? { ...u, status: 'BANNED' } : u),
    }));
  },

  unbanUser: async (id) => {
    await usersApi.unban(id);
    set(s => ({
      users: s.users.map(u => u.id === id ? { ...u, status: 'OFFLINE' } : u),
    }));
  },

  deleteUser: async (id) => {
    await usersApi.delete(id);
    set(s => ({
      users: s.users.filter(u => u.id !== id),
      usersTotal: s.usersTotal - 1,
    }));
  },

  fetchServers: async (params) => {
    set(s => ({ loading: { ...s.loading, servers: true } }));
    try {
      const res = await serversApi.list(params);
      set({ servers: res.servers, serversTotal: res.total, serversPage: res.page, serversPages: res.pages });
    } catch (e) {
      console.error('Failed to fetch servers:', e);
    }
    set(s => ({ loading: { ...s.loading, servers: false } }));
  },

  fetchServer: async (id) => {
    set(s => ({ loading: { ...s.loading, servers: true } }));
    try {
      const { server } = await serversApi.get(id);
      set({ selectedServer: server });
    } catch (e) {
      console.error('Failed to fetch server:', e);
    }
    set(s => ({ loading: { ...s.loading, servers: false } }));
  },

  deleteServer: async (id) => {
    await serversApi.delete(id);
    set(s => ({
      servers: s.servers.filter(srv => srv.id !== id),
      serversTotal: s.serversTotal - 1,
    }));
  },

  fetchMessages: async (params) => {
    set(s => ({ loading: { ...s.loading, messages: true } }));
    try {
      const res = await messagesApi.list(params);
      set({ messages: res.messages, messagesTotal: res.total, messagesPage: res.page, messagesPages: res.pages });
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
    set(s => ({ loading: { ...s.loading, messages: false } }));
  },

  deleteMessage: async (id) => {
    await messagesApi.delete(id);
    set(s => ({
      messages: s.messages.filter(m => m.id !== id),
      messagesTotal: s.messagesTotal - 1,
    }));
  },

  fetchReports: async (params) => {
    set(s => ({ loading: { ...s.loading, reports: true } }));
    try {
      const res = await reportsApi.list(params);
      set({ reports: res.reports, reportsTotal: res.total, reportsPage: res.page, reportsPages: res.pages });
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    }
    set(s => ({ loading: { ...s.loading, reports: false } }));
  },

  updateReport: async (id, data) => {
    const { report } = await reportsApi.update(id, data);
    set(s => ({
      reports: s.reports.map(r => r.id === id ? { ...r, ...report } : r),
    }));
  },

  fetchAuditLogs: async (params) => {
    set(s => ({ loading: { ...s.loading, audit: true } }));
    try {
      const res = await auditApi.list(params);
      set({ auditLogs: res.logs, auditTotal: res.total, auditPage: res.page, auditPages: res.pages });
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    }
    set(s => ({ loading: { ...s.loading, audit: false } }));
  },
}));
