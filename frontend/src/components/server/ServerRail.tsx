import React from 'react';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from '../ui/ContextMenu';
import { leaveServer } from '../../api/discover';

const ServerRail: React.FC = () => {
  const { servers, selectedServer, setSelectedServer, removeServer } = useServerStore();
  const { setCreateServerOpen, setShowDiscover, setInviteModalOpen, addToast } = useUiStore();
  const navigate = useNavigate();
  const serverMenu = useContextMenu();

  const selectServer = (server: any) => {
    setSelectedServer(server);
    if (server.channels.length > 0) {
      navigate(`/channels/${server.id}/${server.channels[0].id}`);
    }
  };

  const buildServerMenu = (server: any): MenuItem[] => {
    const myRole = (() => {
      try {
        const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
        const member = server.members?.find((m: any) => m.userId === me.id);
        return (member?.role || me?.role || '').toUpperCase();
      } catch { return ''; }
    })();
    const canManage = ['FOUNDER', 'ADMIN'].includes(myRole);

    return [
      { id: 'settings', label: 'Server Settings', icon: '⚙️', onClick: () => navigate('/settings') },
      { id: 'copyid', label: 'Copy Server ID', icon: '📋', onClick: async () => {
        try { await navigator.clipboard.writeText(server.id); addToast('📋 Copied Server ID.', 'success'); } catch {}
      }},
      {
        id: 'notif',
        label: 'Notification Settings',
        icon: '🔔',
        submenu: [
          { id: 'all', label: 'All Messages', onClick: () => addToast('Notifications: All.', 'info') },
          { id: 'mentions', label: 'Only Mentions', onClick: () => addToast('Notifications: Mentions.', 'info') },
          { id: 'none', label: 'Nothing', onClick: () => addToast('Notifications: None.', 'info') },
        ],
      },
      { id: 'd1', label: '', divider: true },
      { id: 'invite', label: 'Create Invite', icon: '✉️', onClick: () => setInviteModalOpen(server.id) },
      ...(canManage
        ? [
            { id: 'channel', label: 'Create Channel', icon: '🏠', onClick: () => addToast('Use the + by a channel.', 'info') },
            { id: 'role', label: 'Create Role', icon: '🎭', onClick: () => addToast('Roles — coming soon.', 'info') },
          ]
        : []),
      { id: 'd2', label: '', divider: true },
      {
        id: 'leave',
        label: 'Leave Server',
        icon: '🚪',
        danger: true,
        onClick: async () => {
          if (!window.confirm(`Leave ${server.name}?`)) return;
          try {
            await leaveServer(server.id);
            removeServer(server.id);
            addToast(`Left ${server.name}.`, 'info');
            navigate('/friends');
          } catch (e: any) {
            addToast(e?.message || 'Failed to leave server.', 'error');
          }
        },
      },
    ];
  };

  return (
    <div className="server-rail">
      <button
        className={`server-icon octagon ripple-container ${!selectedServer ? 'active' : ''}`}
        onClick={() => {
          setSelectedServer(null);
          navigate('/friends');
        }}
        style={{
          width: '48px', height: '48px',
          backgroundColor: !selectedServer ? 'var(--obsidian)' : 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          color: 'var(--ghost-white)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          fontSize: '24px'
        }}
      >
        🦇
      </button>

      <div style={{ width: '32px', height: '2px', backgroundColor: 'var(--rim)' }}></div>

      {servers.length === 0 && (
        <div className="vox-empty-state" style={{ padding: '16px 8px' }}>
          <div className="vox-empty-icon" style={{ fontSize: '28px' }}>🌑</div>
          <div className="vox-empty-title" style={{ fontSize: '11px' }}>NO REALMS</div>
          <div className="vox-empty-desc" style={{ fontSize: '10px' }}>Forge or discover a realm.</div>
        </div>
      )}

      {servers.map(server => (
        <button
          key={server.id}
          className={`server-icon octagon ripple-container ${selectedServer?.id === server.id ? 'active' : ''}`}
          onClick={() => selectServer(server)}
          onContextMenu={(e) => {
            e.preventDefault();
            serverMenu.show(e.clientX, e.clientY, buildServerMenu(server));
          }}
          style={{
            width: '48px', height: '48px',
            backgroundColor: selectedServer?.id === server.id ? 'var(--obsidian)' : 'var(--dark-matter)',
            border: '1px solid var(--rim)',
            color: 'var(--ghost-white)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            fontSize: '18px',
            backgroundImage: server.icon ? `url(${server.icon})` : 'none',
            backgroundSize: 'cover'
          }}
        >
          {!server.icon && server.name.substring(0, 2).toUpperCase()}
        </button>
      ))}

      <button
        className="server-icon angular-cut ripple-container"
        onClick={() => setCreateServerOpen(true)}
        style={{
          width: '48px', height: '48px',
          backgroundColor: 'var(--obsidian)',
          border: '1px dashed var(--rim)',
          color: 'var(--ash)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          fontSize: '24px'
        }}
      >
        +
      </button>

      <button
        className="server-icon octagon ripple-container"
        onClick={() => setShowDiscover(true)}
        title="Discover realms"
        aria-label="Discover realms"
        style={{
          width: '48px', height: '48px',
          backgroundColor: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          color: 'var(--chaos)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          fontSize: '22px'
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--chaos)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--rim)'; }}
      >
        🧭
      </button>

      {serverMenu.contextMenu && (
        <ContextMenu {...serverMenu.contextMenu} onClose={serverMenu.hide} />
      )}
    </div>
  );
};

export default ServerRail;
