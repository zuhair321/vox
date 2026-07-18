import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useServerStore } from '../stores/serverStore';
import { useUiStore } from '../stores/uiStore';
import { API_BASE } from '../api/client';
import { uploadServerIcon, uploadServerBanner } from '../api/uploads';
import ServerLogo from '../components/ui/ServerLogo';

const ServerProfile: React.FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { servers, selectedServer, fetchServers } = useServerStore();
  const { addToast, setInviteModalOpen } = useUiStore();

  // Resolve server — prefer store data, fall back to URL param lookup
  const server = selectedServer?.id === serverId
    ? selectedServer
    : servers.find((s) => s.id === serverId);

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!server) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--ash)',
      }}>
        <div style={{ fontSize: '48px', opacity: 0.3 }}>🔭</div>
        <div style={{ fontSize: '18px', color: 'var(--ghost-white)' }}>Realm not found.</div>
        <button
          className="angular-button"
          onClick={() => navigate('/friends')}
        >
          ← Back
        </button>
      </div>
    );
  }

  // Deterministic gradient from server name — unique per server, no upload needed.
  const serverGradient = (() => {
    const name = server.name || '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1},45%,10%) 0%, hsl(${h2},38%,7%) 40%, hsl(${(h1 + 80) % 360},32%,5%) 100%)`;
  })();

  // DEBUG — remove after fix
  if (typeof window !== 'undefined') {
    console.log('[ServerProfile] banner raw:', server.banner, '| icon raw:', server.icon);
  }

  const bannerUrl = server.banner
    ? (server.banner.startsWith('http') ? server.banner : `${API_BASE}${server.banner}`)
    : null;

  const iconUrl = server.icon
    ? (server.icon.startsWith('http') ? server.icon : `${API_BASE}${server.icon}`)
    : null;

  // DEBUG — remove after fix
  if (typeof window !== 'undefined') {
    console.log('[ServerProfile] bannerUrl:', bannerUrl, '| iconUrl:', iconUrl);
  }

  const effectiveBannerBg = bannerUrl ? undefined : serverGradient;

  const myUserId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id; } catch { return ''; }
  })();
  const isAdmin = server.members?.some(
    (m: any) => m.userId === myUserId && ['FOUNDER', 'ADMIN'].includes(m.role)
  );
  const isOwner = server.ownerId === myUserId;
  const canManage = isAdmin || isOwner;

  const textChannels = server.channels.filter((c: any) => c.type === 'TEXT');
  const voiceChannels = server.channels.filter((c: any) => c.type === 'VOICE');

  const handleIconUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB.', 'error');
      return;
    }
    setUploadingIcon(true);
    try {
      const data = await uploadServerIcon(server.id, file);
      // Directly update the selectedServer in the store with fresh data from the response
      if (data?.server) {
        useServerStore.getState().setSelectedServer(data.server);
        // Also update in the servers list
        const store = useServerStore.getState();
        useServerStore.setState({
          servers: store.servers.map((s) => s.id === data.server.id ? data.server : s),
        });
      }
      addToast('Icon updated.', 'success');
    } catch (e: any) {
      addToast(e.message || 'Upload failed.', 'error');
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB.', 'error');
      return;
    }
    setUploadingBanner(true);
    try {
      const data = await uploadServerBanner(server.id, file);
      // Directly update the selectedServer in the store with fresh data from the response
      if (data?.server) {
        useServerStore.getState().setSelectedServer(data.server);
        // Also update in the servers list
        const store = useServerStore.getState();
        useServerStore.setState({
          servers: store.servers.map((s) => s.id === data.server.id ? data.server : s),
        });
      }
      addToast('Banner updated.', 'success');
    } catch (e: any) {
      addToast(e.message || 'Upload failed.', 'error');
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--abyss)',
    }}>
      {/* Cover Banner */}
      <div
        style={{
          width: '100%',
          height: bannerUrl ? '200px' : '160px',
          position: 'relative',
          flexShrink: 0,
          overflow: 'hidden',
          background: effectiveBannerBg,
          transition: 'height 0.3s ease',
        }}
      >
        {/* Background image when banner is set */}
        {bannerUrl && (
          <img
            src={bannerUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* Subtle scanline texture on gradient-only banners */}
        {!bannerUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)',
          pointerEvents: 'none',
        }} />

        {/* "No banner" empty state — shows hint + upload CTA for admins */}
        {!bannerUrl && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '28px', opacity: 0.3 }}>🌄</span>
            {!canManage && (
              <span style={{ color: 'var(--ash)', fontSize: '11px', opacity: 0.5, fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.06em' }}>
                NO BANNER SET
              </span>
            )}
          </div>
        )}

        {/* Banner upload overlay (admins only) */}
        {canManage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'rgba(0,0,0,0.55)',
              opacity: 0,
              transition: 'opacity 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            onClick={(e) => {
              e.stopPropagation();
              bannerInputRef.current?.click();
            }}
          >
            <span style={{ fontSize: '20px' }}>📷</span>
            <span style={{ color: 'var(--ghost-white)', fontSize: '12px', fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.05em' }}>
              {bannerUrl ? 'CHANGE BANNER' : 'UPLOAD BANNER'}
            </span>
            <span style={{ color: 'var(--ash)', fontSize: '10px' }}>Recommended: 960×320</span>
          </div>
        )}

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/gif,image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleBannerUpload(file);
          }}
        />
      </div>

      {/* Profile Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 24px 24px',
      }}>
          {/* Avatar + Name Row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '16px',
          marginTop: '-36px',
          marginBottom: '24px',
          position: 'relative',
        }}>
          {/* Server Avatar */}
          <motion.div
            style={{
              width: '88px',
              height: '88px',
              flexShrink: 0,
              border: `4px solid ${bannerUrl ? 'var(--abyss)' : 'rgba(255,255,255,0.08)'}`,
              cursor: canManage ? 'pointer' : 'default',
              position: 'relative',
              zIndex: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
            whileHover={canManage ? { scale: 1.06 } : {}}
            onClick={() => canManage && iconInputRef.current?.click()}
          >
            <ServerLogo
              src={iconUrl}
              name={server.name}
              size={88}
            />

            {/* Camera overlay */}
            {canManage && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  cursor: 'pointer',
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                onClick={() => iconInputRef.current?.click()}
              >
                <span style={{ fontSize: '16px' }}>📷</span>
                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', fontFamily: "'Share Tech Mono', monospace" }}>
                  {iconUrl ? 'CHANGE' : 'SET ICON'}
                </span>
              </div>
            )}
          </motion.div>

          <input
            ref={iconInputRef}
            type="file"
            accept="image/gif,image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleIconUpload(file);
            }}
          />

          {/* Name + Actions */}
          <div style={{ flex: 1, paddingBottom: '4px' }}>
            <h1 style={{
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: '22px',
              color: 'var(--ghost-white)',
              margin: '0 0 4px',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              letterSpacing: '0.02em',
            }}>
              {server.name}
            </h1>
            <p style={{ color: 'var(--ash)', fontSize: '12px', margin: 0 }}>
              {server.description || 'No description set.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
            <button
              className="angular-button primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => setInviteModalOpen(server.id)}
            >
              ✉️ Invite
            </button>
            {canManage && (
              <button
                className="angular-button"
                style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={() => navigate(`/server-settings/${server.id}`)}
              >
                ⚙️ Settings
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}>
          {[
            { icon: '👤', label: 'Members', value: server.members?.length || 0 },
            { icon: '📝', label: 'Text Channels', value: textChannels.length },
            { icon: '🔊', label: 'Voice Channels', value: voiceChannels.length },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 18px',
                background: 'var(--dark-matter)',
                border: '1px solid var(--rim)',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
              }}
            >
              <span style={{ fontSize: '16px', filter: 'grayscale(0.2)' }}>{stat.icon}</span>
              <span style={{ color: 'var(--ghost-white)', fontSize: '18px', fontWeight: 700, fontFamily: "'Share Tech Mono', monospace" }}>
                {stat.value}
              </span>
              <span style={{ color: 'var(--ash)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Channels */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '11px',
              color: 'var(--ash)',
              letterSpacing: '0.1em',
              marginBottom: '12px',
            }}>
              CHANNELS
            </h3>
            <div style={{
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              overflow: 'hidden',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
            }}>
              {server.channels.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ash)', fontSize: '12px' }}>
                  No channels yet.
                </div>
              ) : (
                server.channels.map((ch: any) => (
                  <div
                    key={ch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--rim)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => navigate(`/channels/${server.id}/${ch.id}`)}
                  >
                    <span style={{ color: ch.type === 'VOICE' ? 'var(--toxic)' : 'var(--shadow)', fontSize: '14px' }}>
                      {ch.type === 'VOICE' ? '🔊' : '#'}
                    </span>
                    <span style={{ color: 'var(--ghost-white)', fontSize: '13px', flex: 1 }}>
                      {ch.name}
                    </span>
                    <span style={{ color: 'var(--shadow)', fontSize: '10px', textTransform: 'uppercase' }}>
                      {ch.type === 'VOICE' ? 'Voice' : 'Text'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Members */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '11px',
              color: 'var(--ash)',
              letterSpacing: '0.1em',
              marginBottom: '12px',
            }}>
              MEMBERS
            </h3>
            <div style={{
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              overflow: 'hidden',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              {server.members?.map((member: any) => {
                const roleColor = member.role === 'FOUNDER' ? 'var(--chaos)'
                  : member.role === 'ADMIN' ? 'var(--blood)'
                  : member.role === 'MODERATOR' ? 'var(--toxic)'
                  : 'var(--ash)';
                return (
                  <div
                    key={member.id || member.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--rim)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar */}
                    <div
                      className="octagon"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: member.user?.avatarUrl ? 'var(--obsidian)' : 'var(--dark-matter)',
                        flexShrink: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'var(--ghost-white)',
                        fontWeight: 600,
                      }}
                    >
                      {member.user?.avatarUrl ? (
                        <img
                          src={`${API_BASE}${member.user.avatarUrl}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        (member.user?.username || '?')[0]?.toUpperCase()
                      )}
                    </div>
                    {/* Name + Role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: 'var(--ghost-white)',
                        fontSize: '13px',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {member.user?.username || 'Unknown'}
                      </div>
                      <div style={{ color: roleColor, fontSize: '10px', letterSpacing: '0.05em' }}>
                        {member.role}
                      </div>
                    </div>
                    {/* Online dot */}
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: member.user?.status === 'offline' ? 'var(--ash)' : 'var(--toxic)',
                      flexShrink: 0,
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlays */}
      <AnimatePresence>
        {(uploadingIcon || uploadingBanner) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div style={{
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              padding: '24px 32px',
              color: 'var(--ghost-white)',
              fontFamily: "'Share Tech Mono', monospace",
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div className="spinner" style={{ width: '20px', height: '20px' }} />
              Uploading...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerProfile;
