import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDMStore } from '../../stores/dmStore';
import MessageInput from '../chat/MessageInput';
import AttachmentList from '../chat/AttachmentList';
import { fetchDMMessages } from '../../api/dm';
import { format } from 'date-fns';

const DMConversation: React.FC = () => {
  const { dmId } = useParams<{ dmId: string }>();
  const { messages, setMessages, selectDM, markRead } = useDMStore() as any;
  const dmMessages = messages[dmId || ''] || [];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dmId) return;
    // Mark this conversation active (drives unread tracking) and hydrate its
    // history from the backend, then clear the unread badge. (All no-ops
    // before — the view always rendered empty even when DMs existed.)
    selectDM(dmId);
    let alive = true;
    fetchDMMessages(dmId)
      .then((loaded) => {
        if (alive && Array.isArray(loaded)) setMessages(dmId, loaded);
        if (alive) markRead(dmId);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [dmId, selectDM, setMessages, markRead]);

  // Clear the unread badge as new messages arrive in the open conversation.
  useEffect(() => {
    if (dmId) markRead(dmId);
  }, [dmId, dmMessages.length, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  return (
    <div className="main-content animated-bg">
      <div className="top-bar">
        <span style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>@User</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {dmMessages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '48px', opacity: 0.2 }}>💬</h1>
            <p style={{ color: 'var(--ash)', marginTop: '16px' }}>THE CHANNEL IS SILENT</p>
            <p style={{ color: 'var(--shadow)', fontSize: '12px' }}>Send the first transmission.</p>
          </div>
        ) : (
          dmMessages.map((msg: any, idx: number) => (
            <div key={msg.id} className={`dm-message-row dm-message-animate`} style={{ display: 'flex', gap: '16px', animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
              <div className="octagon" style={{ width: '32px', height: '32px', backgroundColor: 'var(--chaos)' }}></div>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>{msg.sender?.username || 'Unknown'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ash)' }}>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                </div>
                {msg.content && <div style={{ color: 'var(--ghost-white)' }}>{msg.content}</div>}
                <AttachmentList attachments={msg.attachments} />
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '0 16px 24px 16px' }}>
        <MessageInput dmId={dmId} />
      </div>
    </div>
  );
};

export default DMConversation;
