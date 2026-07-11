// Vox Mobile — DM List Screen

import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useDMStore } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import { useFriendStore } from '../../stores/friendStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Avatar } from '../../components/common/Avatar';
import { StatusDot } from '../../components/common/StatusDot';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DMStackParamList } from '../../navigation/DMStack';
import { buildDmId, extractOtherUserId } from '../../utils/dm';

type Nav = NativeStackNavigationProp<DMStackParamList, 'DMList'>;

export function DMListScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);
  const { friends, fetchFriends } = useFriendStore();
  const { messages, unread } = useDMStore();

  useEffect(() => {
    fetchFriends();
  }, []);

  // Build DM list from friends (accepted only)
  const dmList = friends.map(friend => {
    const dmId = user ? buildDmId(user.id, friend.id) : '';
    const lastMessage = messages[dmId]?.slice(-1)[0];
    const unreadCount = unread[dmId] || 0;

    return {
      friend,
      dmId,
      lastMessage,
      unreadCount,
    };
  }).filter(dm => dm.lastMessage || dm.dmId); // Show friends with DM history

  // Sort by last message time
  dmList.sort((a, b) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
  });

  const handlePress = (dmId: string, friendId: string, friendName: string) => {
    if (!user) return;
    navigation.navigate('DMConversation', {
      dmId,
      recipientId: friendId,
      recipientName: friendName,
    });
  };

  const renderDM = ({ item }: { item: typeof dmList[0] }) => (
    <TouchableOpacity
      style={styles.dmItem}
      onPress={() => handlePress(item.dmId, item.friend.id, item.friend.displayName || item.friend.username)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={item.friend.avatarUrl}
          name={item.friend.displayName || item.friend.username}
          size={44}
        />
        <StatusDot status={item.friend.status} size={12} style={styles.statusDot} />
      </View>

      <View style={styles.dmInfo}>
        <Text style={styles.dmName} numberOfLines={1}>
          {item.friend.displayName || item.friend.username}
        </Text>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.deleted ? 'Message deleted' : item.lastMessage.content}
          </Text>
        )}
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={dmList}
        keyExtractor={item => item.dmId}
        renderItem={renderDM}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Add friends to start chatting</Text>
          </View>
        }
      />
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
    gap: spacing.xs,
  },
  dmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  dmInfo: {
    flex: 1,
  },
  dmName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  lastMessage: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
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
});
