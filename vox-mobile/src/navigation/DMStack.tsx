// Vox Mobile — DM Stack

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DMListScreen } from '../screens/dm/DMListScreen';
import { DMConversationScreen } from '../screens/dm/DMConversationScreen';
import { colors } from '../utils/theme';

export type DMStackParamList = {
  DMList: undefined;
  DMConversation: { dmId: string; recipientId: string; recipientName: string };
};

const Stack = createNativeStackNavigator<DMStackParamList>();

export function DMStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DMList" component={DMListScreen} options={{ title: 'Messages' }} />
      <Stack.Screen name="DMConversation" component={DMConversationScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
