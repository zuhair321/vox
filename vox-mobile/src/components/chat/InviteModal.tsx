// Vox Mobile — Invite Modal (display + share invite link)

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Share, ActivityIndicator, Clipboard, Alert,
} from 'react-native';
import { X, Link2, Copy, Check, RefreshCw } from 'lucide-react-native';
import { fetchServerInvites, createInvite } from '../../api/invites';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { timeAgo } from '../../utils/timeAgo';
import { API_BASE } from '../../api/client';

interface InviteModalProps {
  visible: boolean;
  serverId: string;
  serverName: string;
  onClose: () => void;
}

interface Invite {
  code: string;
  uses: number;
  maxUses: number;
  expiresAt: string | null;
  createdAt: string;
}

export function InviteModal({ visible, serverId, serverName, onClose }: InviteModalProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchServerInvites(serverId)
        .then(setInvites)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible, serverId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const newInvites = await createInvite(serverId);
      setInvites(prev => [newInvites, ...prev]);
    } catch { Alert.alert('Error', 'Could not create invite.'); }
    finally { setCreating(false); }
  };

  const inviteUrl = (code: string) => `https://vox.app/invite/${code}`;

  const handleCopy = (code: string) => {
    // Use Share as fallback for copy (Clipboard not universally available)
    Share.share({ message: inviteUrl(code) }).catch(() => {
      Alert.alert('Link', inviteUrl(code));
    });
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async (code: string) => {
    try {
      await Share.share({ message: `Join ${serverName} on VOX!\n${inviteUrl(code)}` });
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Invite Friends</Text>
              <Text style={styles.subtitle}>to {serverName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Create */}
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
            <Link2 size={18} color={colors.white} />
            <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Invite Link'}</Text>
          </TouchableOpacity>

          {/* List */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
          ) : invites.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No invite links yet — create one above</Text>
            </View>
          ) : (
            invites.map(invite => (
              <View key={invite.code} style={styles.inviteRow}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteCode}>{invite.code}</Text>
                  <Text style={styles.inviteMeta}>
                    {invite.uses}/{invite.maxUses === 0 ? '∞' : invite.maxUses} uses
                    {invite.expiresAt ? ` · expires ${timeAgo(invite.expiresAt)}` : ' · never expires'}
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(invite.code)}>
                    {copied === invite.code
                      ? <Check size={18} color={colors.success} />
                      : <Copy size={18} color={colors.textMuted} />
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(invite.code)}>
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.xl, paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  closeBtn: { padding: spacing.xs },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  createBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  inviteInfo: { flex: 1 },
  inviteCode: { fontSize: 13, fontFamily: 'monospace', color: colors.accent, fontWeight: '600' },
  inviteMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  inviteActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  shareBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.bgTertiary, borderRadius: borderRadius.sm,
  },
  shareBtnText: { color: colors.text, fontWeight: '600', fontSize: 12 },
});
