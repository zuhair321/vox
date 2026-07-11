// Vox Mobile — Profile Screen

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { Avatar } from '../../components/common/Avatar';
import { StatusDot } from '../../components/common/StatusDot';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Settings,
  LogOut,
  Shield,
  Bell,
  Palette,
  ChevronRight,
} from 'lucide-react-native';
import type { ProfileStackParamList } from '../../navigation/ProfileStack';

const STATUS_OPTIONS = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'DND', label: 'Do Not Disturb' },
  { value: 'OFFLINE', label: 'Invisible' },
] as const;

export function ProfileScreen() {
  const user = useAuthStore(s => s.user);
  const { logout, updateUser } = useAuthStore();
  const disconnect = useSocketStore(s => s.disconnect);
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { unreadCount, init } = useNotificationStore();

  useEffect(() => { init(); }, []);

  const handleStatusChange = () => {
    Alert.alert(
      'Set Status',
      'Choose your status',
      STATUS_OPTIONS.map(opt => ({
        text: opt.label,
        onPress: () => updateUser({ status: opt.value }),
      }))
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          disconnect();
          await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  const menuItems = [
    {
      icon: <Shield size={20} color={colors.textMuted} />,
      label: 'Account & Security',
      subtitle: 'Password, 2FA, email',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: <Bell size={20} color={colors.textMuted} />,
      label: 'Notifications',
      subtitle: 'Push, sounds, badges',
      badge: unreadCount > 0 ? unreadCount : undefined,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: <Palette size={20} color={colors.textMuted} />,
      label: 'Appearance',
      subtitle: 'Theme, font size',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: <Settings size={20} color={colors.textMuted} />,
      label: 'Settings',
      subtitle: 'Server URL, voice, chat',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarSection}>
          <Avatar
            uri={user.avatarUrl}
            name={user.displayName || user.username}
            color={user.color}
            size={80}
          />
          <View style={styles.nameSection}>
            <Text style={styles.displayName}>
              {user.displayName || user.username}
            </Text>
            <Text style={styles.username}>@{user.username}</Text>
          </View>
        </View>

        {user.bio && (
          <Text style={styles.bio}>{user.bio}</Text>
        )}

        <TouchableOpacity style={styles.statusRow} onPress={handleStatusChange}>
          <StatusDot status={user.status} size={14} />
          <Text style={styles.statusText}>
            {STATUS_OPTIONS.find(s => s.value === user.status)?.label || 'Online'}
          </Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            {item.icon}
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            {item.badge ? (
              <View style={styles.badge}><Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text></View>
            ) : (
              <ChevronRight size={18} color={colors.textDim} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>VOX Mobile v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  profileHeader: {
    padding: spacing.xl,
    paddingTop: spacing.xxxl + 20,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  nameSection: {
    flex: 1,
  },
  displayName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  username: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
  menu: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textDim,
  },
});
