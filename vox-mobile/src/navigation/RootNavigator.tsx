// Vox Mobile — Root Navigator

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { LoadingScreen } from '../components/common/LoadingScreen';

export function RootNavigator() {
  const user = useAuthStore(s => s.user);
  const isInitialized = useAuthStore(s => s.isInitialized);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
