// Vox Mobile — Server Insights Screen

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ServerStackParamList } from '../../navigation/ServerStack';
import { ArrowLeft, TrendingUp, Users, MessageSquare, UserPlus, Hash, BarChart3 } from 'lucide-react-native';
import { api } from '../../api/client';
import { fetchInsights, type InsightsData } from '../../api/servers';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';

type Route = RouteProp<ServerStackParamList, 'ServerInsights'>;

type Period = '7d' | '30d' | '90d';

export function ServerInsightsScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { serverId, serverName } = route.params;
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInsights(serverId, period);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [serverId, period]);

  useEffect(() => { load(); }, [load]);

  const StatCard = ({ label, value, icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        {React.createElement(icon, { size: 20, color })}
      </View>
      <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{serverName}</Text>
          <Text style={styles.subtitle}>Server Insights</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodBar}>
        {(['7d', '30d', '90d'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard label="Total Members" value={data.totalMembers} icon={Users} color={colors.accent} />
            <StatCard label="Active Members" value={data.activeMembers} icon={TrendingUp} color={colors.success} />
            <StatCard label="Messages" value={data.periodMessages} icon={MessageSquare} color={colors.admin} />
            <StatCard label="New Joins" value={data.newJoins} icon={UserPlus} color={colors.moderator} />
          </View>

          {/* Channel activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Hash size={18} color={colors.textMuted} />
              <Text style={styles.sectionTitle}>Most Active Channels</Text>
            </View>
            {data.channelActivity.length === 0 ? (
              <Text style={styles.emptyText}>No activity in this period</Text>
            ) : (
              data.channelActivity.map((ch, idx) => (
                <View key={ch.channelId} style={styles.channelRow}>
                  <Text style={styles.channelRank}>{idx + 1}</Text>
                  <Text style={styles.channelName}>{ch.name}</Text>
                  <View style={styles.channelBarContainer}>
                    <View
                      style={[
                        styles.channelBar,
                        {
                          width: `${Math.min(100, (ch.count / (data.channelActivity[0]?.count || 1)) * 100)}%`,
                          backgroundColor: colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.channelCount}>{ch.count}</Text>
                </View>
              ))
            )}
          </View>

          {/* Top members */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={18} color={colors.textMuted} />
              <Text style={styles.sectionTitle}>Top Members</Text>
            </View>
            {data.topMembers.length === 0 ? (
              <Text style={styles.emptyText}>No messages yet</Text>
            ) : (
              data.topMembers.map((m, idx) => (
                <View key={m.userId} style={styles.memberRow}>
                  <Text style={styles.memberRank}>{idx + 1}</Text>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{(m.username || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.memberName}>{m.username}</Text>
                  <Text style={styles.memberCount}>{m.count} msgs</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.emptyText}>No insights data</Text>
        </View>
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
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  periodBar: {
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    maxHeight: 44,
  },
  periodBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm, marginHorizontal: spacing.xs,
    backgroundColor: colors.bgTertiary,
  },
  periodBtnActive: { backgroundColor: colors.accent },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  periodBtnTextActive: { color: colors.white },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxxl },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.xs,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  section: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  channelRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  channelRank: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, width: 20, textAlign: 'center' },
  channelName: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  channelBarContainer: { width: 80, height: 8, borderRadius: 4, backgroundColor: colors.bgTertiary, overflow: 'hidden' },
  channelBar: { height: '100%', borderRadius: 4 },
  channelCount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, width: 40, textAlign: 'right' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  memberRank: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, width: 20, textAlign: 'center' },
  memberAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent + '33',
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  memberName: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  memberCount: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
