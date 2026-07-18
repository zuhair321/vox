import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { uploadServerIcon, uploadServerBanner } from '../../api/uploads';
import { deleteServer } from '../../api/discover';
import { API_BASE } from '../../api/client';
import RolesPanel from './RolesPanel';
import BanList from './BanList';
import CategoryManager from './CategoryManager';
import WebhookPanel from './WebhookPanel';
import EmojiPanel from './EmojiPanel';
import SoundboardPanel from './SoundboardPanel';
import BadgePanel from './BadgePanel';
import AutomodPanel from './AutomodPanel';
import AuditLog from './AuditLog';
import TemplatesPanel from './TemplatesPanel';
import WidgetPanel from './WidgetPanel';
import ModerationCenter from '../moderation/ModerationCenter';
import ServerLogo from '../ui/ServerLogo';

type TabKey = 'OVERVIEW' | 'ROLES' | 'CATEGORIES' | 'BANS' | 'WEBHOOKS' | 'EMOJI' | 'SOUNDBOARD' | 'BADGES' | 'AUTOMOD' | 'AUDIT' | 'TEMPLATES' | 'WIDGET' | 'MODERATION';

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  adminOnly: boolean;
}

const TABS: TabItem[] = [
  { key: 'OVERVIEW', label: 'Overview', icon: '🏠', adminOnly: false },
  { key: 'ROLES', label: 'Roles', icon: '🛡️', adminOnly: true },
  { key: 'CATEGORIES', label: 'Channels', icon: '📁', adminOnly: true },
  { key: 'BANS', label: 'Bans', icon: '🔨', adminOnly: true },
  { key: 'WEBHOOKS', label: 'Webhooks', icon: '🔗', adminOnly: true },
  { key: 'EMOJI', label: 'Emoji', icon: '😀', adminOnly: true },
  { key: 'SOUNDBOARD', label: 'Soundboard', icon: '🔊', adminOnly: true },
  { key: 'BADGES', label: 'Badges', icon: '🏅', adminOnly: true },
  { key: 'AUTOMOD', label: 'Auto-Mod', icon: '🤖', adminOnly: true },
  { key: 'AUDIT', label: 'Audit Log', icon: '📋', adminOnly: true },
  { key: 'TEMPLATES', label: 'Templates', icon: '📄', adminOnly: false },
  { key: 'WIDGET', label: 'Widget', icon: '🧩', adminOnly: true },
  { key: 'MODERATION', label: 'Moderation', icon: '🛡️', adminOnly: true },
];

