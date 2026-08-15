import React, { useState } from 'react';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useSocketStore } from '../../stores/socketStore';
import { useNavigate } from 'react-router-dom';
import { MicOff, VolumeX, Monitor } from 'lucide-react';
import { API_BASE } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from '../ui/ContextMenu';
import VoiceTimer from '../voice/VoiceTimer';
import { getMicrophoneStream } from '../../utils/webrtc';
import { classifyMediaError } from '../../utils/mediaErrors';
import ChannelSettings from '../server/ChannelSettings';
import ServerLogo from './ServerLogo';
import UserOperativeBar from './UserOperativeBar';

function resolveMediaUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

// ── Channel Row (used by both categorized and uncategorized sections) ──
const ChannelRow: React.FC<{
  channel: any;
  selectedChannel: any;
  unread: Record<string, number>;
  onSelect: (ch: any) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ channel, selectedChannel, unread, onSelect, onContextMenu }) => (
  <div
    className="channel-item ripple-container"
    onClick={() => onSelect(channel)}
    onContextMenu={(e) => { e.preventDefault(); onContextMenu(e); }}
    style={{
      padding: '6px 8px',
      cursor: 'pointer',
      backgroundColor: selectedChannel?.id === channel.id ? 'rgba(216,74,90,0.08)' : 'transparent',
      borderLeft: selectedChannel?.id === channel.id ? '2px solid var(--chaos)' : '2px solid transparent',
      color: selectedChannel?.id === channel.id ? 'var(--ghost-white)' : 'var(--ash)',
      display: 'flex', alignItems: 'center', gap: '8px',
      transition: 'all 0.2s'
    }}
  >
    <span style={{ color: 'var(--shadow)' }}>#</span> {channel.name}
    {unread[channel.id] > 0 && (
      <span style={{
        marginLeft: 'auto',
        background: 'var(--blood)',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        minWidth: '18px',
        height: '18px',
        borderRadius: '9px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 5px',
      }}>
        {unread[channel.id] > 99 ? '99+' : unread[channel.id]}
      </span>
    )}
    {(() => {
      try {
        const setting = JSON.parse(localStorage.getItem('vox_notif_settings') || '{}')[channel.id];
        if (setting === 'none') return <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.5 }}>🔇</span>;
        if (setting === 'mentions') return <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.5 }}>@</span>;
        return null;
      } catch { return null; }
    })()}
  </div>
);

