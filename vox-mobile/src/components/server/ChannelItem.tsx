// Vox Mobile — Channel Item component

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Hash, Volume2, Lock } from 'lucide-react-native';
import type { Channel } from '../../types';

interface ChannelItemProps {
  channel: Channel;
  onPress: (channel: Channel) => void;
  isActive?: boolean;
  style?: ViewStyle;
}

export function ChannelItem({ channel, onPress, isActive, style }: ChannelItemProps) {
  return (
    <TouchableOpacity
      style={[styles.item, isActive && styles.itemActive, style]}
      onPress={() => onPress(channel)}
      activeOpacity={0.7}
    >
      {channel.type === 'TEXT' ? (
        <Hash size={18} color={isActive ? colors.text : colors.textMuted} />
      ) : (
        <Volume2 size={18} color={isActive ? colors.text : colors.textMuted} />
      )}
      <Text
        style={[styles.name, isActive && styles.nameActive]}
        numberOfLines={1}
      >
        {channel.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  itemActive: {
    backgroundColor: colors.bgHover,
  },
  name: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  nameActive: {
    color: colors.text,
    fontWeight: '600',
  },
});
