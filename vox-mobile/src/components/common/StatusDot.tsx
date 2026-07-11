// Vox Mobile — Common: Status Dot

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../utils/theme';

interface StatusDotProps {
  status: string;
  size?: number;
  style?: ViewStyle;
}

export function StatusDot({ status, size = 10, style }: StatusDotProps) {
  const colorMap: Record<string, string> = {
    ONLINE: colors.online,
    online: colors.online,
    IDLE: colors.idle,
    idle: colors.idle,
    DND: colors.dnd,
    dnd: colors.dnd,
    OFFLINE: colors.offline,
    offline: colors.offline,
  };

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorMap[status] || colors.offline,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
