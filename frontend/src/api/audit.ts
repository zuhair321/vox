import { api } from './client';

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  user: { id: string; username: string };
  targetId?: string;
  targetType?: string;
  changes?: Record<string, any>;
  createdAt: string;
}

export const fetchServerAuditLog = (serverId: string) => api(`/api/servers/${serverId}/audit`);