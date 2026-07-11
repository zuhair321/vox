// Vox Mobile — Voice User List

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Avatar } from '../common/Avatar';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Mic, MicOff } from 'lucide-react-native';

interface VoiceUser {
  socketId: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

interface VoiceUserListProps {
  users: VoiceUser[];
  selfMuted?: boolean;
}

export function VoiceUserList({ users, selfMuted }: VoiceUserListProps) {
  return (
    <FlatList
      data={users}
      keyExtractor={item => item.socketId}
      renderItem={({ item }) => (
        <View style={[styles.userItem, item.isSpeaking && styles.speaking]}>
          <Avatar name={item.username} size={36} />
          <Text style={styles.username}>{item.username}</Text>
          {item.isMuted ? (
            <MicOff size={16} color={colors.danger} />
          ) : (
            <Mic size={16} color={colors.textMuted} />
          )}
        </View>
      )}
      ListHeaderComponent={
        <View style={[styles.userItem, selfMuted && styles.selfMuted]}>
          <Avatar name="You" size={36} />
          <Text style={styles.username}>You</Text>
          {selfMuted ? (
            <MicOff size={16} color={colors.danger} />
          ) : (
            <Mic size={16} color={colors.textMuted} />
          )}
        </View>
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSecondary,
  },
  speaking: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  selfMuted: {
    opacity: 0.7,
  },
  username: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
});
