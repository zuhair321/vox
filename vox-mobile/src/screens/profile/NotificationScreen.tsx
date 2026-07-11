// Vox Mobile — Notifications Screen

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, CheckCheck, Trash2, AtSign, MessageSquare, AlertCircle } from 'lucide-react-native';
import { useNotificationStore } from '../../stores/notificationStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { timeAgo } from '../../utils/timeAgo';
import type { VoxNotification } from '../../stores/notificationStore';

const TYPE_ICONS: Record<string, any> = {
  mention: AtSign,
  dm: MessageSquare,
  system: Bell,
  warning: AlertCircle,
  error: AlertCircle,
};

function NotificationItem({ item, onPress }: { item: VoxNotification; onPress: () => void }) {
  const Icon = TYPE_ICONS[item.type] || Bell;
  return (
    <TouchableOpacity style={[styles.notifItem, !item.read && styles.notifUnread]} onPress={onPress}>
      <View style={[styles.notifIconBox, { backgroundColor: item.read ? colors.bgTertiary : colors.accent + '22' }]}>
        <Icon size={18} color={item.read ? colors.textMuted : colors.accent} />
      </View>
      <View style={styles.notifBody}>
        <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>{item.title}</Text>
        {item.preview && <Text style={styles.notifPreview} numberOfLines={2}>{item.preview}</Text>}
        <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export function NotificationScreen() {
  const navigation = useNavigation();
  const {
    isLoading, filter, unreadCount,
    init, markRead, markAllRead, clearAll,
    setFilter, getFiltered,
  } = useNotificationStore();

  useEffect(() => { init(); }, []);

  const notifications = getFiltered();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
              <CheckCheck size={20} color={colors.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearAll} style={styles.headerBtn}>
            <Trash2 size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'mentions', 'unreads'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
            {f === 'unreads' && unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={48} color={colors.textDim} />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={() => markRead(item.id)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, paddingTop: spacing.xl + 20,
    backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  title: { flex: 1, fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerBtn: { padding: spacing.xs },
  filters: {
    flexDirection: 'row', padding: spacing.md, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bgTertiary, borderRadius: borderRadius.md,
  },
  filterChipActive: { backgroundColor: colors.accent },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: colors.white },
  badge: {
    backgroundColor: colors.accent, borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  notifItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  notifUnread: { backgroundColor: colors.bgSecondary },
  notifIconBox: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  notifTitleUnread: { color: colors.text },
  notifPreview: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  notifTime: { fontSize: 11, color: colors.textDim, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent,
  },
  empty: { alignItems: 'center', marginTop: 80, gap: spacing.md },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
