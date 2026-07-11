import { api } from './client';

export interface ReportParams {
  type: 'user' | 'message' | 'server';
  reason: 'spam' | 'harassment' | 'inappropriate' | 'unsafe' | 'other';
  reportedUserId?: string;
  messageId?: string;
  serverId?: string;
  details?: string;
}

export const submitReport = (params: ReportParams) =>
  api('/api/reports', {
    method: 'POST',
    body: JSON.stringify(params)
  });

export const fetchReports = (serverId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (serverId) params.set('serverId', serverId);
  if (status) params.set('status', status);
  const qs = params.toString();
  return api(`/api/reports${qs ? '?' + qs : ''}`);
};
