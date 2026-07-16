import { api } from './client';

export interface VoiceRegion {
  id: string;
  name: string;
  flag: string;
}

export const fetchVoiceRegions = () =>
  api<{ regions: VoiceRegion[] }>(`/api/voice/regions`);

export const setChannelRegion = (channelId: string, region: string) =>
  api<{ region: string }>(`/api/channels/${channelId}/region`, {
    method: 'PUT',
    body: JSON.stringify({ region }),
  });
