// Vox Mobile — Invite Accept Screen

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { resolveInvite, joinByInvite } from '../../api/invites';
import { useServerStore } from '../../stores/serverStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { API_BASE } from '../../api/client';
import { ArrowLeft, Users } from 'lucide-react-native';

type RouteParams = { code: string };

export function InviteAcceptScreen() {
  const route = useRoute<RouteProp<{ InviteAccept: RouteParams }, 'InviteAccept'>>();
  const navigation = useNavigation();
  const { fetchServers } = useServerStore();
  const code = route.params?.code || '';

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      setError('No invite code provided.');
      setLoading(false);
      return;
    }
    resolveInvite(code)
      .then(data => { setInvite(data); setLoading(false); })
      .catch((e: any) => { setError(e?.message || 'Invalid or expired invite.'); setLoading(false); });
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    try {
      const data = await joinByInvite(code);
      await fetchServers();
      const server = data?.server;
      if (server?.id) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{
              name: 'MainTabs',
              state: {
                routes: [{ name: 'Servers' }],
              },
            }],
          }),
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to join server.');
    } finally {
      setJoining(false);
    }
  };

  const serverBanner = invite?.server?.banner
    ? (invite.server.banner.startsWith('http') ? invite.server.banner : `${API_BASE}${invite.server.banner}`)
    : null;
  const serverIcon = invite?.server?.icon
    ? (invite.server.icon.startsWith('http') ? invite.server.icon : `${API_BASE}${invite.server.icon}`)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Invite</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorIcon}>🔒</Text>
            <Text style={styles.errorTitle}>INVITE INVALID</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : invite ? (
          <View style={styles.card}>
            {serverBanner && (
              <Image source={{ uri: serverBanner }} style={styles.banner} />
            )}
            <View style={[styles.serverIconBox, serverBanner ? styles.iconOverBanner : {}]}>
              {serverIcon ? (
                <Image source={{ uri: serverIcon }} style={styles.serverIcon} />
              ) : (
                <Text style={styles.serverInitial}>
                  {invite.server.name.slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.serverName}>{invite.server.name}</Text>
            {invite.server.description && (
              <Text style={styles.serverDesc}>{invite.server.description}</Text>
            )}
            <View style={styles.memberRow}>
              <Users size={14} color={colors.textMuted} />
              <Text style={styles.memberCount}>{invite.server.memberCount} members</Text>
            </View>
            <TouchableOpacity
              style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              <Text style={styles.joinBtnText}>{joining ? 'Joining...' : 'Join Server'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
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
  title: { flex: 1, fontSize: fontSize.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  placeholder: { width: 32 },
  content: { flexGrow: 1, padding: spacing.xl },
  loader: { marginTop: 80 },
  centerBox: { alignItems: 'center', marginTop: 80, gap: spacing.md },
  errorIcon: { fontSize: 48, opacity: 0.3 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  errorMsg: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  backButton: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.bgTertiary, borderRadius: borderRadius.md },
  backButtonText: { color: colors.accent, fontWeight: '600' },
  card: { alignItems: 'center', gap: spacing.md },
  banner: { width: '100%', height: 120, borderRadius: borderRadius.md, marginBottom: -30 },
  serverIconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', borderWidth: 4, borderColor: colors.bg,
    zIndex: 1,
  },
  iconOverBanner: { marginTop: -20 },
  serverIcon: { width: '100%', height: '100%' },
  serverInitial: { color: colors.white, fontSize: 28, fontWeight: '800' },
  serverName: { fontSize: 20, fontWeight: '700', color: colors.text },
  serverDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  memberCount: { fontSize: 12, color: colors.textMuted },
  joinBtn: {
    width: '100%', backgroundColor: colors.accent, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.md,
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
