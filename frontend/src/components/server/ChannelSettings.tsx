import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { api, API_BASE } from '../../api/client';
import { Trash2, AlertTriangle, Hash, Volume2, Eye, Clock, Type } from 'lucide-react';

interface ChannelSettingsProps {
  channelId: string;
  onClose: () => void;
}

const SLOWMODE_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
];

const ChannelSettings: React.FC<ChannelSettingsProps> = ({ channelId, onClose }) => {
  const { selectedServer } = useServerStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PERMISSIONS'>('OVERVIEW');

  // Find the channel from the server's channels
  const channel = selectedServer?.channels?.find((c: any) => c.id === channelId);

  const [name, setName] = useState(channel?.name || '');
  const [topic, setTopic] = useState(channel?.topic || '');
  const [nsfw, setNsfw] = useState(channel?.nsfw || false);
  const [slowmode, setSlowmode] = useState(channel?.slowmode || 0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!channel || !selectedServer) return null;

  const isOwner = selectedServer.ownerId ===
    (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id; } catch { return ''; } })();
  const isAdmin = selectedServer.members?.some(
    (m: any) => m.userId === (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id; } catch { return ''; } })() && ['FOUNDER', 'ADMIN'].includes(m.role)
  );
  const canManage = isOwner || isAdmin;

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: any = {};
      if (name !== channel.name) data.name = name;
      if (topic !== (channel.topic || '')) data.topic = topic;
      if (nsfw !== (channel.nsfw || false)) data.nsfw = nsfw;
      if (slowmode !== (channel.slowmode || 0)) data.slowmode = slowmode;

      if (Object.keys(data).length === 0) {
        addToast('No changes to save.', 'info');
        setSaving(false);
        return;
      }

      await api(`/api/servers/${selectedServer.id}/channels/${channelId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      // Update local state
      useServerStore.getState().updateChannel(selectedServer.id, channelId, data);
      addToast('Channel updated.', 'success');
      onClose();
    } catch (e: any) {
      addToast(e?.message || 'Failed to update channel.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== channel.name) {
      addToast('Channel name does not match.', 'error');
      return;
    }
    try {
      await api(`/api/servers/${selectedServer.id}/channels/${channelId}`, { method: 'DELETE' });
      useServerStore.getState().removeChannel(selectedServer.id, channelId);
      addToast(`Deleted #${channel.name}.`, 'info');
      onClose();
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete channel.', 'error');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--dark-matter)',
    border: '1px solid var(--rim)',
    borderRadius: '4px',
    color: 'var(--ghost-white)',
    fontSize: '13px',
    fontFamily: "'Share Tech Mono', monospace",
    outline: 'none',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--abyss)',
        border: '1px solid var(--rim)',
        borderRadius: '8px',
        width: 'min(560px, 92vw)',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--rim)',
          background: 'var(--obsidian)',
        }}>
          {channel.type === 'VOICE' ? <Volume2 size={16} color="var(--ash)" /> : <Hash size={16} color="var(--ash)" />}
          <span style={{ color: 'var(--ghost-white)', fontWeight: 700, fontSize: '14px', fontFamily: "'Share Tech Mono', monospace" }}>
            #{channel.name} — SETTINGS
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '8px 20px', borderBottom: '1px solid var(--rim)' }}>
          {(['OVERVIEW', 'PERMISSIONS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 12px',
                background: activeTab === tab ? 'rgba(216,74,90,0.1)' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(216,74,90,0.3)' : '1px solid transparent',
                borderRadius: '4px',
                color: activeTab === tab ? 'var(--chaos)' : 'var(--ash)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Channel Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }}>
                  CHANNEL NAME
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                  style={inputStyle}
                />
              </div>

              {/* Topic */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }}>
                  <Type size={12} /> TOPIC
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={!canManage}
                  rows={3}
                  maxLength={1024}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <div style={{ fontSize: '10px', color: 'var(--shadow)', marginTop: '4px' }}>{topic.length}/1024</div>
              </div>

              {/* NSFW Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={14} color={nsfw ? 'var(--blood)' : 'var(--ash)'} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--ghost-white)', fontWeight: 600 }}>NSFW Channel</div>
                    <div style={{ fontSize: '10px', color: 'var(--shadow)' }}>Age-restricted content</div>
                  </div>
                </div>
                <button
                  onClick={() => canManage && setNsfw(!nsfw)}
                  disabled={!canManage}
                  style={{
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    border: 'none',
                    background: nsfw ? 'var(--blood)' : 'var(--rim)',
                    cursor: canManage ? 'pointer' : 'not-allowed',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: nsfw ? '21px' : '3px',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>

              {/* Slowmode */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }}>
                  <Clock size={12} /> SLOWMODE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {SLOWMODE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => canManage && setSlowmode(opt.value)}
                      disabled={!canManage}
                      style={{
                        padding: '6px',
                        background: slowmode === opt.value ? 'rgba(216,74,90,0.15)' : 'var(--dark-matter)',
                        border: slowmode === opt.value ? '1px solid rgba(216,74,90,0.4)' : '1px solid var(--rim)',
                        borderRadius: '4px',
                        color: slowmode === opt.value ? 'var(--chaos)' : 'var(--ash)',
                        cursor: canManage ? 'pointer' : 'not-allowed',
                        fontSize: '10px',
                        fontFamily: "'Share Tech Mono', monospace",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--shadow)', marginTop: '4px' }}>
                  {slowmode > 0 ? `Members can send one message every ${slowmode >= 60 ? `${slowmode / 60}m` : `${slowmode}s`}` : 'No rate limit'}
                </div>
              </div>

              {/* Delete Channel */}
              {isOwner && (
                <div style={{ borderTop: '1px solid var(--rim)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlertTriangle size={14} color="var(--blood)" />
                    <span style={{ fontSize: '12px', color: 'var(--blood)', fontWeight: 600 }}>DELETE CHANNEL</span>
                  </div>
                  {!deleteConfirm ? (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="angular-button"
                      style={{ background: 'transparent', border: '1px solid var(--blood)', color: 'var(--blood)', padding: '6px 12px', fontSize: '11px' }}
                    >
                      <Trash2 size={12} /> Delete Channel
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--ash)' }}>
                        Type <strong style={{ color: 'var(--ghost-white)' }}>#{channel.name}</strong> to confirm deletion.
                      </div>
                      <input
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        placeholder={`#${channel.name}`}
                        style={inputStyle}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleDelete}
                          disabled={deleteInput !== channel.name}
                          style={{
                            padding: '6px 12px',
                            background: deleteInput === channel.name ? 'var(--blood)' : 'var(--rim)',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: deleteInput === channel.name ? 'pointer' : 'not-allowed',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          CONFIRM DELETE
                        </button>
                        <button
                          onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--rim)',
                            borderRadius: '4px',
                            color: 'var(--ash)',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'PERMISSIONS' && (
            <div style={{ fontSize: '12px', color: 'var(--ash)' }}>
              <p style={{ marginBottom: '12px' }}>Channel permission overrides will be available here.</p>
              <p style={{ fontSize: '11px', color: 'var(--shadow)' }}>
                Role-level permission overrides can be configured per channel. This feature is under development.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--rim)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: '4px', color: 'var(--ash)', cursor: 'pointer', fontSize: '11px' }}>
            CANCEL
          </button>
          {canManage && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="angular-button primary"
              style={{ padding: '6px 16px', fontSize: '11px' }}
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChannelSettings;
