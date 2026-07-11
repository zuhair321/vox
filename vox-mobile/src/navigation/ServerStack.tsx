// Vox Mobile — Server Stack

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ServerListScreen } from '../screens/servers/ServerListScreen';
import { ChannelListScreen } from '../screens/servers/ChannelListScreen';
import { ChatScreen } from '../screens/servers/ChatScreen';
import { DiscoverScreen } from '../screens/servers/DiscoverScreen';
import { CreateServerScreen } from '../screens/servers/CreateServerScreen';
import { ServerAdminScreen } from '../screens/servers/ServerAdminScreen';
import { ServerInsightsScreen } from '../screens/servers/ServerInsightsScreen';
import { VoiceChannelScreen } from '../screens/voice/VoiceChannelScreen';
import { colors } from '../utils/theme';

export type ServerStackParamList = {
  ServerList: undefined;
  ChannelList: { serverId: string };
  Chat: { serverId: string; channelId: string; channelName: string };
  Discover: undefined;
  CreateServer: undefined;
  ServerAdmin: { serverId: string; serverName: string };
  ServerInsights: { serverId: string; serverName: string };
  VoiceChannel: { serverId: string; channelId: string; channelName: string };
};

const Stack = createNativeStackNavigator<ServerStackParamList>();

export function ServerStack() {
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
      <Stack.Screen name="ServerList" component={ServerListScreen} options={{ title: 'Servers' }} />
      <Stack.Screen name="ChannelList" component={ChannelListScreen} options={{ title: 'Channels' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Discover" component={DiscoverScreen} options={{ title: 'Discover Servers' }} />
      <Stack.Screen name="CreateServer" component={CreateServerScreen} options={{ title: 'Create Server' }} />
      <Stack.Screen name="ServerAdmin" component={ServerAdminScreen} options={{ title: 'Server Settings' }} />
      <Stack.Screen name="ServerInsights" component={ServerInsightsScreen} options={{ title: 'Server Insights' }} />
      <Stack.Screen name="VoiceChannel" component={VoiceChannelScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
