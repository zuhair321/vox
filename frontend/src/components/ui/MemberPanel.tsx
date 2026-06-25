import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useServerStore } from '../../stores/serverStore';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from './ContextMenu';
import { useUiStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../api/client';
import RoleBadge from './RoleBadge';
import StatusDot from '../void/StatusDot';
import { MemberListSkeleton } from './Skeleton';
import {
  ROLES,
  ROLE_GROUP_ORDER,
  normalizeRole,
  roleGlowShadow,
  RoleKey,
} from '../../config/roles';

const MOCK_ACTIVITIES: Record<string, { type: 'game' | 'music' | 'video' | 'voice'; name: string }> = {};
const ACTIVITY_META = {
  game: { icon: '🎮' },
  music: { icon: '🎵' },
  video: { icon: '📺' },
  voice: { icon: '🔊' },
};

function resolveAvatar(url?: string | null) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

type MemberLike = {
  id: string;
  role?: string;
  user?: {
    id?: string;
    username?: string;
    status?: string;
    avatarUrl?: string | null;
    role?: string;
  };
};

const MemberPanel: React.FC = () => {
  const { selectedServer } = useServerStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const memberMenu = useContextMenu();

  const buildMemberMenu = (member: MemberLike, isSelf: boolean): MenuItem[] => {
    if (isSelf) {
      return [
        { id: 'profile', label: 'View Profile', icon: '👤', onClick: () => navigate('/profile') },
        { id: 'edit', label: 'Edit Profile', icon: '✏️', onClick: () => navigate('/profile') },
        {
          id: 'status',
          label: 'Change Status',
          icon: '🎭',
          submenu: [
            { id: 'online', label: '🟢 Online' },
            { id: 'idle', label: '🟡 Idle' },
            { id: 'dnd', label: '🔴 Do Not Disturb' },
            { id: 'offline', label: '⚫ Invisible' },
          ],
        },
      ];
    }
    const myRole = (() => {
      try {
        const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
        const m = selectedServer?.members.find((x: any) => x.userId === me.id);
        return (m?.role || me?.role || '').toUpperCase();
      } catch { return ''; }
    })();
    const canMod = ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(myRole);
    const username = member.user?.username || 'Unknown';

    return [
      { id: 'profile', label: 'View Profile', icon: '👤', onClick: () => addToast(`Profile for ${username} — coming soon.`, 'info') },
      { id: 'msg', label: 'Send Message', icon: '💬', onClick: () => addToast('DM — coming soon.', 'info') },
      { id: 'd1', label: '', divider: true },
      { id: 'call', label: 'Call', icon: '📞', onClick: () => addToast('Voice call — Phase 7.', 'info') },
      ...(canMod
        ? [
            { id: 'd2', label: '', divider: true },
            { id: 'roles', label: 'Manage Roles', icon: '🎭', onClick: () => addToast('Roles — coming soon.', 'info') },
            { id: 'nick', label: 'Change Nickname', icon: '✏️', onClick: () => addToast('Nicknames — coming soon.', 'info') },
            { id: 'mute', label: 'Mute Member', icon: '🔇', onClick: () => addToast('Muted.', 'info') },
            { id: 'deafen', label: 'Deafen Member', icon: '🔕', onClick: () => addToast('Deafened.', 'info') },
            { id: 'd3', label: '', divider: true },
            { id: 'warn', label: 'Warn Member', icon: '⚠️', onClick: () => addToast('Warned.', 'info') },
            {
              id: 'timeout',
              label: 'Timeout Member',
              icon: '⏱️',
              submenu: [
                { id: 't60', label: '60 seconds', onClick: () => addToast('Timed out 60s.', 'info') },
                { id: 't5', label: '5 minutes', onClick: () => addToast('Timed out 5m.', 'info') },
                { id: 't10', label: '10 minutes', onClick: () => addToast('Timed out 10m.', 'info') },
                { id: 't1h', label: '1 hour', onClick: () => addToast('Timed out 1h.', 'info') },
                { id: 'tc', label: 'Custom...', onClick: () => addToast('Custom timeout — coming soon.', 'info') },
              ],
            },
            { id: 'kick', label: 'Kick Member', icon: '👢', danger: true, onClick: () => addToast('Kick — coming soon.', 'info') },
            { id: 'ban', label: 'Ban Member', icon: '🔨', danger: true, onClick: () => addToast('Ban — coming soon.', 'info') },
            { id: 'd4', label: '', divider: true },
            { id: 'block', label: 'Block User', icon: '🚫', danger: true, onClick: () => addToast('Blocked.', 'info') },
          ]
        : []),
    ];
  };

  const { buckets, counts } = useMemo(() => {
    const empty: Record<string, MemberLike[]> = {};
    for (const key of ROLE_GROUP_ORDER) empty[key] = [];
    if (!selectedServer) return { buckets: empty, counts: {} as Record<string, number> };

    const buckets: Record<string, MemberLike[]> = {};
    for (const key of ROLE_GROUP_ORDER) buckets[key] = [];

    for (const m of selectedServer.members as MemberLike[]) {
      const status = String(m.user?.status || '').toLowerCase();
      if (status === 'offline') {
        buckets.OFFLINE.push(m);
      } else {
        const role = normalizeRole(m.role || m.user?.role);
        buckets[role].push(m);
      }
    }

    const statusRank: Record<string, number> = { online: 0, idle: 1, dnd: 2 };
    for (const key of Object.keys(buckets)) {
      if (key === 'OFFLINE') continue;
      buckets[key].sort((a, b) => {
        const ra = statusRank[String(a.user?.status || '').toLowerCase()] ?? 3;
        const rb = statusRank[String(b.user?.status || '').toLowerCase()] ?? 3;
        if (ra !== rb) return ra - rb;
        return String(a.user?.username || '').localeCompare(String(b.user?.username || ''));
      });
    }

    const counts: Record<string, number> = {};
    for (const key of Object.keys(buckets)) counts[key] = buckets[key].length;
    return { buckets, counts };
  }, [selectedServer]);

  if (!selectedServer) return <div className="member-panel"></div>;

  return (
    <div className="member-panel">
      <div
        className="top-bar"
        style={{ backgroundColor: 'var(--abyss)', borderLeft: '1px solid var(--rim)' }}
      >
        <h2 style={{ fontSize: '16px', color: 'var(--ghost-white)' }}>OPERATIVES</h2>
      </div>

      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        {selectedServer.members.length === 0 && (
          <div className="vox-empty-state" style={{ padding: '32px 16px' }}>
            <div className="vox-empty-icon">👤</div>
            <div className="vox-empty-title">NO OPERATIVES</div>
            <div className="vox-empty-desc">This realm is unoccupied.</div>
          </div>
        )}

        {ROLE_GROUP_ORDER.map((key) => {
          const members = buckets[key] || [];
          if (members.length === 0) return null;

          const isOffline = key === 'OFFLINE';
          const roleKey = (isOffline ? 'MEMBER' : key) as RoleKey;
          const headerColor = isOffline ? 'var(--shadow)' : ROLES[roleKey].color;

          const headerLabel =
            key === 'OWNER' || key === 'FOUNDER'
              ? 'LEADERSHIP'
              : key === 'ADMIN'
              ? 'ADMINISTRATION'
              : key === 'MODERATOR'
              ? 'MODERATORS'
              : key === 'MEMBER'
              ? `MEMBERS — ${counts[key] || 0}`
              : `OFFLINE — ${counts[key] || 0}`;

          return (
            <div key={key} style={{ marginBottom: '20px' }}>
              <h3
                className="member-group-header"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  color: headerColor,
                  padding: '12px 0 6px',
                  textTransform: 'uppercase',
                }}
              >
                {headerLabel}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {members.map((member) => {
                  const user = member.user || {};
                  const avatarUrl = resolveAvatar(user.avatarUrl);
                  const status = String(user.status || 'offline').toLowerCase();
                  const role = normalizeRole(member.role || user.role);
                  const activity = user.id ? MOCK_ACTIVITIES[user.id] : undefined;
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="member-row-polished ripple-container"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        let isSelf = false;
                        try {
                          const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
                          isSelf = member.user?.id === me.id;
                        } catch {}
                        memberMenu.show(e.clientX, e.clientY, buildMemberMenu(member, isSelf));
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        opacity: isOffline ? 0.5 : 1,
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <div
                          className="octagon"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'var(--obsidian)',
                            backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                            backgroundSize: 'cover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--ghost-white)',
                            fontWeight: 800,
                          }}
                        >
                          {!avatarUrl &&
                            String(user.username || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            background: 'var(--abyss)',
                            padding: 1,
                            display: 'flex',
                          }}
                        >
                          <StatusDot status={status} size={10} />
                        </div>
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              color: isOffline ? 'var(--shadow)' : ROLES[role].color,
                              textShadow: isOffline ? 'none' : roleGlowShadow(role),
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {user.username || 'Unknown'}
                          </span>
                          {!isOffline && <RoleBadge role={role} />}
                        </div>
                        {activity && !isOffline && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontStyle: 'italic',
                              color: activity.type === 'voice' ? 'var(--accent)' : 'var(--shadow)',
                            }}
                          >
                            <span aria-hidden="true">{ACTIVITY_META[activity.type].icon}</span>
                            {activity.name}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {memberMenu.contextMenu && (
        <ContextMenu {...memberMenu.contextMenu} onClose={memberMenu.hide} />
      )}
    </div>
  );
};

export default MemberPanel;
