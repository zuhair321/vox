// Vox Mobile — Main Tabs

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ServerStack } from './ServerStack';
import { DMStack } from './DMStack';
import { FriendsScreen } from '../screens/friends/FriendsScreen';
import { ProfileStack } from './ProfileStack';
import { colors } from '../utils/theme';
import { MessageSquare, Users, User, Compass } from 'lucide-react-native';

export type MainTabParamList = {
  Servers: undefined;
  DMs: undefined;
  Friends: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Servers"
        component={ServerStack}
        options={{
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="DMs"
        component={DMStack}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
