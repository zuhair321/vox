import React, { useState } from 'react';
import { format, isToday, isThisWeek, differenceInSeconds, differenceInMinutes, differenceInHours } from 'date-fns';
import { motion } from 'framer-motion';
import { API_BASE, api } from '../../api/client';
import { Message } from '../../stores/messageStore';
import { useSocketStore } from '../../stores/socketStore';
import { useMessageStore } from '../../stores/messageStore';
import { useUiStore } from '../../stores/uiStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useContextMenu, MenuItem } from '../../hooks/useContextMenu';
import AttachmentList from './AttachmentList';
import RoleBadge from '../ui/RoleBadge';
import ContextMenu from '../ui/ContextMenu';
import RichText from './RichText';
import LinkPreviewCard from './LinkPreviewCard';
import ThreadIndicator from './ThreadIndicator';
import { ROLES, normalizeRole, roleGlowShadow } from '../../config/roles';

interface Props {
  message: Message;
  isGrouped: boolean;
  isOwn: boolean;
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
        lineHeight: 1,
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

const MessageBubble: React.FC<Props> = ({ message, isGrouped, isOwn }) => {
  const { editMessage } = useSocketStore();
  const { setReplyingTo, messages } = useMessageStore();
  const { setThreadMessageId, setShowPinnedPanel, addToast } = useUiStore();
  const { show, hide, contextMenu } = useContextMenu();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.body);

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
  const textBody = isGif
    ? message.body.replace(/^\[GIF\]\s*\S+\s*/i, '').trim()
    : message.body;

  const handleEdit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      editMessage(message.id, editValue);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(message.body);
    }
  };

  const myRole = (() => {
    try { return (JSON.parse(localStorage.getItem('vox_user') || '{}')?.role || '').toUpperCase(); } catch { return ''; }
  })();
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
    if (!window.confirm('Delete this message?')) return;
    try {
      await api(`/api/messages/${message.id}`, { method: 'DELETE' }).catch(() => {});
      useSocketStore.getState().deleteMessage(message.id);
      addToast('🗑️ Deleted.', 'info');
    } catch (e: any) { addToast(e?.message || 'Failed to delete.', 'error'); }
  };
  const handleAddReaction = (emoji: string) => {
    useSocketStore.getState().reactToMessage(message.id, emoji);
  };

  const ownMenuItems: MenuItem[] = [
    { id: 'copy', label: 'Copy Text', icon: '📋', onClick: handleCopyText },
    { id: 'edit', label: 'Edit Message', icon: '✏️', onClick: () => setIsEditing(true) },
    { id: 'reply', label: 'Reply', icon: '↩️', onClick: handleReply },
    ...(canModerate ? [{ id: 'pin', label: 'Pin Message', icon: '📌', onClick: handlePin }] : []),
    { id: 'copylink', label: 'Copy Message Link', icon: '🔗', onClick: handleCopyLink },
    { id: 'd1', label: '', divider: true },
    { id: 'delete', label: 'Delete Message', icon: '🗑️', danger: true, onClick: handleDelete },
  ];

  const otherMenuItems: MenuItem[] = [
    { id: 'copy', label: 'Copy Text', icon: '📋', onClick: handleCopyText },
    { id: 'reply', label: 'Reply', icon: '↩️', onClick: handleReply },
    {
      id: 'react',
      label: 'Add Reaction',
      icon: '😊',
      submenu: [
        { id: 'r1', label: '👍 Like', icon: '👍', onClick: () => handleAddReaction('👍') },
        { id: 'r2', label: '❤️ Love', icon: '❤️', onClick: () => handleAddReaction('❤️') },
        { id: 'r3', label: '😂 Laugh', icon: '😂', onClick: () => handleAddReaction('😂') },
        { id: 'r4', label: '🔥 Fire', icon: '🔥', onClick: () => handleAddReaction('🔥') },
        { id: 'r5', label: '💀 Skull', icon: '💀', onClick: () => handleAddReaction('💀') },
      ],
    },
    { id: 'copylink', label: 'Copy Message Link', icon: '🔗', onClick: handleCopyLink },
    ...(canModerate ? [{ id: 'pin', label: 'Pin Message', icon: '📌', onClick: handlePin }] : []),
    { id: 'd1', label: '', divider: true },
    ...(canModerate ? [{ id: 'report', label: 'Report Message', icon: '⚠️', onClick: () => addToast('Reported for review.', 'info') }] : []),
    { id: 'd2', label: '', divider: true, disabled: false } as MenuItem,
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
    <motion.div
      className={`message-row ripple-container ${message.pinned ? 'vox-message-pinned' : ''} ${isOwn ? 'own-message' : ''}`}
      data-message-id={message.id}
      onContextMenu={onContextMenu}
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: '16px',
        padding: '6px 16px',
        marginTop: isGrouped ? '0' : '14px',
        position: 'relative',
      }}
    >
      <div style={{ width: '40px', flexShrink: 0 }}>
        {!isGrouped && (
          <div
            className="octagon"
            style={{
              width: '40px',
              height: '40px',
              overflow: 'hidden',
              background:
                message.author?.color ||
                'linear-gradient(135deg, #2a3038, #4a535f, #dce4ee)',
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
              <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '16px' }}>
                {authorName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
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
              }}
            >
              {authorName}
            </span>
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
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEdit}
            className="angular-input"
            autoFocus
            aria-label="Edit message"
          />
        ) : (
          <>
            {textBody && (
              <div
                style={{
                  color: 'var(--ghost-white)',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                <RichText text={textBody} />
                {message.edited && (
                  <span style={{ fontSize: '10px', color: 'var(--ash)', marginLeft: '4px' }}>
                    (edited)
                  </span>
                )}
                {isOwn && <Ticks status={(message as any).status} />}
              </div>
            )}
            {previewUrl && (
              <div style={{ maxWidth: '400px' }}>
                <LinkPreviewCard url={previewUrl} />
              </div>
            )}
            {isGif && gifUrl && (
              <a href={gifUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '4px' }}>
                <img
                  src={gifUrl}
                  alt="GIF"
                  className="gif-message"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '200px',
                    display: 'block',
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
                    cursor: 'pointer',
                  }}
                />
              </a>
            )}
            <AttachmentList attachments={message.attachments} />
            {threadCount > 0 && (
              <ThreadIndicator
                replyCount={threadCount}
                lastReplyAvatar={lastReply?.author?.avatarUrl}
                lastReplyTime={lastReply ? format(new Date(lastReply.createdAt), 'h:mm a') : ''}
                onClick={() => setThreadMessageId(message.id)}
              />
            )}
          </>
        )}
      </div>

      {contextMenu && (
        <ContextMenu {...contextMenu} onClose={hide} />
      )}
    </motion.div>
  );
};

export default MessageBubble;
