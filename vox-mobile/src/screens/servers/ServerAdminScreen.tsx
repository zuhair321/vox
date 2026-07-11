// Vox Mobile — Server Admin Screen (Roles, Bans, Audit Log, Invites, Channels, Webhooks)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  ArrowLeft, Shield, Ban, ClipboardList, Link2, Hash,
  Plus, Copy, ChevronRight, Users, AlertCircle, Check,
  Trash2, Pencil, TrendingUp,
} from 'lucide-react-native';
import { Webhook as WebhookIcon } from 'lucide-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ServerStackParamList } from '../../navigation/ServerStack';
import { api } from '../../api/client';
import { createInvite, fetchServerInvites, revokeInvite } from '../../api/invites';
import {
  fetchWebhooks, createWebhook, updateWebhook, deleteWebhook,
  type Webhook,
} from '../../api/servers';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { timeAgo } from '../../utils/timeAgo';

type RouteParams = { serverId: string; serverName: string; channelId?: string; channelName?: string };

type AdminTab = 'roles' | 'bans' | 'audit' | 'invites' | 'channels' | 'webhooks' | 'insights';

interface Role { id: string; name: string; color: string; permissions: Record<string, boolean>; memberCount: number; position: number; }
interface Ban { userId: string; userName: string; avatar?: string; reason?: string; bannedAt: string; bannedBy: string; }
interface AuditEntry { id: string; action: string; userId: string; userName: string; target?: string; details?: string; createdAt: string; }
interface Invite { id: string; code: string; uses: number; maxUses: number; expiresAt: string | null; createdAt: string; inviterName?: string; }
interface Channel { id: string; name: string; type: 'text' | 'voice' | 'category'; position: number; }

