import { api } from './client';

export type StageStatus = 'REQUESTED' | 'SPEAKER' | 'MOD';

export interface StageSpeaker {
  userId: string;
  status: StageStatus;
  createdAt: string;
  user?: { id: string; username: string; displayName: string; avatarUrl?: string | null };
}

export const fetchStageSpeakers = (channelId: string) =>
  api<{ speakers: StageSpeaker[] }>(`/api/channels/${channelId}/stage/speakers`);

export const requestToSpeak = (channelId: string) =>
  api<{ speaker: StageSpeaker }>(`/api/channels/${channelId}/stage/speakers/request`, {
    method: 'POST',
  });

export const approveSpeaker = (channelId: string, userId: string) =>
  api<{ speaker: StageSpeaker }>(`/api/channels/${channelId}/stage/speakers/${userId}/approve`, {
    method: 'POST',
  });

export const promoteStageMod = (channelId: string, userId: string) =>
  api<{ speaker: StageSpeaker }>(`/api/channels/${channelId}/stage/speakers/${userId}/mod`, {
    method: 'POST',
  });

export const removeSpeaker = (channelId: string, userId: string) =>
  api(`/api/channels/${channelId}/stage/speakers/${userId}`, { method: 'DELETE' });
