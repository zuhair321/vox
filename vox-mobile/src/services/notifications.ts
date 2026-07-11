// Vox Mobile — Push notification registration.
// Requests permission, fetches an Expo push token, and registers it with the
// backend (/api/notifications/register). Actual delivery requires a push
// sender on the backend (Expo push API or FCM) — see LAUNCH-README.md.

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getProjectId(): string | undefined {
  // expo-constants exposes the app config at runtime.
  const cfg: any = (Constants as any).expoConfig || (Constants as any).manifest;
  return cfg?.extra?.eas?.projectId;
}

export async function registerPushNotifications(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId = getProjectId();
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenData.data;

    await api('/api/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (e) {
    console.error('[push] registration failed', e);
  }
}