function TabButton({ tab, active, label, Icon }: { tab: AdminTab; active: boolean; label: string; Icon: any }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={() => {}}
    >
      <Icon size={15} color={active ? colors.white : colors.textMuted} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RolesTab({ serverId }: { serverId: string }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/servers/${serverId}/roles`).then((data: any) => {
      setRoles(data.sort((a: Role, b: Role) => a.position - b.position));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;
  return (
    <FlatList
      data={roles}
      keyExtractor={r => r.id}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.listItem}>
          <View style={[styles.roleColorDot, { backgroundColor: item.color || colors.accent }]} />
          <View style={styles.listItemBody}>
            <Text style={styles.listItemTitle}>{item.name}</Text>
            <Text style={styles.listItemSub}>{item.memberCount} members</Text>
          </View>
          <ChevronRight size={18} color={colors.textDim} />
        </TouchableOpacity>
      )}
    />
  );
}

function BansTab({ serverId }: { serverId: string }) {
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/servers/${serverId}/bans`).then((data: any) => setBans(data)).catch(() => {}).finally(() => setLoading(false));
  }, [serverId]);

  const handleUnban = (userId: string) => {
    Alert.alert('Unban', `Remove this user's ban?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unban', style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/servers/${serverId}/bans/${userId}`, { method: 'DELETE' });
            setBans(prev => prev.filter(b => b.userId !== userId));
          } catch (e) { Alert.alert('Error', 'Could not unban user.'); }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;
  if (bans.length === 0) return (
    <View style={styles.emptyCenter}>
      <Ban size={40} color={colors.textDim} />
      <Text style={styles.emptyText}>No banned users</Text>
    </View>
  );
  return (
    <FlatList
      data={bans}
      keyExtractor={b => b.userId}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          <View style={styles.avatarCircle}>
            <Text style={{ color: colors.text }}>{(item.userName || '?').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.listItemBody}>
            <Text style={styles.listItemTitle}>{item.userName}</Text>
            {item.reason && <Text style={styles.listItemSub}>Reason: {item.reason}</Text>}
            <Text style={styles.listItemSub}>Banned {timeAgo(item.bannedAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => handleUnban(item.userId)} style={styles.unbanBtn}>
            <Text style={styles.unbanBtnText}>Unban</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

function AuditTab({ serverId }: { serverId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/servers/${serverId}/audit`).then((data: any) => setEntries(data)).catch(() => {}).finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;
  if (entries.length === 0) return (
    <View style={styles.emptyCenter}>
      <ClipboardList size={40} color={colors.textDim} />
      <Text style={styles.emptyText}>No audit entries</Text>
    </View>
  );
  return (
    <FlatList
      data={entries}
      keyExtractor={e => e.id}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          <View style={styles.auditIcon}>
            <AlertCircle size={16} color={colors.accent} />
          </View>
          <View style={styles.listItemBody}>
            <Text style={styles.listItemTitle}>
              <Text style={{ fontWeight: '700' }}>{item.userName}</Text>
              {' '}{item.action}
              {item.target ? ` ${item.target}` : ''}
            </Text>
            {item.details && <Text style={styles.listItemSub}>{item.details}</Text>}
            <Text style={styles.listItemSub}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      )}
    />
  );
}

function InvitesTab({ serverId }: { serverId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetchServerInvites(serverId).then(setInvites).catch(() => {}).finally(() => setLoading(false));
  }, [serverId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createInvite(serverId);
      await load();
    } catch { Alert.alert('Error', 'Could not create invite.'); }
    finally { setCreating(false); }
  };

  const handleRevoke = (code: string) => {
    Alert.alert('Revoke Invite', 'This invite will stop working immediately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        try { await revokeInvite(code); setInvites(prev => prev.filter(i => i.code !== code)); }
        catch { Alert.alert('Error', 'Could not revoke invite.'); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
        <Plus size={18} color={colors.white} />
        <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Invite'}</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : invites.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Link2 size={40} color={colors.textDim} />
          <Text style={styles.emptyText}>No invites yet</Text>
        </View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={i => i.code}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.avatarCircle}><Link2 size={16} color={colors.accent} /></View>
              <View style={styles.listItemBody}>
                <Text style={styles.inviteCode}>{item.code}</Text>
                <Text style={styles.listItemSub}>
                  {item.uses}/{item.maxUses === 0 ? '∞' : item.maxUses} uses
                  {item.expiresAt ? ` · expires ${timeAgo(item.expiresAt)}` : ' · never expires'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRevoke(item.code)}>
                <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Revoke</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

function ChannelsTab({ serverId }: { serverId: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/servers/${serverId}/channels`).then((data: any) => {
      setChannels(data.sort((a: Channel, b: Channel) => {
        if (a.type === 'category' && b.type !== 'category') return -1;
        if (a.type !== 'category' && b.type === 'category') return 1;
        return a.position - b.position;
      }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;
  return (
    <FlatList
      data={channels}
      keyExtractor={c => c.id}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          <Hash size={18} color={item.type === 'voice' ? colors.success : colors.textMuted} />
          <View style={styles.listItemBody}>
            <Text style={[styles.listItemTitle, item.type === 'category' && { fontWeight: '800' }]}>
              {item.name}
            </Text>
            <Text style={styles.listItemSub}>{item.type === 'voice' ? 'Voice' : item.type === 'category' ? 'Category' : 'Text'}</Text>
          </View>
        </View>
      )}
    />
  );
}

function WebhooksTab({ serverId }: { serverId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchWebhooks(serverId).then((res: any) => setWebhooks(res.webhooks || [])).catch(() => {}).finally(() => setLoading(false));
  }, [serverId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setName('');
    setUrl('');
    setEditing(null);
    setShowCreate(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !editing?.channelId) return;
    setSaving(true);
    try {
      if (editing.id) {
        await updateWebhook(serverId, editing.id, { name: name.trim(), url: url.trim() || undefined });
      } else {
        await createWebhook(serverId, { name: name.trim(), channelId: editing.channelId, url: url.trim() || undefined });
      }
      resetForm();
      load();
    } catch { Alert.alert('Error', 'Could not save webhook.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (webhook: Webhook) => {
    Alert.alert('Delete Webhook', `Delete "${webhook.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteWebhook(serverId, webhook.id); load(); }
          catch { Alert.alert('Error', 'Could not delete webhook.'); }
        },
      },
    ]);
  };

  const handleEdit = (webhook: Webhook) => {
    setEditing(webhook);
    setName(webhook.name);
    setUrl(webhook.url || '');
    setShowCreate(true);
  };

  const copyToken = (token: string) => {
    Alert.alert('Copied', 'Webhook token copied to clipboard.');
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;
  if (webhooks.length === 0 && !showCreate) return (
    <View style={styles.emptyCenter}>
      <WebhookIcon size={40} color={colors.textDim} />
      <Text style={styles.emptyText}>No webhooks yet</Text>
      <Text style={styles.emptySubtext}>Create a webhook to post messages from external services</Text>
      <TouchableOpacity style={styles.createBtn} onPress={() => { setEditing({ id: '', name: '', channelId: '', url: '', token: '', createdAt: '' } as any); setName(''); setUrl(''); setShowCreate(true); }}>
        <Plus size={18} color={colors.white} />
        <Text style={styles.createBtnText}>Create Webhook</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {webhooks.length > 0 && (
        <FlatList
          data={webhooks}
          keyExtractor={w => w.id}
          contentContainerStyle={{ paddingBottom: showCreate ? 320 : 40 }}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.avatarCircle}><WebhookIcon size={16} color={colors.accent} /></View>
              <View style={styles.listItemBody}>
                <Text style={styles.listItemTitle}>{item.name}</Text>
                <Text style={styles.listItemSub} numberOfLines={1}>
                  {item.url || 'No URL'} · Token: {item.token.slice(0, 8)}...
                </Text>
              </View>
              <TouchableOpacity onPress={() => copyToken(item.token)} style={styles.iconBtn}>
                <Copy size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
                <Pencil size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={resetForm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editing?.id ? 'Edit Webhook' : 'Create Webhook'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Webhook name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Channel ID"
              placeholderTextColor={colors.textMuted}
              value={editing?.channelId || ''}
              onChangeText={(val: string) => setEditing((prev: Webhook | null) => prev ? { ...prev, channelId: val } : prev)}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Webhook URL (optional)"
              placeholderTextColor={colors.textMuted}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={resetForm}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSave} disabled={saving}>
                <Text style={styles.modalBtnTextSave}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InsightsNav({ serverId, serverName }: { serverId: string; serverName: string }) {
  const navigation = useNavigation();
  return (
    <View style={styles.emptyCenter}>
      <TrendingUp size={40} color={colors.textDim} />
      <Text style={styles.emptyText}>Server Insights</Text>
      <Text style={styles.emptySubtext}>View analytics, top channels, and member activity</Text>
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => (navigation as any).navigate('ServerInsights', { serverId, serverName })}
      >
        <TrendingUp size={18} color={colors.white} />
        <Text style={styles.createBtnText}>View Insights</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ServerAdminScreen() {
  const route = useRoute<RouteProp<{ ServerAdmin: RouteParams }, 'ServerAdmin'>>();
  const navigation = useNavigation();
  const { serverId, serverName } = route.params;
  const [tab, setTab] = useState<AdminTab>('invites');

  const TABS: { key: AdminTab; label: string; icon: any }[] = [
    { key: 'invites', label: 'Invites', icon: Link2 },
    { key: 'roles', label: 'Roles', icon: Shield },
    { key: 'bans', label: 'Bans', icon: Ban },
    { key: 'audit', label: 'Audit', icon: ClipboardList },
    { key: 'channels', label: 'Channels', icon: Hash },
    { key: 'webhooks', label: 'Webhooks', icon: WebhookIcon },
    { key: 'insights', label: 'Insights', icon: TrendingUp },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{serverName}</Text>
          <Text style={styles.subtitle}>Server Settings</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Icon size={15} color={tab === t.key ? colors.white : colors.textMuted} />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <View style={styles.tabContent}>
        {tab === 'roles' && <RolesTab serverId={serverId} />}
        {tab === 'bans' && <BansTab serverId={serverId} />}
        {tab === 'audit' && <AuditTab serverId={serverId} />}
        {tab === 'invites' && <InvitesTab serverId={serverId} />}
        {tab === 'channels' && <ChannelsTab serverId={serverId} />}
        {tab === 'webhooks' && <WebhooksTab serverId={serverId} />}
        {tab === 'insights' && <InsightsNav serverId={serverId} serverName={serverName} />}
      </View>
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
  tabBar: {
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    maxHeight: 50,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  tabContent: { flex: 1 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  listItemBody: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  listItemSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyCenter: { alignItems: 'center', marginTop: 60, gap: spacing.md },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
  emptyText: { fontSize: 14, color: colors.textMuted },
  roleColorDot: { width: 12, height: 12, borderRadius: 6 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgTertiary,
    justifyContent: 'center', alignItems: 'center',
  },
  unbanBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm, backgroundColor: colors.bgTertiary,
  },
  unbanBtnText: { color: colors.accent, fontWeight: '600', fontSize: 12 },
  auditIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.accent + '22', justifyContent: 'center', alignItems: 'center',
  },
  inviteCode: { fontSize: 13, fontFamily: 'monospace', color: colors.accent, fontWeight: '600' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    margin: spacing.md, padding: spacing.md,
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
  },
  createBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  iconBtn: { padding: spacing.xs },
  modalOverlay: {
    flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgSecondary, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg, gap: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  input: {
    backgroundColor: colors.bgTertiary, borderRadius: borderRadius.md, padding: spacing.md,
    color: colors.text, fontSize: fontSize.md, borderWidth: 1, borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: colors.bgTertiary },
  modalBtnSave: { backgroundColor: colors.accent },
  modalBtnTextCancel: { color: colors.textMuted, fontWeight: '600' },
  modalBtnTextSave: { color: colors.white, fontWeight: '700' },
});
