import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupDmStore } from '../../stores/groupDmStore';
import { useAuthStore } from '../../stores/authStore';
import { ArrowLeft, Users, Send } from 'lucide-react';

const GroupDmConversation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentGroupDm, messages, isLoading, selectGroupDm, sendMessage, fetchMessages } = useGroupDmStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { if (id) selectGroupDm(id); }, [id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input.trim());
    setInput('');
  };
  
  if (isLoading || !currentGroupDm) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--shadow)' }}>Loading...</div>;
  }
  
  const memberNames = currentGroupDm.members?.map(m => m.user?.displayName || m.user?.username).join(', ') || 'Group';
  
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-hairline, #2a2730)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/friends')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ghost-white)' }}>{currentGroupDm.name || 'Group DM'}</div>
          <div style={{ fontSize: '11px', color: 'var(--shadow)' }}>{memberNames}</div>
        </div>
        <Users size={16} style={{ color: 'var(--ash)' }} />
      </div>
      
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--shadow)', padding: '32px' }}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>No messages yet</div>
            <div style={{ fontSize: '12px' }}>Start the conversation!</div>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} style={{ marginBottom: '12px', display: 'flex', gap: '10px' }}>
              <div className="octagon" style={{ width: '32px', height: '32px', background: 'var(--chaos)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--ghost-white)', flexShrink: 0, overflow: 'hidden' }}>
                {msg.sender?.avatarUrl ? <img src={msg.sender.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (msg.sender?.username?.slice(0, 1).toUpperCase() || '?')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isMe ? 'var(--gold)' : 'var(--ghost-white)' }}>{msg.sender?.username}</span>
                  <span style={{ fontSize: '10px', color: 'var(--shadow)' }}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary, #e9e4d8)', lineHeight: 1.4 }}>{msg.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-hairline, #2a2730)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Send a message..."
            style={{
              flex: 1, background: 'var(--obsidian)', border: '1px solid var(--border-hairline, #2a2730)',
              borderRadius: '6px', padding: '10px 12px', color: 'var(--ghost-white)', fontSize: '13px', outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? 'var(--chaos)' : 'var(--obsidian)',
              border: 'none', borderRadius: '6px', padding: '10px 12px',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              color: input.trim() ? 'white' : 'var(--shadow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupDmConversation;
