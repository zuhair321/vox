import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDMStore } from '../../stores/dmStore';
import { useFriendStore } from '../../stores/friendStore';
import { useSocketStore } from '../../stores/socketStore';
import MessageInput from '../chat/MessageInput';
import AttachmentList from '../chat/AttachmentList';
import ConfirmDialog from '../settings/ConfirmDialog';
import ContextMenu from '../ui/ContextMenu';
import { useUiStore } from '../../stores/uiStore';
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
  const dmMessages = messages[dmId || ''] || [];
  const bottomRef = useRef<HTMLDivElement>(null);

  // Derive the other participant from the dmId (`idA_idB`, sorted). We drop our
  // own id from the parts; the remainder is the friend. Then resolve their
  // username/status from the friend store so the header shows real info instead
  // of the old hardcoded "@User".
  const friend = useMemo(() => {
    if (!dmId) return null;
    let myId = '';
    try { myId = JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || ''; } catch {}
    const otherId = dmId.replace(myId, '').replace(/^_+|_+$/g, '');
    if (!otherId) return null;
    return friends.find((f) => f.id === otherId) || { id: otherId, username: 'Unknown', status: 'offline' };
  }, [dmId, friends]);

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

  // Clear unread badge on mount — no redundant sends per-message
  useEffect(() => {
    if (dmId && dmMessages.length > 0) {
      markRead(dmId);
    }
  }, [dmId]);

  // Purge expired typing indicators every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => { purgeExpiredTyping(); }, 2000);
    return () => clearInterval(interval);
  }, [purgeExpiredTyping]);

  const { addToast } = useUiStore();
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
      useDMStore.getState().updateMessage({ ...(useDMStore.getState().messages[dmId || '']?.find(m => m.id === msgId) || {}), body: editValue.trim() } as any);
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

  // Close the hover action popover on outside click / Escape.
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
              <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '12px' }}>{(friend?.username || '?').slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--abyss)', padding: 1, display: 'flex' }}>
            <StatusDot status={(friend?.status || 'offline').toLowerCase()} size={9} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>@{friend?.username || 'Unknown'}{friend?.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}</span>
          <span style={{ fontSize: '11px', color: 'var(--ash)', textTransform: 'capitalize' }}>{(friend?.status || 'offline').toLowerCase()}</span>
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
            <div key={msg.id} className={`dm-message-row dm-message-animate`} style={{ display: 'flex', gap: '16px', animationDelay: `${Math.min(idx * 30, 300)}ms`, flexDirection: isOwn ? 'row-reverse' : 'row', position: 'relative' }}
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
                    position: 'absolute',
                    top: '-10px',
                    left: '12px',
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
              <div className="octagon" style={{ width: '32px', height: '32px', backgroundColor: isOwn ? 'var(--accent)' : 'var(--chaos)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {senderAvatar ? (
                  <img src={senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '14px' }}>{(msg.sender?.username || '?').slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div style={{ maxWidth: '70%', textAlign: isOwn ? 'right' : 'left' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                  <span style={{ color: isOwn ? 'var(--accent)' : 'var(--ghost-white)', fontWeight: 'bold' }}>{msg.sender?.username || 'Unknown'}{msg.sender?.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}</span>
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
