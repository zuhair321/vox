import { api } from './client';

export interface ServerInsight {
  period: string;
  totalMembers: number;
  totalMessages: number;
  periodMessages: number;
  activeMembers: number;
  newJoins: number;
  channelActivity: { channelId: string; name: string; count: number }[];
  topMembers: { userId: string; username: string; count: number }[];
}

export const fetchInsights = (serverId: string, period = '7d') =>
  api(`/api/servers/${serverId}/insights?period=${period}`) as Promise<ServerInsight>;


// Time-series insights: message volume per day, peak concurrent, new joins.

export async function fetchInsightsSeries(serverId: string, period: '7d'|'30d'|'90d' = '7d') {
  const j = await api<any>(`/api/servers/${encodeURIComponent(serverId)}/insights/series?period=${encodeURIComponent(period)}`, { method: 'GET' });
  return j || { labels: [], messages: [], joins: [], peak: [] };
}
