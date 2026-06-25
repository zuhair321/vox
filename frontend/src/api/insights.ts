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
