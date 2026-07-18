import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from '../ui/ContextMenu';
import { leaveServer } from '../../api/discover';
import { API_BASE } from '../../api/client';
import ServerLogo from '../ui/ServerLogo';
import VoxLogo from '../ui/VoxLogo';

const ServerRail: React.FC = () => {
  const { servers, selectedServer, setSelectedServer, removeServer } = useServerStore();
  const { setCreateServerOpen, setShowDiscover, setInviteModalOpen, addToast } = useUiStore();
  const navigate = useNavigate();
  const serverMenu = useContextMenu();
  const [hoveredServerId, setHoveredServerId] = useState<string | null>(null);

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
    const isOwner = server.ownerId === (() => {
      try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id; } catch { return ''; }
    })();

    return [
      { id: 'profile', label: 'View Profile', icon: '🖼️', onClick: () => navigate(`/server-profile/${server.id}`) },
      { id: 'settings', label: 'Server Settings', icon: '⚙️', onClick: () => navigate(`/server-settings/${server.id}`) },
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
            { id: 'role', label: 'Roles & Permissions', icon: '🎭', onClick: () => navigate(`/server-settings/${server.id}`) },
            { id: 'insights', label: 'Server Insights', icon: '📊', onClick: () => navigate(`/server-insights/${server.id}`) },
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
      ...(isOwner
        ? [
            { id: 'd3', label: '', divider: true },
            {
              id: 'delete',
              label: 'Delete Server',
              icon: '💀',
              danger: true,
              onClick: async () => {
                if (!window.confirm(`💀 Permanently delete "${server.name}"? This cannot be undone.`)) return;
                try {
                  await (await import('../../api/discover')).deleteServer(server.id);
                  removeServer(server.id);
                  addToast(`Deleted ${server.name}.`, 'info');
                  navigate('/friends');
                } catch (e: any) {
                  addToast(e?.message || 'Failed to delete server.', 'error');
                }
              },
            },
          ]
        : []),
    ];
  };

  const getServerIconUrl = (server: any) => {
    if (server.icon) {
      return server.icon.startsWith('http') ? server.icon : `${API_BASE}${server.icon}`;
    }
    return null;
  };

  return (
    <div className="server-rail" style={{ position: 'relative' }}>
      {/* Ambient glow line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--chaos), transparent)',
        opacity: 0.2,
        animation: 'railGlow 4s ease-in-out infinite',
      }} />

      <button
        className={`server-icon octagon ripple-container ${!selectedServer ? 'active' : ''}`}
        onClick={() => {
          setSelectedServer(null);
          navigate('/friends');
        }}
        title="VOX — Home"
        aria-label="Home"
        style={{
          width: '48px', height: '48px',
          backgroundColor: !selectedServer ? 'var(--obsidian)' : 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          color: 'var(--ghost-white)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          fontSize: '24px',
          boxShadow: !selectedServer ? '0 0 12px var(--chaos-glow)' : 'none',
          padding: 0,
        }}
      >
        <VoxLogo size={36} />
      </button>

      <div style={{ width: '32px', height: '2px', backgroundColor: 'var(--rim)', opacity: 0.5 }}></div>

      {servers.length === 0 && (
        <div className="vox-empty-state" style={{ padding: '16px 8px' }}>
          <div className="vox-empty-icon" style={{ fontSize: '28px' }}>🌑</div>
          <div className="vox-empty-title" style={{ fontSize: '11px' }}>NO REALMS</div>
          <div className="vox-empty-desc" style={{ fontSize: '10px' }}>Forge or discover a realm.</div>
        </div>
      )}

      {servers.map(server => {
        const iconUrl = getServerIconUrl(server);
        const isHovered = hoveredServerId === server.id;
        const isSelected = selectedServer?.id === server.id;
        const boostLevel = (server as any).boostLevel || 0;

        return (
          <motion.button
            key={server.id}
            layoutId={`server-icon-${server.id}`}
            className={`server-icon octagon ripple-container ${isSelected ? 'active' : ''}`}
            onClick={() => selectServer(server)}
            onContextMenu={(e) => {
              e.preventDefault();
              serverMenu.show(e.clientX, e.clientY, buildServerMenu(server));
            }}
            onHoverStart={() => setHoveredServerId(server.id)}
            onHoverEnd={() => setHoveredServerId(null)}
            animate={{
              scale: isSelected ? 1.05 : isHovered ? 1.08 : 1,
            }}
            whileTap={{ scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              layout: { type: 'spring', stiffness: 350, damping: 30 },
            }}
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: isSelected ? 'var(--obsidian)' : 'var(--dark-matter)',
              border: isHovered ? '1px solid var(--chaos)' : '1px solid var(--rim)',
              boxShadow: isHovered
                ? '0 0 16px var(--chaos-glow), 0 4px 12px rgba(0,0,0,0.4)'
                : isSelected
                  ? '0 0 12px var(--chaos-glow)'
                  : boostLevel > 0
                    ? `0 0 8px rgba(217,201,141,${0.1 + boostLevel * 0.05})`
                    : 'none',
              color: 'var(--ghost-white)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              position: 'relative',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            <ServerLogo src={iconUrl} name={server.name} size={48} />

            {/* Boost badge */}
            {boostLevel > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff73fa, #ffd37a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                zIndex: 3,
                boxShadow: '0 0 6px rgba(255,115,250,0.5)',
              }}>
                ⚡
              </div>
            )}

            {/* Hover indicator ring */}
            {isHovered && !iconUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  position: 'absolute',
                  inset: '-2px',
                  border: '2px solid var(--chaos)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />
            )}
            
            {/* Tooltip on hover */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: '8px',
                    background: 'var(--dark-matter)',
                    border: '1px solid var(--rim)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: 'var(--ghost-white)',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  {server.name}
                  {boostLevel > 0 && (
                    <span style={{ color: '#ff73fa', marginLeft: '6px', fontSize: '10px' }}>
                      ⚡ Lv.{boostLevel}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}

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
          fontSize: '24px'
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
