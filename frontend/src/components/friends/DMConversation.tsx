import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, VolumeX, Volume2, Eye, EyeOff, User } from 'lucide-react';
import { useDMStore } from '../../stores/dmStore';
import { useFriendStore } from '../../stores/friendStore';
import { useSocketStore } from '../../stores/socketStore';
import MessageInput from '../chat/MessageInput';
import AttachmentList from '../chat/AttachmentList';
import ConfirmDialog from '../settings/ConfirmDialog';
import ContextMenu from '../ui/ContextMenu';
import { useUiStore } from '../../stores/uiStore';
import { useDmPrefStore } from '../../stores/dmPrefStore';
import { fetchDMMessages } from '../../api/dm';
import { api, API_BASE } from '../../api/client';
import { format } from 'date-fns';
import StatusDot from '../void/StatusDot';

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);
const IconDelete = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);

function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const DMConversation: React.FC = () => {
  const { dmId } = useParams<{ dmId: string }>();
  const navigate = useNavigate();
  const { messages, setMessages, selectDM, markRead, typing, purgeExpiredTyping } = useDMStore() as any;
  const { friends } = useFriendStore();
  const { sendDmRead } = useSocketStore();
  const dmPrefStore = useDmPrefStore();
  const dmMessages = messages[dmId || ''] || [];
  const bottomRef = useRef<HTMLDivElement>(null);

  // Settings dropdown state
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Fetch DM preferences on mount
  useEffect(() => {
    if (dmId) dmPrefStore.fetchPrefs(dmId);
  }, [dmId]);

  const dmPrefs = dmId ? dmPrefStore.getPrefs(dmId) : { muted: false, mutedUntil: null, showAvatar: true, showDisplayName: true };

  // Close settings dropdown on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [showSettings]);

  // Derive the other participant from the dmId
  const friend = useMemo(() => {
    if (!dmId) return null;
    let myId = '';
    try { myId = JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || ''; } catch {}
    const otherId = dmId.replace(myId, '').replace(/^_+|_+$/g, '');
    if (!otherId) return null;
    return friends.find((f) => f.id === otherId) || { id: otherId, username: 'Unknown', status: 'offline' };
  }, [dmId, friends]);

  const { addToast } = useUiStore();

  useEffect(() => {
    if (!dmId) return;
    selectDM(dmId);
    let alive = true;
    fetchDMMessages(dmId)
      .then((loaded) => {
        if (alive && Array.isArray(loaded)) setMessages(dmId, loaded);
        if (alive) {
          markRead(dmId);
          sendDmRead(dmId);
        }
      })
      .catch(() => {
        if (alive) addToast('Failed to load messages.', 'error');
      });
    return () => { alive = false; selectDM(null); };
  }, [dmId, selectDM, setMessages, markRead, sendDmRead]);

  useEffect(() => {
    if (dmId && dmMessages.length > 0) {
      markRead(dmId);
    }
  }, [dmId]);

  useEffect(() => {
    const interval = setInterval(() => { purgeExpiredTyping(); }, 2000);
    return () => clearInterval(interval);
  }, [purgeExpiredTyping]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLButtonElement | null>(null);

  const saveEdit = async (msgId: string) => {
    if (!editValue.trim() || !dmId) return;
    try {
      await api(`/api/dm/${dmId}/messages/${msgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editValue.trim() }),
      });
      setEditingId(null);
      addToast('Message edited', 'success');
      useDMStore.getState().updateMessage({ ...(useDMStore.getState().messages[dmId || '']?.find((m: any) => m.id === msgId) || {}), body: editValue.trim() } as any);
    } catch (e: any) {
      addToast(e?.message || 'Edit failed', 'error');
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!dmId) return;
    try {
      await api(`/api/dm/${dmId}/messages/${msgId}`, { method: 'DELETE' });
      addToast('Deleted', 'success');
      useDMStore.getState().removeMessage(dmId, msgId);
    } catch (e: any) {
      addToast(e?.message || 'Delete failed', 'error');
    }
  };

  useEffect(() => {
    if (!popover) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-vox-context-menu]')) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      setPopover(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopover(null); };
    window.addEventListener('mousedown', onPointer, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [popover]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  return (
    <div className="main-content animated-bg" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="top-bar" style={{ gap: '12px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => navigate('/friends')}
          aria-label="Back to friends"
          style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div className="octagon" style={{ width: '28px', height: '28px', backgroundColor: 'var(--chaos)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {resolveMediaUrl((friend as any)?.avatarUrl) ? (
              <img src={resolveMediaUrl((friend as any)?.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'var(--bg-void)', fontWeight: 800, fontSize: '12px' }}>{(friend?.username || '?').slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--abyss)', padding: 1, display: 'flex' }}>
            <StatusDot status={(friend?.status || 'offline').toLowerCase()} size={9} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>@{friend?.username || 'Unknown'}{friend?.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}</span>
          <span style={{ fontSize: '11px', color: 'var(--ash)', textTransform: 'capitalize' }}>
            {(friend?.status || 'offline').toLowerCase()}
            {dmPrefs.muted && <span style={{ marginLeft: '6px', color: 'var(--toxic)' }}>(muted)</span>}
          </span>
        </div>

        {/* Settings dropdown */}
        <div style={{ marginLeft: 'auto', position: 'relative' }} ref={settingsRef}>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="DM Settings"
            style={{
              background: showSettings ? 'rgba(255,255,255,0.06)' : 'none',
              border: '1px solid var(--rim)',
              borderRadius: '6px',
              color: showSettings ? 'var(--ghost-white)' : 'var(--ash)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--ghost-white)'; }}
            onMouseLeave={(e) => { if (!showSettings) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--ash)'; } }}
          >
            <Settings size={16} />
          </button>
          {showSettings && createPortal(
            <div
              style={{
                position: 'fixed',
                top: '48px',
                right: '16px',
                background: 'var(--obsidian)',
                border: '1px solid var(--rim)',
                borderRadius: '8px',
                padding: '8px 0',
                minWidth: '240px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                zIndex: 1000,
              }}
            >
              {/* Mute toggle */}
              <button
                type="button"
                onClick={() => { dmPrefStore.updatePrefs(dmId!, { muted: !dmPrefs.muted }); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 16px', background: 'none', border: 'none',
                  color: dmPrefs.muted ? 'var(--toxic)' : 'var(--ghost-white)',
                  cursor: 'pointer', fontSize: '13px', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {dmPrefs.muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                {dmPrefs.muted ? 'Unmute Conversation' : 'Mute Conversation'}
              </button>

              <div style={{ height: '1px', background: 'var(--rim)', margin: '4px 0' }} />

              {/* Privacy: Hide avatar */}
              <button
                type="button"
                onClick={() => dmPrefStore.updatePrefs(dmId!, { showAvatar: !dmPrefs.showAvatar })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 16px', background: 'none', border: 'none',
                  color: 'var(--ghost-white)', cursor: 'pointer', fontSize: '13px', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {dmPrefs.showAvatar ? <EyeOff size={15} /> : <Eye size={15} />}
                {dmPrefs.showAvatar ? "Hide Other's Avatar" : "Show Other's Avatar"}
              </button>

              {/* Privacy: Hide display name */}
              <button
                type="button"
                onClick={() => dmPrefStore.updatePrefs(dmId!, { showDisplayName: !dmPrefs.showDisplayName })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 16px', background: 'none', border: 'none',
                  color: 'var(--ghost-white)', cursor: 'pointer', fontSize: '13px', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {dmPrefs.showDisplayName ? <EyeOff size={15} /> : <Eye size={15} />}
                {dmPrefs.showDisplayName ? "Hide Other's Display Name" : "Show Other's Display Name"}
              </button>

              <div style={{ height: '1px', background: 'var(--rim)', margin: '4px 0' }} />

              {/* View profile */}
              <button
                type="button"
                onClick={() => { setShowSettings(false); addToast('Profile card coming soon', 'info'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 16px', background: 'none', border: 'none',
                  color: 'var(--ghost-white)', cursor: 'pointer', fontSize: '13px', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <User size={15} />
                View Profile
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
        {dmMessages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '48px', opacity: 0.2 }}>💬</h1>
            <p style={{ color: 'var(--ash)', marginTop: '16px' }}>THE CHANNEL IS SILENT</p>
            <p style={{ color: 'var(--shadow)', fontSize: '12px' }}>Send the first transmission.</p>
          </div>
        ) : (
          dmMessages.map((msg: any, idx: number) => {
            let myId = '';
            try { myId = JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || ''; } catch {}
            const isOwn = msg.senderId === myId;
            const senderAvatar = resolveMediaUrl(msg.sender?.avatarUrl);
            const menuOpen = popover?.msgId === msg.id;
            return (
            <div key={msg.id} className="dm-message-row dm-message-animate" style={{ display: 'flex', gap: '16px', animationDelay: `${Math.min(idx * 30, 300)}ms`, flexDirection: isOwn ? 'row-reverse' : 'row', position: 'relative' }}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === msg.id ? null : cur))}
            >
              {/* Discord-style hover action chevron */}
              {!msg.deleted && hoveredId === msg.id && editingId !== msg.id && (
                <button
                  type="button"
                  ref={menuOpen ? popoverRef : undefined}
                  title="More"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (popover?.msgId === msg.id) { setPopover(null); return; }
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const MENU_W = 200;
                    setPopover({ msgId: msg.id, x: Math.max(8, rect.right - MENU_W), y: rect.bottom + 8 });
                  }}
                  style={{
                    position: 'absolute', top: '-10px', left: '12px',
                    width: '28px', height: '28px', border: '1px solid var(--rim)', background: 'var(--dark-matter)',
                    color: 'var(--ash)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', borderRadius: '6px', fontSize: '14px', zIndex: 20,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--ghost-white)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--dark-matter)'; (e.currentTarget as HTMLElement).style.color = 'var(--ash)'; }}
                >
                  ⋯
                </button>
              )}

              {/* Avatar — respects privacy toggle for other person's messages */}
              {!isOwn && dmPrefs.showAvatar ? (
                <div className="octagon" style={{ width: '32px', height: '32px', backgroundColor: 'var(--chaos)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {senderAvatar ? (
                    <img src={senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--bg-void)', fontWeight: 800, fontSize: '14px' }}>{(msg.sender?.username || '?').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
              ) : isOwn ? (
                <div className="octagon" style={{ width: '32px', height: '32px', backgroundColor: 'var(--accent)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {senderAvatar ? (
                    <img src={senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--bg-void)', fontWeight: 800, fontSize: '14px' }}>{(msg.sender?.username || '?').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
              ) : (
                <div style={{ width: '32px', flexShrink: 0 }} />
              )}

              <div style={{ maxWidth: '70%', textAlign: isOwn ? 'right' : 'left' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                  {(!isOwn && dmPrefs.showDisplayName) || isOwn ? (
                    <span style={{ color: isOwn ? 'var(--accent)' : 'var(--ghost-white)', fontWeight: 'bold' }}>{msg.sender?.username || 'Unknown'}{msg.sender?.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}</span>
                  ) : (
                    <span style={{ color: 'var(--ash)', fontWeight: 'bold', fontStyle: 'italic' }}>Anonymous</span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--ash)' }}>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                </div>
                {editingId === msg.id ? (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(msg.id); if (e.key === 'Escape') { setEditingId(null); setEditValue(''); } }}
                      className="angular-input"
                      style={{ flex: 1, fontSize: '13px', padding: '4px 8px' }}
                      autoFocus
                    />
                    <button className="angular-button primary" onClick={() => saveEdit(msg.id)} style={{ padding: '4px 8px', fontSize: '11px' }}>SAVE</button>
                    <button className="angular-button" onClick={() => { setEditingId(null); setEditValue(''); }} style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--obsidian)', color: 'var(--ash)' }}>CANCEL</button>
                  </div>
                ) : (
                  <>
                    {msg.deleted ? (
                      <div style={{ color: 'var(--ash)', fontStyle: 'italic', fontSize: '13px' }}>
                        Message was deleted
                      </div>
                    ) : msg.content ? (
                      <div style={{ color: 'var(--ghost-white)', wordBreak: 'break-word' }}>
                        {msg.content}
                        {msg.edited && <span style={{ fontSize: '10px', color: 'var(--ash)', marginLeft: '4px' }}>(edited)</span>}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--ash)', fontStyle: 'italic', fontSize: '13px' }}>
                        Empty message
                      </div>
                    )}
                  </>
                )}
                <AttachmentList attachments={msg.attachments} />
                {menuOpen && popover && createPortal(
                  <ContextMenu
                    x={popover.x}
                    y={popover.y}
                    items={[
                      ...(isOwn
                        ? [{ id: 'edit', label: 'Edit Message', icon: <IconEdit />, onClick: () => { setEditingId(msg.id); setEditValue(msg.content || ''); setPopover(null); } }]
                        : []),
                      { id: 'delete', label: 'Delete Message', icon: <IconDelete />, danger: true, onClick: () => { setDeletingId(msg.id); setPopover(null); } },
                    ]}
                    onClose={() => setPopover(null)}
                  />,
                  document.body
                )}
              </div>
            </div>
            );
          })
        )}
        {/* Typing indicator */}
        {dmId && typing?.[dmId]?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px', color: 'var(--ash)' }}>
            <span style={{ display: 'flex', gap: '3px' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ash)', animation: 'typing-dot 1.2s infinite ease-in-out' }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ash)', animation: 'typing-dot 1.2s infinite ease-in-out 0.2s' }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ash)', animation: 'typing-dot 1.2s infinite ease-in-out 0.4s' }} />
            </span>
            <span>{typing[dmId].map((t: any) => t.username).join(', ')} {typing[dmId].length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '0 16px 24px 16px', flexShrink: 0 }}>
        <MessageInput dmId={dmId} />
      </div>

      {deletingId && (
        <ConfirmDialog
          title="Delete message?"
          body="This message will be permanently removed."
          confirmLabel="DELETE"
          onCancel={() => setDeletingId(null)}
          onConfirm={async () => {
            const id = deletingId;
            setDeletingId(null);
            if (id) await deleteMessage(id);
          }}
        />
      )}
    </div>
  );
};

export default DMConversation;
