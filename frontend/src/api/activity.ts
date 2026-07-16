import { api } from './client';

export type ActivityType = 'PLAYING' | 'LISTENING' | 'WATCHING' | 'STREAMING';

export interface Activity {
  type: ActivityType;
  name: string;
  url?: string | null;
}

export const setActivity = (activity: Activity | null) =>
  api<{ activity: Activity | null }>(`/api/users/me/activity`, {
    method: 'PATCH',
    body: JSON.stringify(activity || {}),
  });

export const fetchUserActivity = (userId: string) =>
  api<{ activity: Activity | null }>(`/api/users/${userId}/activity`);