// ── Voice Channel Row ──
const VoiceChannelRow: React.FC<{
  channel: any;
  voice: any;
  profile: any;
  socket: any;
  selectedServer: any;
  channelMenu: any;
  buildChannelMenu: (ch: any) => any[];
  addToast: any;
}> = ({ channel, voice, profile, socket, selectedServer, channelMenu, buildChannelMenu, addToast }) => {
  const isInThisChannel = voice.channelId === channel.id;
  const channelUsers = isInThisChannel
    ? [{ socketId: 'local', userId: (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id || ''; } catch { return ''; } })(), username: profile.displayName || 'You', avatarUrl: profile.avatarUrl, speaking: voice.localSpeaking, muted: voice.localMuted, deafened: voice.localDeafened, screenSharing: voice.screenSharing }, ...voice.voiceUsers]
    : voice.voiceUsers;
  const hasParticipants = channelUsers.length > 0;

  return (
    <div key={channel.id}>
      <div
        className="channel-item ripple-container voice-channel-item"
        onClick={() => {
          if (isInThisChannel) return;
          // All voice channels in this build go through the mesh WebRTC path.
          // Mesh scales fine to ~6 participants; a LiveKit SFU path is
          // scaffolded in livekitVoice.ts but not wired end-to-end yet.
          voice.setTransport('mesh');
          getMicrophoneStream()
            .then(stream => {
              voice.setLocalStream(stream);
              voice.setChannel(channel.id, selectedServer.id);
              voice.setJoinedAt(Date.now());
              socket.socket?.emit('voice:join', { channelId: channel.id, serverId: selectedServer.id });
            })
            .catch((err: unknown) => {
              const m = classifyMediaError(err);
              addToast(`${m.title}. ${m.fix}`, m.kind === 'permission_denied' ? 'warning' : 'error', { duration: 6000 });
              if (m.kind === 'permission_denied' && m.steps.length > 0) {
                addToast(m.steps[0], 'info', { duration: 7000 });
              }
            });
        }}
        onContextMenu={(e) => { e.preventDefault(); channelMenu.show(e.clientX, e.clientY, buildChannelMenu(channel)); }}
        style={{
          padding: '6px 8px', cursor: 'pointer',
          backgroundColor: isInThisChannel ? 'rgba(74,194,82,0.1)' : 'transparent',
          color: isInThisChannel ? 'var(--toxic)' : 'var(--ash)',
          borderLeft: isInThisChannel ? '2px solid var(--toxic)' : '2px solid transparent',
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all 0.2s', borderRadius: '4px',
        }}
      >
        <span style={{ color: isInThisChannel ? 'var(--toxic)' : 'var(--shadow)' }}>🔊</span>
        <span style={{ flex: 1 }}>{channel.name}</span>
        {channel.rtcMode === 'SFU' && (
          <span
            title="LiveKit SFU — scales beyond mesh's 6-peer limit"
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--abyss)',
              background: 'linear-gradient(135deg, #74d6ff 0%, #4baeff 100%)',
              padding: '1px 5px',
              borderRadius: '4px',
              lineHeight: '14px',
            }}
          >
            SFU
          </span>
        )}
        {hasParticipants && <span style={{ fontSize: '10px', color: 'var(--shadow)', background: 'var(--phantom)', padding: '1px 6px', borderRadius: '8px' }}>{channelUsers.length}</span>}
        {isInThisChannel && voice.localMuted && <MicOff size={12} style={{ color: 'var(--blood)' }} />}
        {isInThisChannel && voice.localDeafened && <VolumeX size={12} style={{ color: 'var(--blood)' }} />}
        {isInThisChannel && <VoiceTimer startedAt={voice.joinedAt || undefined} variant="member" />}
      </div>
      {hasParticipants && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '2px 0 4px 20px' }}>
          {channelUsers.map((user: any) => (
            <div key={user.socketId} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 6px', fontSize: '12px', color: user.speaking ? 'var(--toxic)' : 'var(--ash)', borderRadius: '4px' }}>
              <div style={{ position: 'relative' }}>
                {user.avatarUrl ? <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE}${user.avatarUrl}`} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--obsidian)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--ash)' }}>{(user.username || '?').slice(0, 1).toUpperCase()}</div>}
                {user.speaking && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: 'var(--toxic)', border: '1px solid var(--abyss)' }} />}
                {user.muted && <MicOff size={8} style={{ color: 'var(--blood)', position: 'absolute', top: -4, right: -4 }} />}
              </div>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.socketId === 'local' ? `${user.username} (You)` : user.username}</span>
              {user.screenSharing && <Monitor size={10} style={{ color: 'var(--toxic)', flexShrink: 0 }} />}
              {user.deafened && <VolumeX size={10} style={{ color: 'var(--blood)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import { useMessageStore } from '../../stores/messageStore';

const Sidebar: React.FC<{ onOpenThemes?: () => void }> = ({ onOpenThemes }) => {
  const { selectedServer, selectedChannel, setSelectedChannel, servers, removeServer, setSelectedServer } = useServerStore();
  const { setCreateChannelOpen, addToast, setInviteModalOpen, setShowDiscover } = useUiStore();
  const voice = useVoiceStore();
  const socket = useSocketStore();
  const navigate = useNavigate();
  const profile = useProfileStore();
  const { unread } = useMessageStore();

  const [channelSettingsId, setChannelSettingsId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const channelMenu = useContextMenu();

  if (!selectedServer) return <div className="sidebar"></div>;

  // Derive the current user's status from the SAME source the member panel
  // uses (the server member entry), so the sidebar and member panel can never
  // disagree. Falls back to the profile store when no server is loaded.
  const myStatus = (() => {
    try {
      const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
      const member = selectedServer.members.find((m: any) => m.userId === me.id);
      const serverStatus = String(member?.user?.status || '').toLowerCase();
      // If the server has a real status for us, use it; otherwise fall back.
      if (serverStatus && serverStatus !== 'offline') return serverStatus;
      if (serverStatus === 'offline') return 'offline';
    } catch {}
    return (profile.userStatus || 'online').toLowerCase();
  })();

  const textChannels = selectedServer.channels.filter(c => c.type === 'TEXT');
  const voiceChannels = selectedServer.channels.filter(c => c.type === 'VOICE');

  // Group text channels by category
  const textByCategory: Record<string, typeof textChannels> = {};
  const uncategorizedText: typeof textChannels = [];
  for (const ch of textChannels) {
    if (ch.categoryId) {
      if (!textByCategory[ch.categoryId]) textByCategory[ch.categoryId] = [];
      textByCategory[ch.categoryId].push(ch);
    } else {
      uncategorizedText.push(ch);
    }
  }
  // Sort channels within each category by position
  Object.keys(textByCategory).forEach(key => {
    textByCategory[key].sort((a, b) => (a.position || 0) - (b.position || 0));
  });

  // Group voice channels by category
  const voiceByCategory: Record<string, typeof voiceChannels> = {};
  const uncategorizedVoice: typeof voiceChannels = [];
  for (const ch of voiceChannels) {
    if (ch.categoryId) {
      if (!voiceByCategory[ch.categoryId]) voiceByCategory[ch.categoryId] = [];
      voiceByCategory[ch.categoryId].push(ch);
    } else {
      uncategorizedVoice.push(ch);
    }
  }
  Object.keys(voiceByCategory).forEach(key => {
    voiceByCategory[key].sort((a, b) => (a.position || 0) - (b.position || 0));
  });

  // Get categories from server
  const categories: any[] = selectedServer.categories || [];

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const myRole = (() => {
    try {
      const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
      const member = selectedServer.members.find((m: any) => m.userId === me.id);
      return (member?.role || me?.role || '').toUpperCase();
    } catch { return ''; }
  })();
  const canManage = ['FOUNDER', 'ADMIN'].includes(myRole);

  const buildChannelMenu = (channel: any) => {
    const items: MenuItem[] = [];
    if (channel.type === 'VOICE' || channel.type === 'voice') {
      items.push({ id: 'join', label: 'Join Channel', icon: '🔊', onClick: () => addToast('Voice join — Phase 7.', 'info') });
      items.push({ id: 'copy', label: 'Copy Channel Link', icon: '🔗', onClick: async () => {
        try { await navigator.clipboard.writeText(`vox://channel/${channel.id}`); addToast('🔗 Copied.', 'success'); } catch {}
      }});
      if (canManage) {
        items.push({ id: 'd1', label: '', divider: true });
        items.push({ id: 'edit', label: 'Edit Channel', icon: '✏️', onClick: () => setChannelSettingsId(channel.id) });
        items.push({ id: 'delete', label: 'Delete Channel', icon: '🗑️', danger: true, onClick: () => setChannelSettingsId(channel.id) });
      }
    } else {
      const getNotifSetting = (chId: string) => {
        try { return JSON.parse(localStorage.getItem('vox_notif_settings') || '{}')[chId] || 'all'; } catch { return 'all'; }
      };
      const setNotifSetting = (chId: string, setting: string) => {
        const all = JSON.parse(localStorage.getItem('vox_notif_settings') || '{}');
        all[chId] = setting;
        localStorage.setItem('vox_notif_settings', JSON.stringify(all));
      };
      const current = getNotifSetting(channel.id);
      items.push({ id: 'read', label: 'Mark as Read', icon: '📌', onClick: () => {
        useMessageStore.getState().markAsRead(channel.id);
        addToast('Marked as read.', 'success');
      }});
      items.push({
        id: 'notif',
        label: 'Notification Settings',
        icon: '🔔',
        submenu: [
          { id: 'all', label: current === 'all' ? '✓ All Messages' : 'All Messages', onClick: () => { setNotifSetting(channel.id, 'all'); addToast('Notifications: All.', 'info'); } },
          { id: 'mentions', label: current === 'mentions' ? '✓ Only Mentions' : 'Only Mentions', onClick: () => { setNotifSetting(channel.id, 'mentions'); addToast('Notifications: Mentions only.', 'info'); } },
          { id: 'none', label: current === 'none' ? '✓ Muted' : 'Mute Channel', onClick: () => { setNotifSetting(channel.id, 'none'); addToast('Channel muted.', 'info'); } },
        ],
      });
      items.push({ id: 'd1', label: '', divider: true });
      items.push({ id: 'copy', label: 'Copy Channel Link', icon: '🔗', onClick: async () => {
        try { await navigator.clipboard.writeText(`vox://channel/${channel.id}`); addToast('🔗 Copied.', 'success'); } catch {}
      }});
      if (canManage) {
        items.push({ id: 'd2', label: '', divider: true });
        items.push({ id: 'edit', label: 'Edit Channel', icon: '✏️', onClick: () => setChannelSettingsId(channel.id) });
        items.push({ id: 'delete', label: 'Delete Channel', icon: '🗑️', danger: true, onClick: () => setChannelSettingsId(channel.id) });
      }
    }
    return items;
  };

  const selectChannel = (channel: any) => {
    setSelectedChannel(channel);
    useMessageStore.getState().markAsRead(channel.id);
    navigate(`/channels/${selectedServer.id}/${channel.id}`);
  };

  const leaveServer = async () => {
    if (!window.confirm(`Leave ${selectedServer.name}?`)) return;
    try {
      const { leaveServer } = await import('../../api/discover');
      await leaveServer(selectedServer.id);
      removeServer(selectedServer.id);
      addToast(`Left ${selectedServer.name}.`, 'info');
      navigate('/friends');
    } catch (e: any) {
      addToast(e?.message || 'Failed to leave server.', 'error');
    }
  };

  const bannerUrl = resolveMediaUrl(selectedServer.banner);

  // Generate a deterministic gradient from the server name so each server
  // gets a unique, interesting header even without an uploaded banner.
  const serverGradient = (() => {
    const name = selectedServer.name || '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 45) % 360;
    return `linear-gradient(135deg, hsl(${h1},40%,12%) 0%, hsl(${h2},35%,8%) 50%, hsl(${(h1 + 90) % 360},30%,6%) 100%)`;
  })();

  const headerBg = bannerUrl
    ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url('${bannerUrl}') center/cover no-repeat`
    : serverGradient;

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Server Banner + Name Header */}
      <div
        className="sidebar-banner-shimmer"
        style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--rim)',
          background: headerBg,
          position: 'relative',
          padding: '0 16px',
          cursor: 'pointer',
          overflow: 'hidden',
          zIndex: 10,
          flexShrink: 0,
          transition: 'all 0.3s ease',
        }}
        onClick={() => navigate(`/server-profile/${selectedServer.id}`)}
        title="View server profile"
      >
        {/* Subtle scanline texture on gradient-only headers */}
        {!bannerUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Dark overlay when banner image is set */}
        {bannerUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.7))',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Server Icon — prominent octagon with glow */}
        <ServerLogo
          src={selectedServer.icon ? `${API_BASE}${selectedServer.icon}` : null}
          name={selectedServer.name}
          size={46}
          style={{
            position: 'relative',
            zIndex: 2,
            border: bannerUrl ? '2px solid rgba(255,255,255,0.25)' : '2px solid rgba(255,255,255,0.12)',
            boxShadow: bannerUrl
              ? '0 0 16px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.5)'
              : '0 0 12px rgba(216,74,90,0.2), 0 2px 8px rgba(0,0,0,0.4)',
          }}
        />

        {/* Server name + hint */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 2 }}>
          <h2
            style={{
              fontSize: '14px',
              fontFamily: "'Share Tech Mono', monospace",
              color: 'var(--ghost-white)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.7)',
              letterSpacing: '0.02em',
            }}>{selectedServer.name}</h2>
          {!bannerUrl && (
            <span style={{ fontSize: '9px', color: 'rgba(200,205,216,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              click for profile
            </span>
          )}
        </div>

        {/* Dropdown chevron */}
        <span
          style={{
            position: 'relative',
            zIndex: 2,
            color: 'rgba(200,205,216,0.5)',
            fontSize: '11px',
            flexShrink: 0,
          }}>
          ▼
        </span>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ash)', fontWeight: 'bold' }}>TEXT CHANNELS</span>
          <button
            className="ripple-container create-channel-btn"
            style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', fontSize: '14px' }}
            onClick={() => setCreateChannelOpen(true)}
          >+</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
          {textChannels.length === 0 && (
            <div className="vox-empty-state" style={{ padding: '16px 8px' }}>
              <div className="vox-empty-icon" style={{ fontSize: '24px' }}>📜</div>
              <div className="vox-empty-title" style={{ fontSize: '11px' }}>NO TEXT CHANNELS</div>
              <div className="vox-empty-desc" style={{ fontSize: '10px' }}>Open a channel to begin.</div>
            </div>
          )}

          {/* Render categories with channels */}
          {categories.sort((a, b) => a.position - b.position).map(cat => {
            const catChannels = textByCategory[cat.id] || [];
            if (catChannels.length === 0) return null;
            const isCollapsed = collapsedCategories.has(cat.id);
            return (
              <div key={cat.id} style={{ marginBottom: '2px' }}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 2px', width: '100%',
                    color: 'var(--ash)', fontSize: '11px', fontWeight: 'bold',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '8px', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                  {cat.name}
                </button>
                {!isCollapsed && catChannels.map(channel => (
                  <ChannelRow key={channel.id} channel={channel} selectedChannel={selectedChannel} unread={unread} onSelect={selectChannel} onContextMenu={(e) => channelMenu.show(e.clientX, e.clientY, buildChannelMenu(channel))} />
                ))}
              </div>
            );
          })}

          {/* Uncategorized channels */}
          {uncategorizedText.length > 0 && uncategorizedText.sort((a, b) => (a.position || 0) - (b.position || 0)).map(channel => (
            <ChannelRow key={channel.id} channel={channel} selectedChannel={selectedChannel} unread={unread} onSelect={selectChannel} onContextMenu={(e) => channelMenu.show(e.clientX, e.clientY, buildChannelMenu(channel))} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ash)', fontWeight: 'bold' }}>VOICE CHANNELS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {voiceChannels.length === 0 && (
            <div className="vox-empty-state" style={{ padding: '16px 8px' }}>
              <div className="vox-empty-icon" style={{ fontSize: '24px' }}>🔇</div>
              <div className="vox-empty-title" style={{ fontSize: '11px' }}>NO VOICE CHANNELS</div>
              <div className="vox-empty-desc" style={{ fontSize: '10px' }}>Silence reigns.</div>
            </div>
          )}

          {/* Voice categories */}
          {categories.sort((a: any, b: any) => a.position - b.position).map((cat: any) => {
            const catChannels = (voiceByCategory as any)[cat.id] || [];
            if (catChannels.length === 0) return null;
            const isCollapsed = collapsedCategories.has(`voice-${cat.id}`);
            return (
              <div key={`voice-cat-${cat.id}`} style={{ marginBottom: '2px' }}>
                <button
                  onClick={() => toggleCategory(`voice-${cat.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 2px', width: '100%',
                    color: 'var(--ash)', fontSize: '11px', fontWeight: 'bold',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '8px', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                  {cat.name}
                </button>
                {!isCollapsed && catChannels.map((channel: any) => (
                  <VoiceChannelRow key={channel.id} channel={channel} voice={voice} profile={profile} socket={socket} selectedServer={selectedServer} channelMenu={channelMenu} buildChannelMenu={buildChannelMenu} addToast={addToast} />
                ))}
              </div>
            );
          })}

          {/* Uncategorized voice channels */}
          {uncategorizedVoice.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((channel: any) => (
            <VoiceChannelRow key={channel.id} channel={channel} voice={voice} profile={profile} socket={socket} selectedServer={selectedServer} channelMenu={channelMenu} buildChannelMenu={buildChannelMenu} addToast={addToast} />
          ))}
        </div>
      </div>

      {channelMenu.contextMenu && (
        <ContextMenu {...channelMenu.contextMenu} onClose={channelMenu.hide} />
      )}

      {channelSettingsId && (
        <ChannelSettings channelId={channelSettingsId} onClose={() => setChannelSettingsId(null)} />
      )}

      <UserOperativeBar onOpenThemes={onOpenThemes} />
    </div>
  );
};

export default Sidebar;
