import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from '../ui/ContextMenu';
import { leaveServer } from '../../api/discover';
import { API_BASE } from '../../api/client';
import ServerLogo from '../ui/ServerLogo';
import VoxLogo from '../ui/VoxLogo';
import RailActions from '../ui/RailActions';

/* ═══════════════════════════════════════════════════════════════
   PS5-STYLE HORIZONTAL SERVER RAIL
   — Horizontal top-center layout
   — Sliding focus ring with spring physics
   — 3D tilt on hover
   — Pulse wave on selection
   — Scale cascade for distant icons
   ═══════════════════════════════════════════════════════════════ */

const ServerRail: React.FC = () => {
  const { servers, selectedServer, setSelectedServer, removeServer } = useServerStore();
  const { setCreateServerOpen, setShowDiscover, setInviteModalOpen, addToast } = useUiStore();
  const navigate = useNavigate();
  const serverMenu = useContextMenu();
  const [hoveredServerId, setHoveredServerId] = useState<string | null>(null);
  const [pulseServerId, setPulseServerId] = useState<string | null>(null);
  const [haptic, setHaptic] = useState<{ id: string; n: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 3D tilt state
  const [tiltState, setTiltState] = useState<{ id: string; rx: number; ry: number } | null>(null);

  // Check scroll overflow
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, servers.length]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  };

  const selectServer = (server: any) => {
    // Fire pulse wave
    setPulseServerId(server.id);
    setTimeout(() => setPulseServerId(null), 650);

    // Haptic kick: short sharp scale pop on the freshly selected icon.
    if (!reduceMotion) {
      setHaptic({ id: server.id, n: Date.now() });
      setTimeout(() => setHaptic((h) => (h && h.id === server.id ? null : h)), 420);
    }

    setSelectedServer(server);
    if (server.channels.length > 0) {
      // Restore last active channel for this server
      let targetChannelId = server.channels[0].id;
      try {
        const saved = JSON.parse(localStorage.getItem('vox_last_channel') || '{}');
        const lastId = saved[server.id];
        if (lastId && server.channels.some((c: any) => c.id === lastId)) {
          targetChannelId = lastId;
        }
      } catch {}
      navigate(`/channels/${server.id}/${targetChannelId}`);
    }
  };

  // 3D tilt handler
  const handleMouseMove = (e: React.MouseEvent, serverId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltState({ id: serverId, rx: -y * 20, ry: x * 20 });
  };

  const handleMouseLeave = (serverId: string) => {
    if (tiltState?.id === serverId) setTiltState(null);
    setHoveredServerId(null);
  };

  // Haptic kick keyframes — memoized on `haptic` so the array reference is
  // stable while the kick is in flight. Without this, any re-render during the
  // 420ms window (e.g. a hover flip on the same icon) would recreate the array
  // and restart the pop from the top. The `(haptic.n % 50) * 0.0001` tail makes
  // each new select produce a different last keyframe so framer re-triggers.
  const kickScale = React.useMemo(() => {
    if (!haptic) return null;
    return [1, 1.18, 0.97, 1.12 + ((haptic.n % 50) * 0.0001)];
  }, [haptic]);

  // Get distance from selected server for scale cascade
  const getDistanceClass = (serverId: string) => {
    if (!selectedServer) return '';
    const selectedIdx = servers.findIndex(s => s.id === selectedServer.id);
    const currentIdx = servers.findIndex(s => s.id === serverId);
    if (selectedIdx === -1 || currentIdx === -1) return '';
    const dist = Math.abs(currentIdx - selectedIdx);
    if (dist === 0) return 'selected';
    if (dist <= 1) return 'adjacent';
    return 'far';
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

  // PS5 spring transition (hover / idle glides)
  const ps5Spring = {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
    mass: 0.8,
  };

  // Focus ring — deliberately SLOW ease-out so it glides between icons
  // instead of snapping: low stiffness, heavy mass, moderate damping.
  const focusSpring = {
    type: 'spring' as const,
    stiffness: 170,
    damping: 26,
    mass: 1.6,
  };

  // Haptic pop — stiff + underdamped for a short overshoot "thump".
  const ps5PopSpring = {
    type: 'spring' as const,
    stiffness: 720,
    damping: 16,
    mass: 0.55,
  };

  return (
    <div className="server-rail" style={{ position: 'relative' }}>
      <RailActions />
      {/* Ambient glow line — now horizontal at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--chaos), transparent)',
        opacity: 0.25,
        animation: 'railGlow 4s ease-in-out infinite',
      }} />

      {/* Ambient top shine */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(216, 74, 90, 0.3), transparent)',
        opacity: 0.4,
      }} />

      {/* Left scroll arrow */}
      {canScrollLeft && (
        <motion.button
          className="server-rail-scroll-arrow"
          onClick={() => scrollBy(-1)}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 0.6, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          whileHover={{ opacity: 1, scale: 1.15 }}
          aria-label="Scroll left"
        >
          ‹
        </motion.button>
      )}

      {/* Home button */}
      <motion.button
        className={`server-icon octagon ripple-container ${!selectedServer ? 'active' : ''}`}
        onClick={() => {
          setSelectedServer(null);
          navigate('/friends');
        }}
        title="VOX — Home"
        aria-label="Home"
        whileHover={{ scale: 1.1, y: -3 }}
        whileTap={{ scale: 0.92 }}
        transition={ps5Spring}
        style={{
          width: '52px', height: '52px',
          backgroundColor: !selectedServer ? 'var(--obsidian)' : 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          color: 'var(--ghost-white)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s, box-shadow 0.3s',
          fontSize: '24px',
          boxShadow: !selectedServer
            ? '0 0 16px var(--chaos-glow), 0 4px 20px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.2)',
          padding: 0,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <VoxLogo size={36} />
        {/* Home active focus ring */}
        {!selectedServer && (
          <motion.div
            layoutId="ps5-focus-ring"
            className="ps5-focus-ring"
            style={{ inset: '-5px' }}
            transition={focusSpring}
          />
        )}
      </motion.button>

      <div className="server-rail-divider-h" />

      {/* Scrollable server list */}
      <div ref={scrollRef} className="server-rail-scroll-container">
        {servers.length === 0 && (
          <div className="vox-empty-state compact" style={{ padding: '8px 16px', flexShrink: 0 }}>
            <div className="vox-empty-icon" style={{ fontSize: '22px' }}>🌑</div>
            <div className="vox-empty-title" style={{ fontSize: '11px' }}>NO REALMS</div>
          </div>
        )}

        {servers.map(server => {
          const iconUrl = getServerIconUrl(server);
          const isHovered = hoveredServerId === server.id;
          const isSelected = selectedServer?.id === server.id;
          const boostLevel = (server as any).boostLevel || 0;
          const distClass = getDistanceClass(server.id);
          const tilt = tiltState?.id === server.id ? tiltState : null;
          const showPulse = pulseServerId === server.id;

          return (
            <div
              key={server.id}
              className="server-rail-item"
              style={{ perspective: '600px' }}
            >
              <motion.button
                layoutId={`server-icon-${server.id}`}
                className={`server-icon octagon ripple-container server-icon-ps5 ${isSelected ? 'active' : ''} ${distClass}`}
                onClick={() => selectServer(server)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  serverMenu.show(e.clientX, e.clientY, buildServerMenu(server));
                }}
                onMouseEnter={() => setHoveredServerId(server.id)}
                onMouseMove={(e) => handleMouseMove(e, server.id)}
                onMouseLeave={() => handleMouseLeave(server.id)}
                animate={{
                  scale: isSelected
                    ? haptic && haptic.id === server.id && kickScale
                      ? kickScale
                      : 1.12
                    : isHovered
                      ? 1.08
                      : 1,
                  y: isSelected ? -4 : isHovered ? -3 : 0,
                  rotateX: tilt ? tilt.rx : 0,
                  rotateY: tilt ? tilt.ry : 0,
                }}
                whileTap={{ scale: 0.9 }}
                transition={isSelected ? ps5PopSpring : ps5Spring}
                style={{
                  width: '52px',
                  height: '52px',
                  backgroundColor: isSelected ? 'var(--obsidian)' : 'var(--dark-matter)',
                  border: isHovered ? '1px solid var(--chaos)' : '1px solid var(--rim)',
                  boxShadow: isSelected
                    ? '0 0 20px var(--chaos-glow), 0 8px 25px rgba(0,0,0,0.4), 0 0 40px rgba(216, 74, 90, 0.08)'
                    : isHovered
                      ? '0 0 16px var(--chaos-glow), 0 6px 18px rgba(0,0,0,0.35)'
                      : boostLevel > 0
                        ? `0 0 8px rgba(217,201,141,${0.1 + boostLevel * 0.05})`
                        : '0 2px 8px rgba(0,0,0,0.15)',
                  color: 'var(--ghost-white)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  position: 'relative',
                  overflow: 'visible',
                  padding: 0,
                  transformStyle: 'preserve-3d',
                }}
              >
                <ServerLogo src={iconUrl} name={server.name} size={52} />

                {/* PS5 sliding focus ring */}
                {isSelected && (
                  <motion.div
                    layoutId="ps5-focus-ring"
                    className="ps5-focus-ring"
                    style={{ inset: '-5px' }}
                    transition={focusSpring}
                  />
                )}

                {/* PS5 pulse wave on selection */}
                <AnimatePresence>
                  {showPulse && (
                    <div className="ps5-pulse-wave" key={`pulse-${server.id}`} />
                  )}
                </AnimatePresence>

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

                {/* Hover 3D highlight shimmer */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `radial-gradient(circle at ${tilt ? (50 + tilt.ry * 2) : 50}% ${tilt ? (50 - tilt.rx * 2) : 50}%, rgba(216, 74, 90, 0.4), transparent 60%)`,
                      pointerEvents: 'none',
                      borderRadius: 'inherit',
                    }}
                  />
                )}
              </motion.button>

              {/* Tooltip — now appears BELOW the icon */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.9 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '8px',
                      background: 'rgba(5, 5, 6, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--rim)',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--ghost-white)',
                      whiteSpace: 'nowrap',
                      zIndex: 1000,
                      pointerEvents: 'none',
                      fontFamily: "'Share Tech Mono', monospace",
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Tooltip arrow */}
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: '8px',
                      height: '8px',
                      background: 'rgba(5, 5, 6, 0.95)',
                      border: '1px solid var(--rim)',
                      borderRight: 'none',
                      borderBottom: 'none',
                    }} />
                    {server.name}
                    {boostLevel > 0 && (
                      <span style={{ color: '#ff73fa', marginLeft: '6px', fontSize: '10px' }}>
                        ⚡ Lv.{boostLevel}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {canScrollRight && (
        <motion.button
          className="server-rail-scroll-arrow"
          onClick={() => scrollBy(1)}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0.6, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, scale: 1.15 }}
          aria-label="Scroll right"
        >
          ›
        </motion.button>
      )}

      <div className="server-rail-divider-h" />

      {/* Create server button */}
      <motion.button
        className="server-icon angular-cut ripple-container"
        onClick={() => setCreateServerOpen(true)}
        whileHover={{ scale: 1.1, y: -2, borderColor: 'var(--chaos)' }}
        whileTap={{ scale: 0.92 }}
        transition={ps5Spring}
        style={{
          width: '44px', height: '44px',
          backgroundColor: 'var(--obsidian)',
          border: '1px dashed var(--rim)',
          color: 'var(--ash)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
          flexShrink: 0,
        }}
      >
        +
      </motion.button>

      {/* Discover button */}
      <motion.button
        className="server-icon octagon ripple-container"
        onClick={() => setShowDiscover(true)}
        title="Discover realms"
        aria-label="Discover realms"
        whileHover={{ scale: 1.1, y: -2, borderColor: 'var(--chaos)' }}
        whileTap={{ scale: 0.92 }}
        transition={ps5Spring}
        style={{
          width: '44px', height: '44px',
          backgroundColor: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          color: 'var(--chaos)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
        }}
      >
        🧭
      </motion.button>

      {serverMenu.contextMenu && (
        <ContextMenu {...serverMenu.contextMenu} onClose={serverMenu.hide} />
      )}
    </div>
  );
};

export default ServerRail;
