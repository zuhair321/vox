// Vox Mobile — Channel List Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useServerStore } from '../../stores/serverStore';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ServerStackParamList } from '../../navigation/ServerStack';
import { Hash, Volume2, Crown, Shield, Wrench, Settings, Users } from 'lucide-react-native';
import { InviteModal } from '../../components/chat/InviteModal';
import type { Channel } from '../../types';

type Nav = NativeStackNavigationProp<ServerStackParamList, 'ChannelList'>;
type Route = RouteProp<ServerStackParamList, 'ChannelList'>;

export function ChannelListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { selectedServer } = useServerStore();
  const user = useAuthStore(s => s.user);
  const [showInvite, setShowInvite] = useState(false);

  const channels = selectedServer?.channels || [];
  const textChannels = channels.filter(c => c.type === 'TEXT');
  const voiceChannels = channels.filter(c => c.type === 'VOICE');

  const handleChannelPress = (channel: Channel) => {
    if (channel.type === 'VOICE') {
      navigation.navigate('VoiceChannel', {
        serverId: route.params.serverId,
        channelId: channel.id,
        channelName: channel.name,
      });
    } else {
      navigation.navigate('Chat', {
        serverId: route.params.serverId,
        channelId: channel.id,
        channelName: channel.name,
      });
    }
  };

  const renderChannel = (channel: Channel) => (
    <TouchableOpacity
      key={channel.id}
      style={styles.channelItem}
      onPress={() => handleChannelPress(channel)}
      activeOpacity={0.7}
    >
      {channel.type === 'TEXT' ? (
        <Hash size={18} color={colors.textMuted} />
      ) : (
        <Volume2 size={18} color={colors.textMuted} />
      )}
      <Text style={styles.channelName} numberOfLines={1}>
        {channel.name}
      </Text>
    </TouchableOpacity>
  );

  const renderSection = (title: string, channelList: Channel[]) => {
    if (channelList.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {channelList.map(renderChannel)}
      </View>
    );
  };

  // Find user's role in this server
  const member = selectedServer?.members?.find(m => m.userId === user?.id);
  const isOwner = selectedServer?.ownerId === user?.id;
  const isAdmin = member?.role === 'ADMIN' || member?.role === 'FOUNDER' || isOwner;

  return (
    <View style={styles.container}>
      <View style={styles.serverHeader}>
        <View style={styles.serverNameRow}>
          <Text style={styles.serverName}>{selectedServer?.name || 'Server'}</Text>
          {isOwner && <Crown size={16} color={colors.founder} />}
          {member?.role === 'ADMIN' && <Shield size={16} color={colors.admin} />}
          {member?.role === 'MODERATOR' && <Wrench size={16} color={colors.moderator} />}
        </View>
        <View style={styles.headerActions}>
          {isAdmin && (
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowInvite(true)}>
              <Users size={20} color={colors.accent} />
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('ServerAdmin', {
                serverId: route.params.serverId,
                serverName: selectedServer?.name || 'Server',
              })}
            >
              <Settings size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {renderSection('Text Channels', textChannels)}
            {renderSection('Voice Channels', voiceChannels)}
          </>
        }
        contentContainerStyle={styles.list}
      />

      {isAdmin && selectedServer && (
        <InviteModal
          visible={showInvite}
          serverId={selectedServer.id}
          serverName={selectedServer.name || 'Server'}
          onClose={() => setShowInvite(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  serverName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  channelName: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
