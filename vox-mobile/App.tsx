// Vox Mobile — App entry point

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { useAuthStore } from './src/stores/authStore';
import { useSocketStore } from './src/stores/socketStore';
import { useServerStore } from './src/stores/serverStore';
import { reportCrash } from './src/api/client';
import { registerPushNotifications } from './src/services/notifications';

export default function App() {
  const initialize = useAuthStore(s => s.initialize);
  const user = useAuthStore(s => s.user);
  const connectSocket = useSocketStore(s => s.connect);
  const disconnectSocket = useSocketStore(s => s.disconnect);
  const fetchServers = useServerStore(s => s.fetchServers);

  // Initialize auth on app start
  useEffect(() => {
    initialize();

    const onUnhandled = (event: any) => {
      console.error('Unhandled error:', event?.error || event?.reason);
      reportCrash(String(event?.error?.message || event?.reason || 'unhandled error'), {
        stack: event?.error?.stack,
        platform: 'android',
      });
    };
    const onRejection = (event: any) => {
      console.error('Unhandled promise rejection:', event?.reason);
      reportCrash(String(event?.reason?.message || event?.reason || 'unhandled rejection'), {
        stack: event?.reason?.stack,
        platform: 'android',
      });
    };

    if (typeof ErrorEvent !== 'undefined') {
      // @ts-ignore - React Native global
      global?.addEventListener?.('error', onUnhandled);
      // @ts-ignore
      global?.addEventListener?.('unhandledrejection', onRejection);
    }
  }, []);

  // Connect socket when user is authenticated
  useEffect(() => {
    if (user) {
      connectSocket();
      fetchServers();
      registerPushNotifications();
    } else {
      disconnectSocket();
    }
  }, [user]);

  return (
    <>
      <StatusBar style="light" />
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </>
  );
}
