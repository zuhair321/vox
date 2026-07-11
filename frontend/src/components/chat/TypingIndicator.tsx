import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Monitor } from 'lucide-react';
import { useMessageStore } from '../../stores/messageStore';

// ── Rich typing indicator ───────────────────────────────────────────────────
// Shows typing activity with an icon: typing text, joining voice, or sharing screen.
type TypingKind = 'text' | 'voice' | 'screen';

const KIND_ICONS: Record<TypingKind, React.ReactNode> = {
  text: (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      <div className="status-dot online" style={{ width: '5px', height: '5px', animationDelay: '0s' }} />
      <div className="status-dot online" style={{ width: '5px', height: '5px', animationDelay: '0.15s' }} />
      <div className="status-dot online" style={{ width: '5px', height: '5px', animationDelay: '0.3s' }} />
    </div>
  ),
  voice: <Phone size={10} style={{ color: 'var(--toxic)' }} />,
  screen: <Monitor size={10} style={{ color: 'var(--void-purple)' }} />,
};

const KIND_LABELS: Record<TypingKind, string> = {
  text: 'is typing...',
  voice: 'is joining voice...',
  screen: 'is sharing screen...',
};

const KIND_TEXT_MAP: Record<TypingKind, (u: string[]) => string> = {
  text: (u) => u.length === 1 ? `${u[0]} is typing...` : u.length === 2 ? `${u[0]} and ${u[1]} are typing...` : 'Several people are typing...',
  voice: (u) => u.length === 1 ? `${u[0]} is joining voice...` : u.length === 2 ? `${u[0]} and ${u[1]} are joining voice...` : 'Several are joining voice...',
  screen: (u) => u.length === 1 ? `${u[0]} is sharing screen...` : u.length === 2 ? `${u[0]} and ${u[1]} are sharing screen...` : 'Several are sharing screen...',
};

const TypingIndicator: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { typingUsers, typingKinds } = useMessageStore();
  const users = typingUsers[channelId] || [];
  const [visible, setVisible] = useState(users.length > 0);
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (users.length > 0) {
      setVisible(true);
      requestAnimationFrame(() => setAnimClass('typing-indicator-enter'));
    } else if (visible) {
      setAnimClass('typing-indicator-exit');
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [users.length, visible]);

  if (!visible) return null;

  // Show the most "interesting" kind among active typers.
  const kinds = users.map(u => (typingKinds[`${channelId}:${u}`] || 'text') as TypingKind);
  const primaryKind: TypingKind = kinds.includes('screen') ? 'screen' : kinds.includes('voice') ? 'voice' : 'text';

  return (
    <div
      className={`typing-indicator ${animClass}`}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 16px', marginTop: '4px' }}
    >
      {KIND_ICONS[primaryKind]}
      <span style={{ fontSize: '12px', color: 'var(--toxic)', fontStyle: 'italic' }}>
        {KIND_TEXT_MAP[primaryKind](users)}
      </span>
    </div>
  );
};

export default TypingIndicator;
