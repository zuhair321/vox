import { api } from './client';

export interface SessionInfo {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const fetchSessions = async (): Promise<SessionInfo[]> => {
  return api('/api/auth/sessions') as Promise<SessionInfo[]>;
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await api(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
};

export const revokeAllSessions = async (): Promise<void> => {
  await api('/api/auth/sessions', { method: 'DELETE' });
};
