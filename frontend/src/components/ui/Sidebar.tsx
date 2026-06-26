import React, { useState } from 'react';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { Settings, UserRound, Palette } from 'lucide-react';
import { API_BASE } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from '../ui/ContextMenu';
import StatusPicker from '../ui/StatusPicker';
import NotificationBell from './NotificationBell';

function resolveMediaUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const Sidebar: React.FC<{ onOpenThemes?: () => void }> = ({ onOpenThemes }) => {
  const { selectedServer, selectedChannel, setSelectedChannel, servers, removeServer, setSelectedServer } = useServerStore();
  const { setCreateChannelOpen, addToast, setInviteModalOpen, setShowDiscover } = useUiStore();
  const navigate = useNavigate();
  const profile = useProfileStore();
  const avatarUrl = resolveMediaUrl(profile.avatarUrl);

  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
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
        items.push({ id: 'edit', label: 'Edit Channel', icon: '✏️', onClick: () => addToast('Channel editing — coming soon.', 'info') });
        items.push({ id: 'delete', label: 'Delete Channel', icon: '🗑️', danger: true, onClick: () => addToast('Channel deletion — coming soon.', 'info') });
      }
    } else {
      items.push({ id: 'read', label: 'Mark as Read', icon: '📌', onClick: () => addToast('Marked as read.', 'success') });
      items.push({
        id: 'notif',
        label: 'Notification Settings',
        icon: '🔔',
        submenu: [
          { id: 'all', label: 'All Messages', onClick: () => addToast('Notifications: All.', 'info') },
          { id: 'mentions', label: 'Only Mentions', onClick: () => addToast('Notifications: Mentions.', 'info') },
          { id: 'none', label: 'Nothing', onClick: () => addToast('Notifications: None.', 'info') },
        ],
      });
      items.push({ id: 'd1', label: '', divider: true });
      items.push({ id: 'copy', label: 'Copy Channel Link', icon: '🔗', onClick: async () => {
        try { await navigator.clipboard.writeText(`vox://channel/${channel.id}`); addToast('🔗 Copied.', 'success'); } catch {}
      }});
      if (canManage) {
        items.push({ id: 'd2', label: '', divider: true });
        items.push({ id: 'edit', label: 'Edit Channel', icon: '✏️', onClick: () => addToast('Channel editing — coming soon.', 'info') });
        items.push({ id: 'delete', label: 'Delete Channel', icon: '🗑️', danger: true, onClick: () => addToast('Channel deletion — coming soon.', 'info') });
      }
    }
    return items;
  };

  const selectChannel = (channel: any) => {
    setSelectedChannel(channel);
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

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        className="top-bar"
        style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--rim)', backgroundColor: 'var(--abyss)' }}
      >
        <h2 style={{ fontSize: '16px', color: 'var(--ghost-white)' }}>{selectedServer.name}</h2>
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
          {textChannels.map(channel => (
            <div
              key={channel.id}
              className="channel-item ripple-container"
              onClick={() => selectChannel(channel)}
              onContextMenu={(e) => {
                e.preventDefault();
                channelMenu.show(e.clientX, e.clientY, buildChannelMenu(channel));
              }}
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
            </div>
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
          {voiceChannels.map(channel => (
            <div
              key={channel.id}
              className="channel-item ripple-container voice-channel-item"
              onContextMenu={(e) => {
                e.preventDefault();
                channelMenu.show(e.clientX, e.clientY, buildChannelMenu(channel));
              }}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                color: 'var(--ash)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <span style={{ color: 'var(--shadow)' }}>🔊</span> {channel.name}
            </div>
          ))}
        </div>
      </div>

      {channelMenu.contextMenu && (
        <ContextMenu {...channelMenu.contextMenu} onClose={channelMenu.hide} />
      )}

      <div className="vox-user-panel" style={{ position: 'relative', gridTemplateColumns: 'minmax(0, 1fr) 30px 30px 30px 30px' }}>
        {statusPickerOpen && <StatusPicker onClose={() => setStatusPickerOpen(false)} />}
        <button
          type="button"
          className="vox-user-profile ripple-container"
          onClick={() => setStatusPickerOpen((v) => !v)}
          aria-label="Set status"
        >
          <div className="octagon">{avatarUrl ? <img src={avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}</div>
          <span>
            <strong>{profile.displayName}</strong>
            <em style={{ textTransform: 'capitalize' }}>{profile.userStatus}</em>
          </span>
        </button>
        <button type="button" className="vox-panel-icon ripple-container" onClick={() => navigate('/profile')} aria-label="Profile">
          <UserRound size={17} />
        </button>
        <button type="button" className="vox-panel-icon ripple-container" onClick={onOpenThemes} aria-label="Switch theme" title="Switch theme">
          <Palette size={16} />
        </button>
        <NotificationBell />
        <button type="button" className="vox-panel-icon ripple-container" onClick={() => navigate('/settings')} aria-label="Settings">
          <Settings size={17} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
