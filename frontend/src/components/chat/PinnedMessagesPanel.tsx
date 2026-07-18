import React, { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import { API_BASE } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import RichText from '../chat/RichText';

interface Props {
  channelId: string;
  onClose: () => void;
}

const PinnedMessagesPanel: React.FC<Props> = ({ channelId, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useUiStore();
  const { selectedServer } = useServerStore();
  const token = localStorage.getItem('vox_token');

  useEffect(() => {
    fetch(`${API_BASE}/api/channels/${channelId}/messages/pinned`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [channelId, token]);

  const unpin = async (messageId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/${messageId}/pin`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      addToast('Unpinned', 'success');
    } catch (e) {
      addToast('Failed to unpin', 'error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '320px',
        background: 'var(--dark-matter)',
        borderLeft: '1px solid var(--rim)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: '48px',
          borderBottom: '1px solid var(--rim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <span style={{ fontFamily: 'Cinzel Decorative, serif', color: 'var(--ghost-white)', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Pin size={14} />
          PINNED MESSAGES
        </span>
        <button className="profile-close-button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading && <p style={{ color: 'var(--ash)' }}>Loading...</p>}
        {!loading && messages.length === 0 && (
          <p style={{ color: 'var(--shadow)', textAlign: 'center' }}>No pinned messages in this channel.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: '10px',
              marginBottom: '8px',
              background: 'var(--abyss)',
              border: '1px solid var(--rim)',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ color: 'var(--chaos)', fontFamily: 'Bebas Neue', fontSize: '12px', letterSpacing: '0.1em' }}>
                {msg.author?.username || 'Unknown'}
              </span>
              <button
                className="angular-button"
                onClick={() => unpin(msg.id)}
                style={{ padding: '2px 6px', fontSize: '10px', background: 'var(--obsidian)', color: 'var(--ash)' }}
              >
                UNPIN
              </button>
            </div>
            <div style={{ color: 'var(--ghost-white)', fontSize: '13px', lineHeight: 1.4 }}>
              <RichText text={msg.body} serverId={selectedServer?.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PinnedMessagesPanel;