import { useState, useEffect, useRef } from 'react';

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

const ROLE_COLORS: Record<string, { color: string; glow?: string }> = {
  Founder: { color: 'var(--gold)', glow: 'var(--gold-glow)' },
  Admin: { color: 'var(--crimson)' },
  Moderator: { color: 'var(--void-purple)' },
  Member: { color: 'var(--ghost-white)' },
};

export default function MessageBubble({ message, isGrouped = false, onReact }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(false);
  const roleStyle = ROLE_COLORS[message.role] || ROLE_COLORS.Member;
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    // Delay so the trigger click doesn't immediately close
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [showMenu]);

  return (
    <div
      className="message-materialize"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { if (!showMenu) setHovered(false); }}
    >
      {/* Avatar */}
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
            flexShrink: 0,
          }}
        >
          {message.author.slice(0, 1)}
        </div>
      ) : (
        <div style={{ width: 40, flexShrink: 0 }} />
      )}

      <div style={{ minWidth: 0, position: 'relative' }}>
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

        {/* Arrow trigger — appears on hover */}
        {hovered && !showMenu && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowMenu(true);
            }}
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              clipPath: 'var(--cut-corner-all)',
              cursor: 'pointer',
              padding: 0,
            }}
            title="More options"
          >
            {/* Futuristic arrow — short chevron pointing right */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 2L7 5L3 8" stroke="var(--ash)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Dropdown menu */}
        <div ref={menuRef}>
          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 26,
                right: -4,
                zIndex: 20,
                background: 'var(--dark-matter)',
                border: '1px solid var(--rim)',
                clipPath: 'var(--cut-corner-all)',
                padding: '4px 0',
                minWidth: 120,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <button
                onClick={() => setShowMenu(false)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ash)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Edit
              </button>
              <div style={{ height: 1, background: 'var(--rim)', margin: '2px 0' }} />
              <button
                onClick={() => setShowMenu(false)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--blood)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(204,0,0,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
