import React, { useState, useRef } from 'react';
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
import AuditLog from './AuditLog';

const TABS = [
  { key: 'OVERVIEW', label: 'OVERVIEW' },
  { key: 'ROLES', label: 'ROLES' },
  { key: 'CATEGORIES', label: 'CATEGORIES' },
  { key: 'BANS', label: 'BANS' },
  { key: 'WEBHOOKS', label: 'WEBHOOKS' },
  { key: 'EMOJI', label: 'EMOJI' },
  { key: 'AUDIT', label: 'AUDIT LOG' },
];

const ServerSettings: React.FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { servers, selectedServer } = useServerStore();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [iconBusy, setIconBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const { addToast } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Resolve server — prefer selectedServer, fall back to servers list by URL param
  const server = serverId
    ? (selectedServer?.id === serverId ? selectedServer : servers.find((s) => s.id === serverId))
    : selectedServer;

  if (!server) {
    return (
      <div style={{ padding: '24px', color: 'var(--ash)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div style={{ fontSize: '32px', opacity: 0.3 }}>🔭</div>
        <div>Realm not found.</div>
        <button className="angular-button" onClick={() => navigate('/friends')}>← Back</button>
      </div>
    );
  }

  const isOwner = server.ownerId ===
    (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id; } catch { return ''; } })();
  const isAdmin = server.members?.some(
    (m: any) => m.userId === (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id; } catch { return ''; } })() && ['FOUNDER', 'ADMIN'].includes(m.role)
  );

  const canManage = isOwner || isAdmin;

  const handleDeleteServer = async () => {
    if (!window.confirm(`💀 Permanently delete "${server.name}"? This cannot be undone.`)) return;
    try {
      await deleteServer(server.id);
      // Remove server from store
      useServerStore.getState().removeServer(server.id);
      addToast(`Deleted ${server.name}.`, 'info');
      navigate('/friends');
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete server.', 'error');
    }
  };

  return (
    <div className="settings-page" style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'Cinzel Decorative, serif', color: 'var(--ghost-white)', marginBottom: '20px' }}>
        {server.name} — SETTINGS
      </h2>

      <div className="profile-tabs" style={{ marginBottom: '20px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => {
              if ((tab.key === 'ROLES' || tab.key === 'BANS' || tab.key === 'AUDIT' || tab.key === 'WEBHOOKS') && !canManage) {
                addToast('You need admin privileges.', 'error');
                return;
              }
              setActiveTab(tab.key);
            }}
            style={{
              opacity: (tab.key === 'ROLES' || tab.key === 'BANS' || tab.key === 'AUDIT' || tab.key === 'WEBHOOKS') && !canManage ? 0.4 : 1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: 'var(--ash)', fontSize: '11px', marginBottom: '8px', letterSpacing: '0.1em' }}>SERVER ICON</p>
              <motion.div
                className="octagon"
                animate={{ 
                  scale: 1,
                  boxShadow: 'none'
                }}
                whileHover={{ scale: 1.02 }}
                style={{
                  width: '100px',
                  height: '100px',
                  overflow: 'hidden',
                  background: server.icon 
                    ? 'var(--obsidian)' 
                    : 'linear-gradient(135deg, #2a3038, #4a535f)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: canManage ? 'pointer' : 'default',
                }}
                onClick={() => canManage && fileInputRef.current?.click()}
              >
                {server.icon ? (
                  <img 
                    src={`${API_BASE}${server.icon.startsWith('/') ? server.icon : '/' + server.icon}`} 
                    alt="" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      display: 'block',
                      transform: iconBusy ? 'scale(0.95)' : 'scale(1)',
                      transition: 'transform 0.2s ease'
                    }} 
                  />
                ) : (
                  <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '36px' }}>
                    {server?.name[0]?.toUpperCase()}
                  </span>
                )}
                
                {/* Hover overlay for change */}
                <AnimatePresence>
                  {canManage && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ghost-white)',
                        fontSize: '11px',
                        fontFamily: "'Share Tech Mono', monospace",
                      }}
                    >
                      CHANGE
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {canManage && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: 'var(--chaos)',
                      border: '1px solid var(--chaos)',
                      borderRadius: '4px',
                      color: 'var(--ghost-white)',
                      fontSize: '11px',
                      fontFamily: "'Share Tech Mono', monospace",
                      cursor: iconBusy ? 'wait' : 'pointer',
                      opacity: iconBusy ? 0.7 : 1,
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {server.icon ? 'CHANGE ICON' : 'UPLOAD ICON'}
                  </motion.button>
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
                        // Refresh server data
                        useServerStore.getState().fetchServers();
                      } catch (err: any) {
                        // Handle specific error cases
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
                </>
              )}
              
              <p style={{ color: 'var(--shadow)', fontSize: '10px', marginTop: '8px', maxWidth: '100px', textAlign: 'center' }}>
                PNG, JPG, GIF, or WebP • Max 5MB
              </p>
            </div>

            {/* Server Banner Upload */}
            {canManage && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: 'var(--ash)', fontSize: '11px', marginBottom: '8px', letterSpacing: '0.1em' }}>SERVER BANNER</p>
                {/* Banner Preview */}
                <div
                  style={{
                    width: '100%',
                    height: '80px',
                    overflow: 'hidden',
                    background: server.banner
                      ? 'var(--obsidian)'
                      : 'linear-gradient(135deg, #2a3038, #4a535f)',
                    border: '1px solid var(--rim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {server.banner ? (
                    <img
                      src={`${API_BASE}${server.banner.startsWith('/') ? server.banner : '/' + server.banner}`}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      transform: bannerBusy ? 'scale(0.95)' : 'scale(1)',
                      transition: 'transform 0.2s ease' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>No banner set</span>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ghost-white)',
                      fontSize: '11px',
                      fontFamily: "'Share Tech Mono', monospace",
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  >
                    {server.banner ? 'CHANGE BANNER' : 'UPLOAD BANNER'}
                  </div>
                </div>
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
                      // Handle specific error cases
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
                <p style={{ color: 'var(--shadow)', fontSize: '10px' }}>
                  Wide image recommended • PNG, JPG, GIF, WebP • Max 5MB
                </p>
              </div>
            )}
            
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div className="vox-setting-row">
                <span className="vox-setting-label">SERVER NAME</span>
                <span className="vox-setting-value">{server.name}</span>
              </div>
              <div className="vox-setting-row">
                <span className="vox-setting-label">DESCRIPTION</span>
                <span className="vox-setting-value">{server.description || 'None'}</span>
              </div>
              <div className="vox-setting-row">
                <span className="vox-setting-label">VERIFICATION</span>
                <span className="vox-setting-value">{server.verificationLevel || 'NONE'}</span>
              </div>
              <div className="vox-setting-row">
                <span className="vox-setting-label">VANITY URL</span>
                <span className="vox-setting-value">{server.vanityUrl ? `/${server.vanityUrl}` : 'None'}</span>
              </div>
              <div className="vox-setting-row">
                <span className="vox-setting-label">OWNER</span>
                <span className="vox-setting-value">{server.ownerId}</span>
              </div>
              <div className="vox-setting-row">
                <span className="vox-setting-label">MEMBERS</span>
                <span className="vox-setting-value">{server.members?.length || 0}</span>
              </div>
              <div className="vox-setting-row">
                <span className="vox-setting-label">ICON</span>
                <span className="vox-setting-value">{server.icon ? '✅ Set' : '❌ None'}</span>
              </div>
              <div className="vox-setting-row">
                <span className="vox-setting-label">BANNER</span>
                <span className="vox-setting-value">{server.banner ? '✅ Set' : '❌ None'}</span>
              </div>
              {isOwner && (
                <div className="vox-setting-row" style={{ marginTop: '24px' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteServer}
                    style={{
                      marginTop: '12px',
                      padding: '12px 24px',
                      background: 'var(--chaos)',
                      border: '1px solid var(--chaos)',
                      borderRadius: '4px',
                      color: 'var(--ghost-white)',
                      fontSize: '11px',
                      fontFamily: "'Share Tech Mono', monospace",
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      letterSpacing: '0.1em',
                    }}
                  >
                    DELETE SERVER
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ROLES' && canManage && <RolesPanel serverId={server.id} />}
      {activeTab === 'BANS' && canManage && <BanList serverId={server.id} />}
      {activeTab === 'CATEGORIES' && canManage && <CategoryManager serverId={server.id} />}
      {activeTab === 'WEBHOOKS' && canManage && <WebhookPanel serverId={server.id} />}
      {activeTab === 'EMOJI' && canManage && <EmojiPanel serverId={server.id} />}
      {activeTab === 'AUDIT' && canManage && <AuditLog serverId={server.id} />}
    </div>
  );
};

export default ServerSettings;
