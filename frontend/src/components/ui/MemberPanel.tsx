import React, { useMemo } from 'react';
import { useServerStore } from '../../stores/serverStore';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from './ContextMenu';
import { useUiStore } from '../../stores/uiStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../api/client';
import { MemberListSkeleton } from './Skeleton';
import {
  ROLES,
  ROLE_GROUP_ORDER,
  normalizeRole,
  RoleKey
} from '../../config/roles';

import { useProfileStore } from '../../stores/profileStore';
import { buildDmId } from '../../api/dm';

const MOCK_ACTIVITIES: Record<string, { type: 'game' | 'music' | 'video' | 'voice'; name: string }> = {};
const ACTIVITY_META = {
  game: { icon: '🎮' },
  music: { icon: '🎵' },
  video: { icon: '📺' },
  voice: { icon: '🔊' }
};

function resolveAvatar(url?: string | null) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

type MemberLike = {
  id: string;
  role?: string;
  nick?: string | null;
  user?: {
    id?: string;
    username?: string;
    status?: string;
    avatarUrl?: string | null;
    role?: string;
  };
};

const MemberPanel: React.FC<{ empty?: boolean }> = ({ empty }) => {
  const { selectedServer } = useServerStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const memberMenu = useContextMenu();
  const profile = useProfileStore();
  const voice = useVoiceStore();
  const myUserId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id; } catch { return ''; }
  })();

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
          ]
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
      { id: 'profile', label: 'View Profile', icon: '👤', onClick: () => {
        const u = member.user || member;
        useUiStore.getState().openProfilePopup(u, { x: 300, y: 200 });
      }},
      { id: 'msg', label: 'Send Message', icon: '💬', onClick: () => {
        const memberId = member.user?.id;
        if (myUserId && memberId) {
          navigate(`/dm/${buildDmId(myUserId, memberId)}`);
        } else {
          addToast('Cannot open this conversation.', 'error');
        }
      }},
      { id: 'd1', label: '', divider: true },
      { id: 'call', label: 'Call', icon: '📞', onClick: () => addToast('Voice call — Phase 7.', 'info') },
      {
        id: 'block',
        label: 'Block User',
        icon: '🚫',
        danger: true,
        onClick: async () => {
          if (!window.confirm(`Block ${username}? They won't be able to DM you.`)) return;
          const token = localStorage.getItem('vox_token');
          try {
            const res = await fetch(`${API_BASE}/api/blocks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: member.user?.id })
            });
            if (!res.ok) throw new Error('Failed');
            addToast(`${username} blocked.`, 'success');
          } catch (e) {
            addToast('Failed to block user.', 'error');
          }
        }
      },
      ...(canMod
        ? [
            { id: 'd2', label: '', divider: true },
            { id: 'roles', label: 'Manage Roles', icon: '🎭', onClick: () => navigate('/server-settings/' + (selectedServer?.id || '')) },
            {
              id: 'nick',
              label: 'Change Nickname',
              icon: '✏️',
              onClick: async () => {
                const newNick = prompt(`Set nickname for ${username}:`, member.nick || '');
                if (newNick === null) return;
                const token = localStorage.getItem('vox_token');
                try {
                  const res = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/members/${member.user?.id}/nickname`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nick: newNick })
                  });
                  if (!res.ok) throw new Error('Failed');
                  addToast(`Nickname updated to "${newNick || '(none)'}"`, 'success');
                } catch (e) {
                  addToast('Failed to change nickname.', 'error');
                }
              }
            },
            {
              id: 'ban',
              label: 'Ban Member',
              icon: '🚫',
              danger: true,
              onClick: async () => {
                if (!window.confirm(`Ban ${username}? They won't be able to rejoin.`)) return;
                const token = localStorage.getItem('vox_token');
                try {
                  const res = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/bans`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: member.user?.id })
                  });
                  if (!res.ok) throw new Error('Failed');
                  addToast(`${username} banned.`, 'success');
                } catch (e) {
                  addToast('Failed to ban user.', 'error');
                }
              }
            },
            { id: 'mute', label: 'Mute Member', icon: '🔇', onClick: () => addToast('Muted.', 'info') },
            { id: 'deafen', label: 'Deafen Member', icon: '🔕', onClick: () => addToast('Deafened.', 'info') },
            { id: 'd3', label: '', divider: true },
            { id: 'warn', label: 'Warn Member', icon: '⚠️', onClick: () => addToast('Warned.', 'info') },
            {
              id: 'timeout',
              label: 'Timeout Member',
              icon: '⏱️',
              submenu: [
                { id: 't1', label: '1 minute', onClick: async () => { const r = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/timeout/${member.user?.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: 1 }) }); r.ok ? addToast(`${username} timed out for 1 minute.`, 'success') : addToast('Failed to timeout.', 'error'); } },
                { id: 't5', label: '5 minutes', onClick: async () => { const r = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/timeout/${member.user?.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: 5 }) }); r.ok ? addToast(`${username} timed out for 5 minutes.`, 'success') : addToast('Failed to timeout.', 'error'); } },
                { id: 't15', label: '15 minutes', onClick: async () => { const r = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/timeout/${member.user?.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: 15 }) }); r.ok ? addToast(`${username} timed out for 15 minutes.`, 'success') : addToast('Failed to timeout.', 'error'); } },
                { id: 't60', label: '1 hour', onClick: async () => { const r = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/timeout/${member.user?.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: 60 }) }); r.ok ? addToast(`${username} timed out for 1 hour.`, 'success') : addToast('Failed to timeout.', 'error'); } },
                { id: 't1440', label: '1 day', onClick: async () => { const r = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/timeout/${member.user?.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: 1440 }) }); r.ok ? addToast(`${username} timed out for 1 day.`, 'success') : addToast('Failed to timeout.', 'error'); } },
                { id: 't0', label: 'Remove Timeout', onClick: async () => { const r = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/timeout/${member.user?.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: 0 }) }); r.ok ? addToast(`Timeout removed for ${username}.`, 'success') : addToast('Failed to remove timeout.', 'error'); }, danger: true },
              ]
            },
            {
              id: 'kick',
              label: 'Kick Member',
              icon: '👢',
              danger: true,
              onClick: async () => {
                if (!window.confirm(`Kick ${username}?`)) return;
                const token = localStorage.getItem('vox_token');
                try {
                  const res = await fetch(`${API_BASE}/api/servers/${selectedServer?.id}/kick/${member.user?.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  if (!res.ok) throw new Error('Failed');
                  addToast(`${username} kicked.`, 'success');
                } catch (e) {
                  addToast('Failed to kick user.', 'error');
                }
              }
            },
          ]
        : [])
    ];
  };

  const buildMemberBuckets = () => {
    if (!selectedServer) return { buckets: {}, counts: {} };

    const buckets: Record<string, MemberLike[]> = {
      OWNER: [],
      FOUNDER: [],
      ADMIN: [],
      MODERATOR: [],
      MEMBER: [],
      OFFLINE: []
    };

    selectedServer.members.forEach((member) => {
      const user = member.user || {};
      const status = String(user.status || 'offline').toLowerCase();
      const key = status === 'online' || status === 'idle' || status === 'dnd'
        ? normalizeRole(member.role || user.role || 'MEMBER')
        : 'OFFLINE';
      if (key === 'OFFLINE') return;
      buckets[key].push(member);
    });

    const statusRank: Record<string, number> = { online: 0, idle: 1, dnd: 2 };
    for (const key of Object.keys(buckets)) {
      if (key === 'OFFLINE') continue;
      buckets[key].sort((a, b) => {
        const aIsMe = a.user?.id === myUserId;
        const bIsMe = b.user?.id === myUserId;
        const sa = aIsMe ? profile.userStatus : String(a.user?.status || '').toLowerCase();
        const sb = bIsMe ? profile.userStatus : String(b.user?.status || '').toLowerCase();
        const ra = statusRank[sa] ?? 3;
        const rb = statusRank[sb] ?? 3;
        if (ra !== rb) return ra - rb;
        return String(a.user?.username || '').localeCompare(String(b.user?.username || ''));
      });
    }

    const counts: Record<string, number> = {};
    for (const key of Object.keys(buckets)) counts[key] = buckets[key].length;
    return { buckets, counts };
  };

  const { buckets, counts } = useMemo(buildMemberBuckets, [selectedServer, profile.userStatus, myUserId]);

  if (empty || !selectedServer) return <div className="member-panel"></div>;

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
            <div key={key} style={{ marginBottom: '16px' }}>
              <h3
                className="member-group-header"
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: headerColor,
                  padding: '8px 8px 4px',
                  textTransform: 'uppercase',
                  opacity: 0.8
                }}
              >
                {headerLabel}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {members.map((member) => {
                  const user = member.user || {};
                  const isMe = user.id === myUserId;
                  const avatarUrl = resolveAvatar(user.avatarUrl);
                  const status = isMe ? profile.userStatus : String(user.status || 'offline').toLowerCase();
                  const role = normalizeRole(member.role || user.role);
                  const activity = user.id ? MOCK_ACTIVITIES[user.id] : undefined;
                  const statusColor = status === 'online' ? '#3ba55c' : status === 'idle' ? '#faa61a' : status === 'dnd' ? '#ed4245' : '#747f8d';
                  return (
                    <div
                      key={member.id}
                      className="member-row-polished"
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
                        gap: '10px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        opacity: isOffline ? 0.35 : 1,
                        transition: 'background 0.1s',
                        minHeight: '40px'
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {/* Avatar with status dot — hex shield frame */}
                      <div style={{ position: 'relative', width: '34px', height: '34px', flexShrink: 0 }}>
                        <div className={`member-avatar-frame ${status === 'online' ? 'online' : ''}`}>
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" />
                          ) : (
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--ghost-white)', fontWeight: 700, fontSize: '13px'
                            }}>
                              {String(user.username || '?').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Status dot — bottom-right */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 1,
                            right: 2,
                            width: '11px',
                            height: '11px',
                            borderRadius: '50%',
                            background: statusColor,
                            border: '2.5px solid var(--abyss)',
                            zIndex: 1
                          }}
                        />
                      </div>

                      {/* Name and info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: isMe ? 600 : 500,
                          color: isOffline ? 'var(--shadow)' : ROLES[role].color,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: '32px'
                        }}>
                          {user.username || 'Unknown'}
                          {isMe && <span style={{ fontSize: '11px', color: 'var(--shadow)', fontStyle: 'italic', marginLeft: '4px' }}>(you)</span>}
                        </div>
                        {activity && !isOffline && (
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--shadow)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '-4px'
                          }}>
                            {ACTIVITY_META[activity.type].icon} {activity.name}
                          </div>
                        )}
                      </div>
                    </div>
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