import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format, isToday, isThisWeek, differenceInSeconds, differenceInMinutes, differenceInHours } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, api } from '../../api/client';
import { Message } from '../../stores/messageStore';
import { markMessageRead } from '../../api/messages';
import { useSocketStore } from '../../stores/socketStore';
import { useMessageStore } from '../../stores/messageStore';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import ContextMenu from '../ui/ContextMenu';
import RoleBadge from '../ui/RoleBadge';
import ConfirmDialog from '../settings/ConfirmDialog';
import ReportModal from '../ui/ReportModal';
import RichText from './RichText';
import LinkPreviewCard from './LinkPreviewCard';
import ThreadIndicator from './ThreadIndicator';
import EditHistoryModal from './EditHistoryModal';
import AttachmentList from './AttachmentList';
import SeenByStack from './SeenByStack';
import { normalizeRole, ROLES, roleGlowShadow } from '../../config/roles';
import { IconEdit, IconReply, IconReact, IconCopy, IconLink, IconBookmark, IconPin, IconDelete, IconFlag } from './Icons';

interface Props {
  message: Message;
  isGrouped: boolean;
  isOwn: boolean;
  myUsername?: string;
  myId?: string;
  myRole?: string;
}

function resolveAvatarUrl(url?: string) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function Ticks({ status }: { status?: 'sent' | 'delivered' | 'read' }) {
  const s = status || 'sent';
  const color =
    s === 'read'
      ? 'var(--accent)'
      : s === 'delivered'
      ? 'var(--ash)'
      : 'var(--shadow)';
  const shadow = s === 'read' ? '0 0 6px var(--accent-glow)' : 'none';
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        display: 'inline-block',
        fontSize: '10px',
        color,
        textShadow: shadow,
        marginLeft: '6px',
        lineHeight: 1.5,
      }}
      aria-label={`Message ${s}`}
    >
      {s === 'sent' ? '✓' : '✓✓'}
    </motion.span>
  );
}

function formatRelativeTime(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();
  
  const diffSecs = differenceInSeconds(now, d);
  if (diffSecs < 60) return 'just now';
  
  const diffMins = differenceInMinutes(now, d);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = differenceInHours(now, d);
  if (diffHours < 24 && isToday(d)) return `${diffHours} hours ago`;
  
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
  if (isThisWeek(d)) return `${format(d, 'EEEE')} at ${format(d, 'h:mm a')}`;
  return `${format(d, 'MMM d')} at ${format(d, 'h:mm a')}`;
}

