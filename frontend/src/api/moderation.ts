import { api } from './client';

export interface ModerationLogEntry {
  id: string;
  serverId: string;
  action: string;
  targetId: string;
  targetType: string;
  moderatorId: string;
  moderator?: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  reason?: string;
  duration?: number;
  evidence?: any;
  appealed: boolean;
  appealReason?: string;
  appealStatus: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ModerationActionPayload {
  targetId: string;
  reason?: string;
  duration?: number;
  deleteMessageDays?: number;
  channelId?: string;
}

export interface AppealPayload {
  logId: string;
  reason: string;
  evidence?: any;
}

export interface AppealReviewPayload {
  decision: 'APPROVED' | 'DENIED';
  notes?: string;
}

export const fetchModerationLog = (serverId: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams(params as any).toString();
  return api<{ logs: ModerationLogEntry[]; total: number }>(`/api/servers/${serverId}/moderation/log${qs ? '?' + qs : ''}`);
};

export const kickMember = (serverId: string, payload: ModerationActionPayload) =>
  api(`/api/servers/${serverId}/moderation/kick`, { method: 'POST', body: JSON.stringify(payload) });

export const banMember = (serverId: string, payload: ModerationActionPayload) =>
  api(`/api/servers/${serverId}/moderation/ban`, { method: 'POST', body: JSON.stringify(payload) });

export const timeoutMember = (serverId: string, payload: ModerationActionPayload) =>
  api(`/api/servers/${serverId}/moderation/timeout`, { method: 'POST', body: JSON.stringify(payload) });

export const warnMember = (serverId: string, payload: ModerationActionPayload) =>
  api(`/api/servers/${serverId}/moderation/warn`, { method: 'POST', body: JSON.stringify(payload) });

export const muteMember = (serverId: string, payload: ModerationActionPayload) =>
  api(`/api/servers/${serverId}/moderation/mute`, { method: 'POST', body: JSON.stringify(payload) });

export const deafenMember = (serverId: string, payload: ModerationActionPayload) =>
  api(`/api/servers/${serverId}/moderation/deafen`, { method: 'POST', body: JSON.stringify(payload) });

export const createAppeal = (serverId: string, payload: AppealPayload) =>
  api(`/api/servers/${serverId}/moderation/appeals`, { method: 'POST', body: JSON.stringify(payload) });

export const reviewAppeal = (serverId: string, appealId: string, payload: AppealReviewPayload) =>
  api(`/api/servers/${serverId}/moderation/appeals/${appealId}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteAppeal = (serverId: string, logId: string) =>
  api(`/api/servers/${serverId}/moderation/${logId}/appeal`, { method: 'DELETE' });

export interface MemberModState {
  id: string;
  serverId: string;
  userId: string;
  nick?: string;
  mutedUntil?: string | null;
  deafened: boolean;
  timeoutUntil?: string | null;
  customPowers?: any;
  user?: { id: string; username?: string; displayName?: string; avatarUrl?: string };
}

export const fetchMemberModState = (serverId: string, userId: string) =>
  api<MemberModState>(`/api/servers/${serverId}/members/${userId}`);

export interface EscalationRule {
  warningThreshold: number;
  action: string; // ModerationActionType
  duration?: number | null;
}

export const fetchEscalationRules = (serverId: string) =>
  api<{ rules: EscalationRule[] | null }>(`/api/servers/${serverId}/escalation-rules`);

export const saveEscalationRules = (serverId: string, rules: EscalationRule[]) =>
  api<{ rules: EscalationRule[] }>(`/api/servers/${serverId}/escalation-rules`, {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });

export const fetchQuarantine = (serverId: string) =>
  api<{ items: ModerationLogEntry[] }>(`/api/servers/${serverId}/quarantine`);

export interface CustomPower {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  icon?: string;
  grants: any;
  grantableBy: string[];
  maxHolders?: number;
  createdAt: string;
}

export const fetchCustomPowers = (serverId: string) =>
  api<{ powers: CustomPower[] }>(`/api/servers/${serverId}/custom-powers`);

export const createCustomPower = (serverId: string, data: Partial<CustomPower>) =>
  api<CustomPower>(`/api/servers/${serverId}/custom-powers`, { method: 'POST', body: JSON.stringify(data) });

export const grantCustomPower = (serverId: string, userId: string, data: { powerId: string; duration?: number }) =>
  api(`/api/servers/${serverId}/members/${userId}/custom-powers`, { method: 'POST', body: JSON.stringify(data) });

export const revokeCustomPower = (serverId: string, userId: string, powerId: string) =>
  api(`/api/servers/${serverId}/members/${userId}/custom-powers/${powerId}`, { method: 'DELETE' });
