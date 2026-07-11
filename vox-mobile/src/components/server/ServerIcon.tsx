// Vox Mobile — Server Icon component

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../../utils/theme';

interface ServerIconProps {
  uri?: string | null;
  name: string;
  size?: number;
  style?: ViewStyle;
}

export function ServerIcon({ uri, name, size = 48, style }: ServerIconProps) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.icon,
          {
            width: size,
            height: size,
            borderRadius: size / 4,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    backgroundColor: colors.bgTertiary,
  },
  fallback: {
    backgroundColor: colors.accentDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
  },
});
