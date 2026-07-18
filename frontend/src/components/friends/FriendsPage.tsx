import React, { useState } from 'react';
import { useFriendStore } from '../../stores/friendStore';
import { useDMStore } from '../../stores/dmStore';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';
import { Settings, UserRound } from 'lucide-react';
import { API_BASE } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import { validateUsername } from '../../utils/validation';
import { buildDmId } from '../../api/dm';
import StatusDot from '../void/StatusDot';

function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const FriendsPage: React.FC = () => {
  const { friends, incoming, outgoing, blocked, sendRequest, acceptRequest, declineRequest } = useFriendStore();
  const { unread, messages } = useDMStore();
  const [activeTab, setActiveTab] = useState<'ONLINE' | 'ALL' | 'PENDING' | 'BLOCKED' | 'ADD'>('ONLINE');
  const [addUsername, setAddUsername] = useState('');
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const profile = useProfileStore();
  const avatarUrl = resolveMediaUrl(profile.avatarUrl);

  // Current user id is needed to derive each conversation's dmId so we can
  // look up its unread badge from the DM store.
  const myId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id as string; } catch { return ''; }
  })();

  // Build a map of dmId -> last message for preview display
  const lastMessages = React.useMemo(() => {
    const map: Record<string, { content: string; createdAt: string; senderId: string } | null> = {};
    for (const dmId of Object.keys(messages)) {
      const msgs = messages[dmId];
      if (msgs && msgs.length > 0) {
        map[dmId] = msgs[msgs.length - 1];
      }
    }
    return map;
  }, [messages]);

  const openDM = (friendId: string, username: string) => {
    if (!myId || !friendId) {
      addToast('Cannot open this conversation.', 'error');
      return;
    }
    navigate(`/dm/${buildDmId(myId, friendId)}`);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    const error = validateUsername(addUsername.trim());
    if (error) {
      addToast(error, 'error');
      return;
    }
    try {
      await sendRequest(addUsername.trim());
      addToast(`⚡ Request transmitted to ${addUsername}`, 'success');
      setAddUsername('');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const renderContent = () => {
    if (activeTab === 'ADD') {
      return (
        <div style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--ghost-white)' }}>ADD OPERATIVE TO YOUR NETWORK</h2>
          <p style={{ color: 'var(--ash)', fontSize: '13px', marginBottom: '24px' }}>You can add friends with their VOX username.</p>
          <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '16px' }}>
            <input 
              className="angular-input" 
              placeholder="Enter a username..." 
              value={addUsername} 
              onChange={e => setAddUsername(e.target.value)} 
              style={{ flex: 1 }}
            />
            <button type="submit" className="angular-button primary">SEND REQUEST</button>
          </form>
        </div>
      );
    }

    if (activeTab === 'PENDING') {
      return (
        <div style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>INCOMING — {incoming.length}</h3>
          {incoming.length === 0 && (
            <div className="vox-empty-state" style={{ padding: '24px 16px', alignItems: 'flex-start' }}>
              <div className="vox-empty-desc">No incoming transmissions.</div>
            </div>
          )}
          {incoming.map(req => {
            const reqAvatar = resolveMediaUrl((req.user as any).avatarUrl || null);
            return (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--rim)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="octagon" style={{ width: '36px', height: '36px', backgroundColor: 'var(--phantom)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {reqAvatar ? (
                    <img src={reqAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '14px' }}>{req.user.username.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>{req.user.username}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ash)' }}>Incoming Friend Request</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => acceptRequest(req.id)} className="angular-button friend-action-btn" style={{ borderColor: 'var(--toxic)', color: 'var(--toxic)' }}>✓</button>
                <button onClick={() => declineRequest(req.id)} className="angular-button friend-action-btn" style={{ borderColor: 'var(--blood)', color: 'var(--blood)' }}>✗</button>
              </div>
            </div>
            );
          })}
          
          <h3 style={{ fontSize: '12px', color: 'var(--ash)', marginTop: '32px', marginBottom: '16px' }}>OUTGOING — {outgoing.length}</h3>
          {outgoing.length === 0 && (
            <div className="vox-empty-state" style={{ padding: '24px 16px', alignItems: 'flex-start' }}>
              <div className="vox-empty-desc">No outgoing transmissions.</div>
            </div>
          )}
          {outgoing.map(req => {
            const reqAvatar = resolveMediaUrl((req.friend as any)?.avatarUrl || null);
            return (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--rim)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="octagon" style={{ width: '36px', height: '36px', backgroundColor: 'var(--phantom)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {reqAvatar ? (
                    <img src={reqAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '14px' }}>{(req.friend?.username || '?').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>{req.friend?.username || 'Unknown'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ash)' }}>Outgoing Friend Request</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => declineRequest(req.id)} className="angular-button friend-action-btn" style={{ borderColor: 'var(--blood)', color: 'var(--blood)' }}>✗</button>
              </div>
            </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'BLOCKED') {
      return (
        <div style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>BLOCKED — {blocked.length}</h3>
          {blocked.length === 0 && (
            <div className="vox-empty-state" style={{ padding: '24px 16px', alignItems: 'flex-start' }}>
              <div className="vox-empty-desc">No blocked operatives.</div>
            </div>
          )}
          {blocked.map(user => {
            const userAvatar = resolveMediaUrl((user as any).avatarUrl || null);
            return (
            <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--rim)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="octagon" style={{ width: '36px', height: '36px', backgroundColor: 'var(--phantom)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '14px' }}>{user.username.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>{user.username}</div>
                  <div style={{ fontSize: '12px', color: 'var(--blood)' }}>Blocked</div>
                </div>
              </div>
              <button onClick={async () => {
                try {
                  const { unblockUser } = await import('../../api/friends');
                  await unblockUser(user.id);
                  useFriendStore.getState().fetchFriends();
                  addToast(`Unblocked ${user.username}.`, 'success');
                } catch (e: any) { addToast(e?.message || 'Failed to unblock.', 'error'); }
              }} className="angular-button friend-action-btn" style={{ borderColor: 'var(--toxic)', color: 'var(--toxic)', fontSize: '11px' }}>
                UNBLOCK
              </button>
            </div>
            );
          })}
        </div>
      );
    }

    // ONLINE / ALL tabs — show the friends list
    const filteredFriends = activeTab === 'ONLINE'
      ? friends.filter(f => (f.status || 'offline').toLowerCase() !== 'offline')
      : friends;

    return (
      <div style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '16px' }}>
          {activeTab} — {filteredFriends.length}
        </h3>
        {filteredFriends.length === 0 && (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '64px', opacity: 0.1, margin: 0 }}>👥</h1>
              <p style={{ color: 'var(--ash)', marginTop: '16px' }}>
                {activeTab === 'ONLINE' ? 'NO ONE ONLINE' : 'NO OPERATIVES IN YOUR NETWORK'}
              </p>
            </div>
          </div>
        )}
        {filteredFriends.map(f => {
          const friendAvatar = resolveMediaUrl((f as any).avatarUrl || null);
          return (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--rim)', cursor: 'pointer' }} onClick={() => { if (myId) navigate(`/dm/${buildDmId(myId, f.id)}`); }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div className="octagon" style={{ width: '36px', height: '36px', backgroundColor: 'var(--phantom)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {friendAvatar ? (
                    <img src={friendAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '14px' }}>{f.username.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--abyss)', padding: 1, display: 'flex' }}>
                  <StatusDot status={(f.status || 'offline').toLowerCase()} size={10} />
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>{f.username}</div>
                <div style={{ fontSize: '12px', color: 'var(--ash)', textTransform: 'capitalize' }}>{(f.status || 'offline').toLowerCase()}</div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* DM Sidebar */}
      <div className="sidebar" style={{ backgroundColor: 'var(--abyss)', borderRight: '1px solid var(--rim)', width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="top-bar">
          <h2 style={{ fontSize: '16px', color: 'var(--ghost-white)' }}>DIRECT MESSAGES</h2>
        </div>
        <div style={{ flex: 1, padding: '16px', color: 'var(--ash)', overflowY: 'auto' }}>
          {friends.length === 0 && (
            <div className="vox-empty-state" style={{ padding: '24px 8px' }}>
              <div className="vox-empty-icon" style={{ fontSize: '28px' }}>👤</div>
              <div className="vox-empty-title" style={{ fontSize: '11px' }}>NO OPERATIVES</div>
              <div className="vox-empty-desc" style={{ fontSize: '10px' }}>Your network is empty.</div>
            </div>
          )}
          {friends.map(f => {
            const dmId = myId && f.id ? buildDmId(myId, f.id) : '';
            const unreadCount = dmId ? (unread[dmId] || 0) : 0;
            const lastMsg = dmId ? lastMessages[dmId] : null;
            const preview = lastMsg
              ? (lastMsg.senderId === myId ? 'You: ' : '') + (lastMsg.content || '...').slice(0, 30)
              : '';
            const friendAvatar = resolveMediaUrl((f as any).avatarUrl || null);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => openDM(f.id, f.username)}
                className="dm-friend-item"
                title={`Message @${f.username}`}
                style={{
                  width: '100%',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  textAlign: 'left',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div className="octagon" style={{ width: '32px', height: '32px', backgroundColor: 'var(--chaos)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {friendAvatar ? (
                      <img src={friendAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '14px' }}>{f.username.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--abyss)', padding: 1, display: 'flex' }}>
                    <StatusDot status={(f.status || 'offline').toLowerCase()} size={10} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ghost-white)', fontWeight: unreadCount > 0 ? 700 : 400 }}>
                    {f.username}
                    {f.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}
                  </span>
                  {preview && (
                    <span style={{ fontSize: '11px', color: 'var(--ash)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preview}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: 'var(--blood)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 9,
                      flexShrink: 0,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="vox-user-panel">
          <button type="button" className="vox-user-profile" onClick={() => navigate('/profile')} aria-label="Open profile">
            <div className="octagon">{avatarUrl ? <img src={avatarUrl} alt="" /> : 'Z'}</div>
            <span>
              <strong>{profile.displayName}</strong>
              <em style={{ textTransform: 'capitalize' }}>{profile.userStatus}</em>
            </span>
          </button>
          <button type="button" className="vox-panel-icon" onClick={() => navigate('/profile')} aria-label="Profile">
            <UserRound size={17} />
          </button>
          <button type="button" className="vox-panel-icon" onClick={() => navigate('/settings')} aria-label="Settings">
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* Main Friends Area */}
      <div className="main-content animated-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="top-bar" style={{ gap: '24px' }}>
          <span style={{ color: 'var(--ghost-white)', fontWeight: 'bold', fontSize: '16px', marginRight: '16px' }}>👥 Friends</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['ONLINE', 'ALL', 'PENDING', 'BLOCKED'].map(tab => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`friends-tab ${activeTab === tab ? 'active' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '12px 0'
                }}
              >
                {tab}
                {tab === 'PENDING' && incoming.length > 0 && (
                  <span className="pending-count-badge" aria-label={`${incoming.length} pending friend requests`}>
                    {incoming.length}
                  </span>
                )}
              </span>
            ))}
            <button 
              className="angular-button" 
              style={{ 
                padding: '6px 14px', 
                fontSize: '12px', 
                marginLeft: '16px',
                backgroundColor: 'var(--obsidian)',
                border: '1px solid var(--rim)',
                color: 'var(--ghost-white)',
                boxShadow: '0 0 12px rgba(231, 237, 245, 0.08)'
              }}
              onClick={() => setActiveTab('ADD')}
            >
              + ADD FRIEND
            </button>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default FriendsPage;
