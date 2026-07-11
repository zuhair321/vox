// Vox Mobile — Server List Screen

import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useServerStore } from '../../stores/serverStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Avatar } from '../../components/common/Avatar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServerStackParamList } from '../../navigation/ServerStack';
import { Plus, Compass } from 'lucide-react-native';
import type { Server } from '../../types';

type Nav = NativeStackNavigationProp<ServerStackParamList, 'ServerList'>;

export function ServerListScreen() {
  const navigation = useNavigation<Nav>();
  const { servers, isLoading, fetchServers, selectServer } = useServerStore();

  useEffect(() => {
    fetchServers();
  }, []);

  const handleServerPress = (server: Server) => {
    selectServer(server);
    navigation.navigate('ChannelList', { serverId: server.id });
  };

  const renderServer = ({ item }: { item: Server }) => (
    <TouchableOpacity
      style={styles.serverCard}
      onPress={() => handleServerPress(item)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.icon} name={item.name} size={56} />
      <View style={styles.serverInfo}>
        <Text style={styles.serverName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.serverMeta} numberOfLines={1}>
          {item.channels?.length || 0} channels · {item.members?.length || 0} members
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={servers}
        keyExtractor={item => item.id}
        renderItem={renderServer}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchServers}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No servers yet</Text>
            <Text style={styles.emptySubtext}>Join or create a server to get started</Text>
          </View>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Discover')}
        >
          <Compass size={20} color={colors.accent} />
          <Text style={styles.actionText}>Discover</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateServer')}
        >
          <Plus size={20} color={colors.accent} />
          <Text style={styles.actionText}>Create</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  serverMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
});
