import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDMStore } from '../../stores/dmStore';
import { useFriendStore } from '../../stores/friendStore';
import { useSocketStore } from '../../stores/socketStore';
import MessageInput from '../chat/MessageInput';
import AttachmentList from '../chat/AttachmentList';
import ConfirmDialog from '../settings/ConfirmDialog';
import { useUiStore } from '../../stores/uiStore';
import { fetchDMMessages } from '../../api/dm';
import { api, API_BASE } from '../../api/client';
import { format } from 'date-fns';
import StatusDot from '../void/StatusDot';

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

  const saveEdit = async (msgId: string) => {
    if (!editValue.trim() || !dmId) return;
    try {
      await api(`/api/dm/${dmId}/messages/${msgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editValue.trim() }),
      });
      setEditingId(null);
      addToast('Message edited', 'success');
      fetchDMMessages(dmId).then((loaded: any) => {
        if (Array.isArray(loaded)) setMessages(dmId, loaded);
      });
    } catch (e: any) {
      addToast(e?.message || 'Edit failed', 'error');
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!dmId) return;
    try {
      await api(`/api/dm/${dmId}/messages/${msgId}`, { method: 'DELETE' });
      addToast('Deleted', 'success');
      fetchDMMessages(dmId).then((loaded: any) => {
        if (Array.isArray(loaded)) setMessages(dmId, loaded);
      });
    } catch (e: any) {
      addToast(e?.message || 'Delete failed', 'error');
    }
  };

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
            return (
            <div key={msg.id} className={`dm-message-row dm-message-animate`} style={{ display: 'flex', gap: '16px', animationDelay: `${Math.min(idx * 30, 300)}ms`, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
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
                    {isOwn && !msg.deleted && msg.content && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                        <button type="button" onClick={() => { setEditingId(msg.id); setEditValue(msg.content || ''); }} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--obsidian)', color: 'var(--ash)', border: '1px solid var(--rim)', cursor: 'pointer', fontFamily: "'Share Tech Mono', monospace" }}>EDIT</button>
                        <button type="button" onClick={() => setDeletingId(msg.id)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--crimson)', color: 'white', border: '1px solid var(--crimson)', cursor: 'pointer', fontFamily: "'Share Tech Mono', monospace" }}>DELETE</button>
                      </div>
                    )}
                  </>
                )}
                <AttachmentList attachments={msg.attachments} />
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
