import React, { useState, useEffect } from 'react';
import { useMessageStore } from '../../stores/messageStore';

const TypingIndicator: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { typingUsers } = useMessageStore();
  const users = typingUsers[channelId] || [];
  const [visible, setVisible] = useState(users.length > 0);
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (users.length > 0) {
      setVisible(true);
      // Small delay so CSS transition fires on first appear
      requestAnimationFrame(() => setAnimClass('typing-indicator-enter'));
    } else if (visible) {
      setAnimClass('typing-indicator-exit');
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [users.length, visible]);

  if (!visible) return null;

  let text = '';
  if (users.length === 1) text = `${users[0]} is typing...`;
  else if (users.length === 2) text = `${users[0]} and ${users[1]} are typing...`;
  else text = 'Several people are typing...';

  return (
    <div className={`typing-indicator ${animClass}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <div className="status-dot online" style={{ animationDelay: '0s', width: '6px', height: '6px' }}></div>
        <div className="status-dot online" style={{ animationDelay: '0.2s', width: '6px', height: '6px' }}></div>
        <div className="status-dot online" style={{ animationDelay: '0.4s', width: '6px', height: '6px' }}></div>
      </div>
      <span style={{ fontSize: '12px', color: 'var(--toxic)', fontStyle: 'italic' }}>
        {text}
      </span>
    </div>
  );
};

export default TypingIndicator;
