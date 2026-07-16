import { api } from './client';

export interface WidgetConfig {
  enabled: boolean;
  theme: 'dark' | 'light';
  showOnline: boolean;
  showJoin: boolean;
}

export const getWidgetConfig = (serverId: string) =>
  api<{ config: WidgetConfig; url: string; embedCode: string }>(`/api/servers/${serverId}/widget`);

export const updateWidgetConfig = (serverId: string, data: Partial<WidgetConfig>) =>
  api<{ config: WidgetConfig }>(`/api/servers/${serverId}/widget`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const getWidgetPreview = (serverId: string) =>
  api(`/api/servers/${serverId}/widget/preview`);
