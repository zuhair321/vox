import React, { useEffect, useState } from 'react';
import { getMessageReads, type MessageReadUser } from '../../api/messages';
import { API_BASE } from '../../api/client';

interface SeenByStackProps {
  messageId: string;
  /** Max number of overlapping avatars to show */
  maxVisible?: number;
}

function resolveAvatarUrl(avatar: string | null): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${API_BASE}${avatar}`;
}

const SeenByStack: React.FC<SeenByStackProps> = ({ messageId, maxVisible = 4 }) => {
  const [reads, setReads] = useState<MessageReadUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!messageId) return;
    let cancelled = false;
    setLoading(true);
    getMessageReads(messageId)
      .then(({ reads }) => {
        if (!cancelled) {
          // Only show up to maxVisible
          setReads(reads.slice(0, maxVisible));
        }
      })
      .catch(() => {
        if (!cancelled) setReads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [messageId, maxVisible]);

  if (loading || reads.length === 0) return null;

  const visible = reads.slice(0, maxVisible);
  const overflow = reads.length - maxVisible;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginTop: '2px',
      }}
      aria-label={`Read by ${reads.length} ${reads.length === 1 ? 'person' : 'people'}`}
    >
      {visible.map((r, i) => (
        <div
          key={r.userId}
          title={`${r.username} · ${new Date(r.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '1.5px solid var(--abyss)',
            backgroundImage: resolveAvatarUrl(r.avatar)
              ? `url(${resolveAvatarUrl(r.avatar)})`
              : undefined,
            backgroundColor: resolveAvatarUrl(r.avatar) ? undefined : 'var(--dark-matter)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: 700,
            color: 'var(--ghost-white)',
            marginLeft: i === 0 ? 0 : -6,
            zIndex: maxVisible - i,
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {!resolveAvatarUrl(r.avatar) && r.username.slice(0, 1).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '1.5px solid var(--abyss)',
            backgroundColor: 'var(--obsidian)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            marginLeft: -6,
            zIndex: 0,
            position: 'relative',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default SeenByStack;
