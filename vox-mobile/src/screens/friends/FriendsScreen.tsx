// Vox Mobile — Friends Screen

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFriendStore } from '../../stores/friendStore';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Avatar } from '../../components/common/Avatar';
import { StatusDot } from '../../components/common/StatusDot';
import { useNavigation } from '@react-navigation/native';
import { UserPlus, Check, X, Ban, Search } from 'lucide-react-native';
import type { PublicUser, FriendRelationship } from '../../types';

type Tab = 'online' | 'all' | 'pending' | 'blocked';

export function FriendsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore(s => s.user);
  const { friends, incoming, outgoing, blocked, isLoading, fetchFriends, sendRequest, accept, decline, block, unblock } = useFriendStore();
  const [activeTab, setActiveTab] = useState<Tab>('online');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');

  useEffect(() => {
    fetchFriends();
  }, []);

  const onlineFriends = friends.filter(f => f.status === 'ONLINE');

  const getDisplayList = () => {
    switch (activeTab) {
      case 'online': return onlineFriends;
      case 'all': return friends;
      case 'pending': return incoming;
      case 'blocked': return blocked;
      default: return [];
    }
  };

  const handleAddFriend = async () => {
    if (!friendUsername.trim()) return;
    try {
      await sendRequest(friendUsername.trim());
      setFriendUsername('');
      setShowAddFriend(false);
      Alert.alert('Sent!', 'Friend request sent');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send request');
    }
  };

  const renderFriend = (friend: PublicUser) => (
    <View key={friend.id} style={styles.friendItem}>
      <View style={styles.avatarContainer}>
        <Avatar uri={friend.avatarUrl} name={friend.displayName || friend.username} size={40} />
        <StatusDot status={friend.status} size={12} style={styles.statusDot} />
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.displayName || friend.username}</Text>
        <Text style={styles.friendStatus}>{friend.status?.toLowerCase()}</Text>
      </View>
      {activeTab === 'blocked' && (
        <TouchableOpacity onPress={() => unblock(friend.id)} style={styles.actionButton}>
          <Text style={styles.unblockText}>Unblock</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPendingRequest = (rel: FriendRelationship) => {
    const isIncoming = rel.userId !== user?.id;
    const otherUser = isIncoming ? rel.user : rel.friend;

    return (
      <View key={rel.id} style={styles.friendItem}>
        <Avatar uri={otherUser.avatarUrl} name={otherUser.displayName || otherUser.username} size={40} />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{otherUser.displayName || otherUser.username}</Text>
          <Text style={styles.friendStatus}>
            {isIncoming ? 'Incoming request' : 'Outgoing request'}
          </Text>
        </View>
        {isIncoming && (
          <View style={styles.pendingActions}>
            <TouchableOpacity onPress={() => accept(rel.id)} style={styles.acceptButton}>
              <Check size={18} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => decline(rel.id)} style={styles.declineButton}>
              <X size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const displayList = getDisplayList();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity onPress={() => setShowAddFriend(!showAddFriend)}>
          <UserPlus size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Add Friend */}
      {showAddFriend && (
        <View style={styles.addFriendRow}>
          <TextInput
            style={styles.addInput}
            value={friendUsername}
            onChangeText={setFriendUsername}
            placeholder="Enter username"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
            <Text style={styles.addButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['online', 'all', 'pending', 'blocked'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={activeTab === 'pending' ? incoming : []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => renderPendingRequest(item)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          activeTab !== 'pending' ? (
            <>
              {displayList.map(item =>
                activeTab === 'blocked'
                  ? renderFriend(item as PublicUser)
                  : renderFriend(item as PublicUser)
              )}
            </>
          ) : null
        }
        ListEmptyComponent={
          activeTab === 'pending' && incoming.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          ) : null
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  addFriendRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.md,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  friendStatus: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  actionButton: {
    padding: spacing.sm,
  },
  unblockText: {
    color: colors.accent,
    fontWeight: '600',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
