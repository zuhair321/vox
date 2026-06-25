import { useState } from 'react';

interface VoidMessage {
  id: string;
  channelId: string;
  author: string;
  role: string;
  color: string;
  body: string;
  createdAt: string;
  reactions: Record<string, number>;
}

interface MessageBubbleProps {
  message: VoidMessage;
  isGrouped?: boolean;
  isOwn?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
}

// Role → username color mapping. Founder glows gold, Admin crimson, etc.
const ROLE_COLORS: Record<string, { color: string; glow?: string }> = {
  Founder: { color: 'var(--gold)', glow: 'var(--gold-glow)' },
  Admin: { color: 'var(--crimson)' },
  Moderator: { color: 'var(--void-purple)' },
  Member: { color: 'var(--ghost-white)' },
};

const REACTIONS = ['👍', '❤️', '🔥', '👏', '😂', '✅', '🚀', '👀'];

export default function MessageBubble({ message, isGrouped = false, onReact }: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [hovered, setHovered] = useState(false);
  const roleStyle = ROLE_COLORS[message.role] || ROLE_COLORS.Member;

  return (
    <div
      className="message-materialize"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr',
        gap: '12px',
        padding: isGrouped ? '2px 12px' : '12px 12px',
        position: 'relative',
        background: hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Avatar — octagon */}
      {!isGrouped ? (
        <div
          style={{
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            clipPath: 'var(--octagon)',
            background: message.color,
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            textTransform: 'uppercase',
          }}
        >
          {message.author.slice(0, 1)}
        </div>
      ) : (
        <div style={{ width: 40 }} />
      )}

      <div style={{ minWidth: 0 }}>
        {!isGrouped && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: 4 }}>
            <strong style={{ color: roleStyle.color, textShadow: roleStyle.glow ? `0 0 8px ${roleStyle.glow}` : 'none' }}>
              {message.author}
            </strong>
            <span style={{ fontSize: 11, color: 'var(--chaos)', fontFamily: 'var(--font-accent)' }}>
              {message.role}
            </span>
            <time style={{ color: 'var(--shadow)', fontSize: 11 }}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </time>
          </div>
        )}
        <div style={{ margin: 0, color: 'var(--ash)', lineHeight: 1.6, fontSize: 14 }}>
          {message.body.split(/(!\[.*?\]\(.*?\))/g).map((part, index) => {
            const match = part.match(/!\[(.*?)\]\((.*?)\)/);
            if (match) {
              const alt = match[1];
              const url = match[2];
              return (
                <div key={index} style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <img src={url} alt={alt} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', border: '1px solid var(--rim)' }} />
                </div>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </div>

        {/* Reactions */}
        {Object.keys(message.reactions).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className="void-pull"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  clipPath: 'var(--cut-corner-all)',
                  background: 'rgba(255,16,43,0.1)',
                  border: '1px solid rgba(255,16,43,0.25)',
                  fontSize: 12,
                }}
              >
                <span>{emoji}</span>
                <span style={{ color: 'var(--chaos)', fontFamily: 'var(--font-accent)' }}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action toolbar on hover */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 12,
              display: 'flex',
              gap: 2,
              padding: '2px 4px',
              clipPath: 'var(--cut-corner-all)',
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
            }}
          >
            <button
              onClick={() => setShowPicker((v) => !v)}
              style={{ padding: '4px 6px', fontSize: 13 }}
              title="React"
            >
              😊
            </button>
            <button style={{ padding: '4px 6px', fontSize: 13 }} title="Edit">✏️</button>
            <button
              className="void-pull"
              style={{ padding: '4px 6px', fontSize: 13, color: 'var(--blood)' }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}

        {/* Reaction picker popover */}
        {showPicker && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              padding: 8,
              marginTop: 8,
              clipPath: 'var(--cut-corner-all)',
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              position: 'absolute',
              right: 12,
              zIndex: 5,
            }}
          >
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(message.id, emoji);
                  setShowPicker(false);
                }}
                className="void-pull"
                style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', fontSize: 18 }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