const MessageBubble: React.FC<Props> = React.memo(({ message, isGrouped, isOwn: isOwnProp, myUsername, myId: myIdProp, myRole: myRoleProp }) => {
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  const { setReplyingTo, messages } = useMessageStore();
  const { setThreadMessageId, setShowPinnedPanel, addToast, threadUnread } = useUiStore();
  const { selectedServer } = useServerStore();
  const { show, hide, contextMenu } = useContextMenu();
  const messageRowRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editValue, setEditValue] = useState(message.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);
  const chevronRef = useRef<HTMLButtonElement | null>(null);
  const [chevronRect, setChevronRect] = useState<DOMRect | null>(null);

  // Close the popover on outside click / Escape. Anchored to the popover
  // container via [data-vox-context-menu] (set by the ContextMenu component)
  // so clicks inside the menu itself don't immediately dismiss it.
  useEffect(() => {
    if (!popover) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-vox-context-menu]')) return;
      if (chevronRef.current && chevronRef.current.contains(target)) return;
      setPopover(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(null);
    };
    // Capture-phase so we beat the chevron's own stopPropagation on the
    // *first* outside click. Using a microtask delay would be racy with the
    // open-click handler — capture-phase resolves it cleanly.
    window.addEventListener('mousedown', onPointer, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [popover]);

  // Reset editValue when message changes (e.g. from socket update)
  useEffect(() => {
    if (!isEditing) setEditValue(message.body);
  }, [message.body, isEditing]);

  // Mark message as read when it scrolls into view
  useEffect(() => {
    const el = messageRowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          markMessageRead(message.id).catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [message.id]);

  // Belt-and-suspenders ownership check. The parent (MessageArea) does the
  // standard `msg.userId === myId` comparison, but if `vox_user` is stale or
  // missing for any reason we'd silently lose the toolbar. Read localStorage
  // here too and treat the message as own if either check matches.
  const myId = myIdProp || (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id; }
    catch { return undefined; }
  })();
  const myName = myUsername || (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.username; } catch { return undefined; }
  })();
  const isOwn =
    !!isOwnProp ||
    !!myId && (
      message.userId === myId ||
      message.author?.id === myId ||
      (!message.userId && !!myName && message.authorOverride === myName)
    );

  const saveEdit = async () => {
    const newBody = editValue.trim();
    if (!newBody || newBody === message.body) {
      setIsEditing(false);
      setEditValue(message.body);
      return;
    }
    // Optimistic update
    useMessageStore.getState().updateMessage(message.channelId, { ...message, body: newBody, edited: true });
    setIsEditing(false);
    try {
      await api(`/api/messages/${message.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: newBody }),
      });
    } catch (err: any) {
      // Revert on error
      useMessageStore.getState().updateMessage(message.channelId, { ...message, body: message.body, edited: message.edited });
      addToast(err?.message || 'Failed to edit.', 'error');
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue(message.body);
  };

  const role = normalizeRole(message.author?.role);
  const roleDef = ROLES[role];
  const authorName =
    message.author?.username ||
    message.author?.displayName ||
    message.authorOverride ||
    'Unknown';
  const avatarUrl = resolveAvatarUrl(message.author?.avatarUrl);

  const gifMatch = message.body.match(/^\[GIF\]\s*(\S+)\s*$/i);
  const isGif = !!gifMatch;
  const gifUrl = gifMatch ? gifMatch[1] : null;
  const [gifLoaded, setGifLoaded] = useState(false);
  useEffect(() => { setGifLoaded(false); }, [gifUrl]);
  const textBody = isGif
    ? message.body.replace(/^\[GIF\]\s*\S+\s*/i, '').trim()
    : message.body;

  const myRole = (myRoleProp || (() => {
    try { return (JSON.parse(localStorage.getItem('vox_user') || '{}')?.role || '').toUpperCase(); } catch { return ''; }
  })());
  const canModerate = ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(myRole);

  const handleCopyText = async () => {
    try { await navigator.clipboard.writeText(message.body); addToast('📋 Copied.', 'success'); } catch {}
  };
  const handleCopyLink = async () => {
    const link = `vox://${message.channelId}/${message.id}`;
    try { await navigator.clipboard.writeText(link); addToast('🔗 Link copied.', 'success'); } catch {}
  };
  const handleReply = () => setReplyingTo(message);
  const handlePin = async () => {
    try {
      const res = await api(`/api/messages/${message.id}/pin`, { method: 'POST' });
      addToast(res?.pinned ? '📌 Pinned.' : '📌 Unpinned.', 'success');
    } catch (e: any) { addToast(e?.message || 'Failed to pin.', 'error'); }
  };
  const handleDelete = async () => {
    const channelId = message.channelId;
    const msgId = message.id;
    // Optimistic: remove immediately from UI
    useMessageStore.getState().removeMessage(channelId, msgId);
    addToast('🗑️ Deleted.', 'info');
    try {
      await api(`/api/messages/${msgId}`, { method: 'DELETE' });
    } catch (err: any) {
      // If the server rejected it (e.g. permission), restore the message so the
      // user sees the failure instead of a phantom delete.
      useMessageStore.getState().addMessage(channelId, message);
      addToast(err?.message || 'Failed to delete on server.', 'error');
    }
  };

  const requestDelete = () => setConfirmDelete(true);
  const handleAddReaction = (emoji: string) => {
    useSocketStore.getState().reactToMessage(message.id, emoji);
  };

  const isBookmarked = (() => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem('vox_bookmarks') || '[]');
      return bookmarks.some((b: any) => b.id === message.id);
    } catch { return false; }
  })();

  const toggleBookmark = () => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem('vox_bookmarks') || '[]');
      if (isBookmarked) {
        const next = bookmarks.filter((b: any) => b.id !== message.id);
        localStorage.setItem('vox_bookmarks', JSON.stringify(next));
        addToast('🔖 Removed bookmark.', 'info');
      } else {
        bookmarks.push({
          id: message.id,
          body: message.body.slice(0, 200),
          author: authorName,
          channelId: message.channelId,
          createdAt: message.createdAt,
        });
        localStorage.setItem('vox_bookmarks', JSON.stringify(bookmarks));
        addToast('🔖 Bookmarked.', 'success');
      }
    } catch { addToast('Failed to bookmark.', 'error'); }
  };

  const quickMenuItems: MenuItem[] = [
    ...(isOwn
      ? [{ id: 'edit', label: 'Edit Message', icon: <IconEdit />, onClick: () => setIsEditing(true) }]
      : []),
    { id: 'delete', label: 'Delete Message', icon: <IconDelete />, danger: true, onClick: requestDelete },
  ];

  const ownMenuItems: MenuItem[] = [
    { id: 'edit', label: 'Edit Message', icon: <IconEdit />, onClick: () => setIsEditing(true) },
    { id: 'reply', label: 'Reply', icon: <IconReply />, onClick: handleReply },
    { id: 'react', label: 'Add Reaction', icon: <IconReact />, onClick: () => handleAddReaction('👍') },
    { id: 'copy', label: 'Copy Text', icon: <IconCopy />, onClick: handleCopyText },
    { id: 'copylink', label: 'Copy Link', icon: <IconLink />, onClick: handleCopyLink },
    { id: 'bookmark', label: isBookmarked ? 'Remove Bookmark' : 'Bookmark', icon: <IconBookmark />, onClick: toggleBookmark },
    ...(canModerate ? [{ id: 'pin', label: 'Pin Message', icon: <IconPin />, onClick: handlePin }] : []),
    { id: 'd1', label: '', divider: true },
    { id: 'delete', label: 'Delete Message', icon: <IconDelete />, danger: true, onClick: requestDelete },
  ];

  const otherMenuItems: MenuItem[] = [
    { id: 'reply', label: 'Reply', icon: <IconReply />, onClick: handleReply },
    { id: 'react', label: 'Add Reaction', icon: <IconReact />, onClick: () => handleAddReaction('👍') },
    { id: 'copy', label: 'Copy Text', icon: <IconCopy />, onClick: handleCopyText },
    { id: 'copylink', label: 'Copy Link', icon: <IconLink />, onClick: handleCopyLink },
    { id: 'bookmark', label: isBookmarked ? 'Remove Bookmark' : 'Bookmark', icon: <IconBookmark />, onClick: toggleBookmark },
    ...(canModerate ? [{ id: 'pin', label: 'Pin Message', icon: <IconPin />, onClick: handlePin }] : []),
    { id: 'd1', label: '', divider: true },
    { id: 'report', label: 'Report', icon: <IconFlag />, onClick: () => setShowReport(true) },
    ...(canModerate
      ? [{ id: 'delete', label: 'Delete Message (Mod)', icon: <IconDelete />, danger: true, onClick: requestDelete }]
      : []),
  ].filter(Boolean) as MenuItem[];

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    show(e.clientX, e.clientY, isOwn ? ownMenuItems : otherMenuItems);
  };

  const threadReplies = (messages[message.channelId] || []).filter(
    (m) => m.parentId === message.id,
  );
  const threadCount = threadReplies.length;
  const lastReply = threadReplies[threadReplies.length - 1];

  const urlMatch = textBody.match(/(https?:\/\/\S+)/i);
  const previewUrl = isGif ? null : urlMatch?.[1];

  return (
    <>
      <motion.div
        ref={messageRowRef}
        className={`message-row ripple-container ${message.pinned ? 'vox-message-pinned' : ''} ${isOwn ? 'own-message' : ''}`}
        data-message-id={message.id}
        onContextMenu={onContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); }}
        onDoubleClick={() => handleAddReaction('👍')}
        initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{
          opacity: 0,
          scale: 0.8,
          filter: 'blur(8px)',
          transition: { duration: 0.4, ease: 'easeIn' },
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: '16px',
        padding: '6px 16px',
        marginTop: isGrouped ? '0' : '14px',
        position: 'relative',
        alignItems: 'flex-start',
        minWidth: 0,
        overflow: 'visible',
      }}
    >
      {/* Discord-style floating hover actions bar */}
      <AnimatePresence>
        {isHovered && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: '-14px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              borderRadius: '6px',
              padding: '2px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              zIndex: 20,
            }}
            onMouseEnter={() => setIsHovered(true)}
          >
            {/* More (three dots) */}
            <button
              type="button"
              ref={chevronRef}
              title="More"
              onClick={(e) => {
                e.stopPropagation();
                if (popover) { setPopover(null); return; }
                const rect = chevronRef.current?.getBoundingClientRect();
                if (!rect) return;
                const MENU_W = 220;
                const x = Math.max(8, rect.right - MENU_W);
                const y = rect.bottom + 8;
                setPopover({ x, y });
              }}
              style={{
                width: '28px', height: '28px', border: 'none', background: 'transparent',
                color: 'var(--ash)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: '4px', fontSize: '14px',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--ghost-white)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ash)'; }}
            >
              ⋯
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ width: '48px', flexShrink: 0 }}>
        {!isGrouped && (
          <div
            className="octagon"
            style={{
              width: '48px',
              height: '48px',
              overflow: 'hidden',
              background:
                message.author?.color ||
                'linear-gradient(135deg, var(--dark-matter), var(--phantom), var(--text-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span style={{ color: 'var(--bg-void)', fontWeight: 800, fontSize: '18px' }}>
                {authorName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%', overflow: 'visible' }}>
        {!isGrouped && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                color: roleDef.color,
                fontWeight: 'bold',
                textShadow: roleGlowShadow(role),
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                hoverTimerRef.current = setTimeout(() => {
                  useUiStore.getState().openProfilePopup(
                    { id: message.author?.id || '', username: message.author?.username || '', displayName: message.author?.displayName || authorName, avatarUrl: message.author?.avatarUrl || null, bannerUrl: null, status: message.author?.status, role: message.author?.role, bio: (message.author as any)?.bio, hasTurbo: message.author?.hasTurbo, memberSince: (message.author as any)?.createdAt },
                    { x: rect.right + 12, y: rect.top }
                  );
                }, 500);
              }}
              onMouseLeave={() => {
                if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
              }}
            >
              {authorName}
            </span>
            {message.author?.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}
            <RoleBadge role={role} />
            <span 
              title={format(new Date(message.createdAt), 'EEEE, MMMM d, yyyy h:mm:ss a')}
              style={{ fontSize: '12px', color: 'var(--ash)', cursor: 'default' }}
            >
              {formatRelativeTime(message.createdAt)}
            </span>
          </div>
        )}

        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%' }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              padding: '6px 10px',
              background: 'rgba(216, 74, 90, 0.08)',
              borderLeft: '2px solid var(--blood)',
              borderRadius: '0 4px 4px 0',
            }}>
              <IconEdit />
              <span style={{ fontSize: '11px', color: 'var(--ash)', fontFamily: "'Share Tech Mono', monospace" }}>
                Editing message
              </span>
            </div>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === 'Escape') {
                  cancelEdit();
                }
              }}
              className="angular-input"
              autoFocus
              rows={Math.max(2, editValue.split('\n').length)}
              aria-label="Edit message"
              style={{ 
                width: '100%', 
                resize: 'vertical', 
                minHeight: '48px',
                background: 'var(--void)',
                border: '1px solid var(--rim)',
                padding: '10px 12px',
              }}
            />
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px', 
              marginTop: '8px' 
            }}>
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                fontSize: '10px',
                color: 'var(--shadow)',
                fontFamily: "'Share Tech Mono', monospace",
              }}>
                <kbd style={{
                  padding: '2px 5px',
                  background: 'var(--obsidian)',
                  borderRadius: '3px',
                  border: '1px solid var(--rim)',
                }}>Enter</kbd>
                <span style={{ color: 'var(--ash)' }}>to save</span>
                <kbd style={{
                  padding: '2px 5px',
                  background: 'var(--obsidian)',
                  borderRadius: '3px',
                  border: '1px solid var(--rim)',
                  marginLeft: '8px',
                }}>Esc</kbd>
                <span style={{ color: 'var(--ash)' }}>to cancel</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="angular-button"
                  onClick={cancelEdit}
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: '11px', 
                    background: 'var(--obsidian)', 
                    color: 'var(--ash)',
                    border: '1px solid var(--rim)',
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="angular-button primary"
                  onClick={saveEdit}
                  disabled={!editValue.trim()}
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: '11px',
                    opacity: editValue.trim() ? 1 : 0.5,
                  }}
                >
                  SAVE
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {(message as any).parentMessage && (
              <div
                onClick={() => {
                  const parent = (message as any).parentMessage;
                  const el = parent.id ? document.querySelector('[data-message-id="' + parent.id + '"]') : null;
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('vox-message-highlight');
                    setTimeout(() => el.classList.remove('vox-message-highlight'), 1600);
                  }
                }}
                className='vox-reply-quote'
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                  paddingLeft: 8,
                  borderLeft: '2px solid rgba(216,74,90,0.45)',
                  fontSize: 12,
                  color: 'var(--shadow)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  minHeight: 18,
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
                title={'Jump to original message'}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(216,74,90,0.85)'; (e.currentTarget as HTMLElement).style.color = 'var(--ash)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(216,74,90,0.45)'; (e.currentTarget as HTMLElement).style.color = 'var(--shadow)'; }}
              >
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round' style={{ flexShrink: 0, opacity: 0.7 }} aria-hidden>
  <path d='M9 14l-5-4 5-4' />
  <path d='M4 10h9a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6h-3' />
</svg>
                <span style={{
                  fontWeight: 600,
                  color: 'var(--ash)',
                  flexShrink: 0,
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  @{(message as any).parentMessage.author?.displayName || (message as any).parentMessage.author?.username || 'user'}
                </span>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  opacity: 0.85,
                }}>
                  {((message as any).parentMessage.body || '').slice(0, 90) || '[attachment]'}
                </span>
              </div>
            )}
            {textBody && (
              <div
                style={{
                  color: 'var(--ghost-white)',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  width: '100%',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <RichText text={textBody} serverId={selectedServer?.id} />
                {message.edited && (
                  <span
                    role='button'
                    onClick={() => setHistoryOpen(message.id)}
                    style={{
                      fontSize: '10px',
                      color: 'var(--ash)',
                      marginLeft: '6px',
                      verticalAlign: 'middle',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(140,149,163,0.08)',
                      border: '1px solid rgba(140,149,163,0.14)',
                      cursor: 'help',
                      transition: 'background 0.15s ease, border-color 0.15s ease',
                    }}
                    title={(() => {
                      const stamp = (message as { editedAt?: string | Date }).editedAt;
                      if (stamp) {
                        try { return 'Last edited ' + new Date(stamp).toLocaleString(); }
                        catch { return 'Last edited'; }
                      }
                      return 'Edited';
                    })()}
                  >
                    edited
                  </span>
                )}
                {isOwn && <Ticks status={(message as any).status} />}
              </div>
            )}
            {previewUrl && (
              <div style={{ maxWidth: '400px', width: '100%' }}>
                <LinkPreviewCard url={previewUrl} />
              </div>
            )}
            {isGif && gifUrl && (
              <a
                href={gifUrl}
                target="_blank"
                rel="noreferrer"
                className="message-media-link"
                style={{ display: 'block', marginTop: '6px', width: '100%', maxWidth: 'min(420px, 100%)' }}
              >
                <img
                  src={gifUrl}
                  alt="GIF"
                  className="gif-message"
                  onLoad={() => setGifLoaded(true)}
                  style={{
                    width: 'auto',
                    maxWidth: '100%',
                    maxHeight: '320px',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
                    cursor: 'pointer',
                    opacity: gifLoaded ? 1 : 0,
                    transform: gifLoaded ? 'none' : 'scale(0.98)',
                    transition: 'opacity 0.25s ease, transform 0.25s ease',
                    background: gifLoaded ? 'transparent' : 'rgba(255,255,255,0.04)',
                  }}
                />
              </a>
            )}
            <AttachmentList attachments={message.attachments} />
            {/* Animated reaction pills */}
            {message.reactions && message.reactions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {(() => {
                  // Group reactions by emoji and count
                  const grouped: Record<string, number> = {};
                  message.reactions.forEach((r: any) => {
                    const emoji = r.emoji || r;
                    grouped[emoji] = (grouped[emoji] || 0) + 1;
                  });
                  return Object.entries(grouped).map(([emoji, count]) => (
                    <motion.button
                      key={emoji}
                      type="button"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAddReaction(emoji)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        background: 'rgba(102,0,204,0.12)',
                        border: '1px solid rgba(102,0,204,0.25)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(102,0,204,0.25)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(102,0,204,0.5)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(102,0,204,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(102,0,204,0.25)'; }}
                    >
                      <span>{emoji}</span>
                      <span style={{ color: 'var(--chaos)', fontSize: '11px', fontWeight: 600 }}>{count}</span>
                    </motion.button>
                  ));
                })()}
              </div>
            )}
            {threadCount > 0 && (
              <ThreadIndicator
                replyCount={threadCount}
                unreadCount={threadUnread[message.id] || 0}
                lastReplyAvatar={lastReply?.author?.avatarUrl}
                lastReplyTime={lastReply ? format(new Date(lastReply.createdAt), 'h:mm a') : ''}
                onClick={() => setThreadMessageId(message.id)}
              />
            )}
            {/* Read receipt — show avatar stack of who has seen this message */}
            <SeenByStack messageId={message.id} maxVisible={4} />
          </>
        )}
      </div>

      {createPortal(
        <>
          {contextMenu && (
            <ContextMenu {...contextMenu} onClose={hide} />
          )}
          {popover && (
            <ContextMenu
              x={popover.x}
              y={popover.y}
              items={quickMenuItems}
              onClose={() => { setPopover(null); setChevronRect(null); }}
              anchorRect={chevronRect}
            />
          )}
        </>,
        document.body
      )}
      </motion.div>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete message?"
          body="This message will be permanently removed from the channel."
          confirmLabel="DELETE"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false);
            await handleDelete();
          }}
          preview={message.body.slice(0, 150)}
        />
      )}
      {showReport && (
        <ReportModal
          reportedUserId={message.author?.id}
          messageId={message.id}
          onClose={() => setShowReport(false)}
        />
      )}
      <EditHistoryModal messageId={historyOpen} onClose={() => setHistoryOpen(null)} />
    </>
  );
});

export default MessageBubble;