const ServerSettings: React.FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { servers, selectedServer } = useServerStore();
  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const [iconBusy, setIconBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<TabKey | null>(null);
  const { addToast } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const userId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('vox_user') || '{}').id;
    } catch {
      return '';
    }
  }, []);

  const server = serverId
    ? (selectedServer?.id === serverId ? selectedServer : servers.find((s) => s.id === serverId))
    : selectedServer;

  if (!server) {
    return (
      <div style={{
        padding: '24px',
        color: 'var(--ash)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
        height: '100vh',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '48px', opacity: 0.3 }}>🔭</div>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Realm not found</div>
        <button className="angular-button" onClick={() => navigate('/friends')}>← Back to Friends</button>
      </div>
    );
  }

  const isOwner = server.ownerId === userId;
  const isAdmin = server.members?.some(
    (m: any) => m.userId === userId && ['FOUNDER', 'ADMIN'].includes(m.role)
  );
  const canManage = isOwner || isAdmin;

  const visibleTabs = TABS.filter(tab => !tab.adminOnly || canManage);

  const handleDeleteServer = async () => {
    if (!window.confirm(`💀 Permanently delete "${server.name}"? This cannot be undone.`)) return;
    try {
      await deleteServer(server.id);
      useServerStore.getState().removeServer(server.id);
      addToast(`Deleted ${server.name}.`, 'info');
      navigate('/friends');
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete server.', 'error');
    }
  };

  const renderOverview = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Banner + Server icon */}
      <div style={{ position: 'relative', paddingBottom: '32px' }}>
        <div style={{
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '100%',
            height: '180px',
            background: server.banner
              ? 'transparent'
              : 'linear-gradient(135deg, #1a1d23 0%, #2d323b 50%, #1a1d23 100%)',
            position: 'relative',
          }}>
            {server.banner && (
              <img
                src={`${API_BASE}${server.banner.startsWith('/') ? server.banner : '/' + server.banner}`}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            )}
            {!server.banner && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--shadow)',
                fontSize: '14px',
                letterSpacing: '0.05em',
              }}>
                SERVER BANNER
              </div>
            )}
            {canManage && (
              <div
                onClick={() => bannerInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: 'var(--ghost-white)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}>
                  {server.banner ? 'CHANGE BANNER' : 'UPLOAD BANNER'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Server icon overlaid on banner (outside clipped container) */}
        <ServerLogo
          src={server.icon ? `${API_BASE}${server.icon.startsWith('/') ? server.icon : '/' + server.icon}` : null}
          name={server.name}
          size={64}
          onClick={() => { if (canManage) fileInputRef.current?.click(); }}
          style={{
            position: 'absolute',
            bottom: '0px',
            left: '24px',
            border: '4px solid var(--abyss)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Server name */}
      <div style={{ marginTop: '48px', marginBottom: '4px' }}>
        <h2 style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--ghost-white)',
          margin: 0,
        }}>
          {server.name}
        </h2>
      </div>

      {/* Settings cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
        <div className="vox-card" style={{ padding: '20px 24px' }}>
          <div className="vox-setting-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--rim)' }}>
            <span className="vox-setting-label">SERVER NAME</span>
            <span className="vox-setting-value">{server.name}</span>
          </div>
          <div className="vox-setting-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--rim)' }}>
            <span className="vox-setting-label">DESCRIPTION</span>
            <span className="vox-setting-value">{server.description || 'No description set'}</span>
          </div>
          <div className="vox-setting-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--rim)' }}>
            <span className="vox-setting-label">VERIFICATION</span>
            <span className="vox-setting-value" style={{ textTransform: 'capitalize' }}>{server.verificationLevel?.toLowerCase() || 'None'}</span>
          </div>
          <div className="vox-setting-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--rim)' }}>
            <span className="vox-setting-label">VANITY URL</span>
            <span className="vox-setting-value">{server.vanityUrl ? `/${server.vanityUrl}` : 'Not set'}</span>
          </div>
          <div className="vox-setting-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--rim)' }}>
            <span className="vox-setting-label">OWNER</span>
            <span className="vox-setting-value">{server.ownerId}</span>
          </div>
          <div className="vox-setting-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--rim)' }}>
            <span className="vox-setting-label">MEMBERS</span>
            <span className="vox-setting-value">{server.members?.length || 0}</span>
          </div>
          <div className="vox-setting-row" style={{ padding: '10px 0' }}>
            <span className="vox-setting-label">CREATED</span>
            <span className="vox-setting-value">
              {server.createdAt ? new Date(server.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Unknown'}
            </span>
          </div>
        </div>

        {/* Danger zone */}
        {isOwner && (
          <div className="vox-card" style={{
            padding: '20px 24px',
            border: '1px solid rgba(216, 74, 90, 0.3)',
            background: 'rgba(216, 74, 90, 0.05)',
          }}>
            <h3 style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--chaos)',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Danger Zone
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}>
              <div>
                <div style={{ color: 'var(--ghost-white)', fontWeight: 500, fontSize: '14px' }}>
                  Delete Server
                </div>
                <div style={{ color: 'var(--shadow)', fontSize: '12px', marginTop: '2px' }}>
                  Permanently delete this server and all its data.
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteServer}
                style={{
                  padding: '10px 20px',
                  background: 'var(--chaos)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--ghost-white)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 12px var(--chaos-glow)',
                }}
              >
                Delete Server
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return renderOverview();
      case 'ROLES':
        return canManage ? <RolesPanel serverId={server.id} /> : null;
      case 'BANS':
        return canManage ? <BanList serverId={server.id} /> : null;
      case 'CATEGORIES':
        return canManage ? <CategoryManager serverId={server.id} /> : null;
      case 'WEBHOOKS':
        return canManage ? <WebhookPanel serverId={server.id} /> : null;
      case 'EMOJI':
        return canManage ? <EmojiPanel serverId={server.id} /> : null;
      case 'SOUNDBOARD':
        return canManage ? <SoundboardPanel serverId={server.id} /> : null;
      case 'BADGES':
        return canManage ? <BadgePanel serverId={server.id} members={server.members || []} /> : null;
      case 'AUTOMOD':
        return canManage ? <AutomodPanel serverId={server.id} /> : null;
      case 'AUDIT':
        return canManage ? <AuditLog serverId={server.id} /> : null;
      case 'TEMPLATES':
        return <TemplatesPanel serverId={server.id} />;
      case 'WIDGET':
        return canManage ? <WidgetPanel serverId={server.id} /> : null;
      case 'MODERATION':
        return canManage ? (
          <ModerationCenter
            serverId={server.id}
            members={(server.members || []).map((m: any) => ({ userId: m.userId, user: m.user }))}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        minWidth: '240px',
        background: 'linear-gradient(180deg, rgba(216, 74, 90, 0.03), transparent 26%), var(--abyss)',
        borderRight: '1px solid rgba(216, 74, 90, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Server banner mini */}
        <div style={{
          width: '100%',
          height: '64px',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {server.banner && (
            <img
              src={`${API_BASE}${server.banner.startsWith('/') ? server.banner : '/' + server.banner}`}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 0%, var(--abyss) 100%)',
          }} />
        </div>

        {/* Server info */}
        <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
          <h1 style={{
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--ghost-white)',
            margin: 0,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {server.name}
          </h1>
          <p style={{
            fontSize: '11px',
            color: 'var(--shadow)',
            margin: '4px 0 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Server Settings
          </p>
        </div>

        {/* Tab navigation */}
        <nav style={{
          flex: 1,
          padding: '0 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isHovered = hoveredTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                onMouseEnter={() => setHoveredTab(tab.key)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: isActive
                    ? 'rgba(216, 74, 90, 0.12)'
                    : isHovered
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'transparent',
                  color: isActive ? 'var(--ghost-white)' : 'var(--shadow)',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  textAlign: 'left',
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '20px',
                    background: 'var(--chaos)',
                    borderRadius: '0 2px 2px 0',
                    boxShadow: '0 0 8px var(--chaos-glow)',
                  }} />
                )}
                <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        overflowY: 'auto',
         background: 'var(--dark-matter)',
       }}>
         <div style={{
           maxWidth: '760px',
           margin: '0 auto',
           padding: '32px 40px 48px',
         }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/gif,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            addToast('Image must be under 5MB.', 'error');
            e.target.value = '';
            return;
          }
          setIconBusy(true);
          try {
            await uploadServerIcon(server.id, file);
            addToast('Icon updated', 'success');
            useServerStore.getState().fetchServers();
          } catch (err: any) {
            if (err.message?.includes('File type not allowed')) {
              addToast('Only GIF, PNG, JPG, and WebP files are allowed', 'error');
            } else if (err.message?.includes('File size too large')) {
              addToast('File size must be under 5MB', 'error');
            } else {
              addToast(err.message || 'Upload failed', 'error');
            }
          } finally {
            setIconBusy(false);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/gif,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            addToast('Image must be under 5MB.', 'error');
            e.target.value = '';
            return;
          }
          setBannerBusy(true);
          try {
            await uploadServerBanner(server.id, file);
            addToast('Banner updated', 'success');
            useServerStore.getState().fetchServers();
          } catch (err: any) {
            if (err.message?.includes('File type not allowed')) {
              addToast('Only GIF, PNG, JPG, and WebP files are allowed', 'error');
            } else if (err.message?.includes('File size too large')) {
              addToast('File size must be under 5MB', 'error');
            } else {
              addToast(err.message || 'Upload failed', 'error');
            }
          } finally {
            setBannerBusy(false);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default ServerSettings;
