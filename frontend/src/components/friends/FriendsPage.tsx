import React, { useState, useEffect } from 'react';
import { useFriendStore } from '../../stores/friendStore';
import { useDMStore } from '../../stores/dmStore';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';
import { API_BASE } from '../../api/client';
import { validateUsername } from '../../utils/validation';
import { buildDmId } from '../../api/dm';
import { useDmPrefStore } from '../../stores/dmPrefStore';
import { useContextMenu } from '../../hooks/useContextMenu';
import ContextMenu from '../ui/ContextMenu';
import StatusDot from '../void/StatusDot';
import UserOperativeBar from '../ui/UserOperativeBar';
import MemberPanel from '../ui/MemberPanel';
import { createPortal } from 'react-dom';
import { VolumeX, Eye, EyeOff, User, Ban, Volume2 } from 'lucide-react';

function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const FriendsPage: React.FC = () => {
  const { friends, incoming, outgoing, blocked, sendRequest, acceptRequest, declineRequest } = useFriendStore();
  const { unread, messages } = useDMStore();
  const dmPrefStore = useDmPrefStore();
  const dmContextMenu = useContextMenu();
  const { addToast } = useUiStore();
  const [activeTab, setActiveTab] = useState<'ONLINE' | 'ALL' | 'PENDING' | 'BLOCKED' | 'ADD'>('ONLINE');
  const [addUsername, setAddUsername] = useState('');
  const navigate = useNavigate();

  // Current user id — memoized to avoid re-computing per render
  const myId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id as string; } catch { return ''; }
  })();

  // Load DM preferences on mount
  useEffect(() => {
    friends.forEach(f => {
      if (myId && f.id) {
        const dmId = buildDmId(myId, f.id);
        dmPrefStore.fetchPrefs(dmId);
      }
    });
  }, [friends, myId]);

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

  const openDM = (friendId: string, _username: string) => {
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

  // ─── DM sidebar right-click context menu ────────────────────
  const buildDmContextMenu = (friend: any) => {
    if (!myId || !friend.id) return;
    const dmId = buildDmId(myId, friend.id);
    const isMuted = dmPrefStore.isMuted(dmId);
    const pref = dmPrefStore.getPrefs(dmId);

    dmContextMenu.show(0, 0, [
      {
        id: 'view-profile',
        label: 'View Profile',
        icon: <User size={14} />,
        onClick: () => addToast('Profile card coming soon', 'info'),
      },
      { id: 'div1', label: '', divider: true },
      {
        id: 'toggle-mute',
        label: isMuted ? 'Unmute Conversation' : 'Mute Conversation',
        icon: isMuted ? <Volume2 size={14} /> : <VolumeX size={14} />,
        color: isMuted ? 'var(--toxic)' : undefined,
        onClick: () => dmPrefStore.updatePrefs(dmId, { muted: !isMuted }),
      },
      {
        id: 'toggle-avatar',
        label: pref.showAvatar ? "Hide Other's Avatar" : "Show Other's Avatar",
        icon: pref.showAvatar ? <EyeOff size={14} /> : <Eye size={14} />,
        onClick: () => dmPrefStore.updatePrefs(dmId, { showAvatar: !pref.showAvatar }),
      },
      { id: 'div2', label: '', divider: true },
      {
        id: 'block',
        label: 'Block Operative',
        icon: <Ban size={14} />,
        danger: true,
        onClick: async () => {
          try {
            const { blockUser } = await import('../../api/friends');
            await blockUser(friend.id);
            useFriendStore.getState().fetchFriends();
            addToast(`Blocked ${friend.username}.`, 'success');
          } catch (e: any) { addToast(e?.message || 'Failed to block.', 'error'); }
        },
      },
    ]);
  };

  const renderContent = () => {
    if (activeTab === 'ADD') {
      return (
        <div className="vox-page">
          <h2 className="vox-page-header">ADD OPERATIVE TO YOUR NETWORK</h2>
          <p className="vox-text-muted" style={{ marginBottom: "24px" }}>You can add friends with their VOX username.</p>
          <form onSubmit={handleAddFriend} className="vox-flex vox-gap-4">
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
        <div className="vox-page">
          <h3 className="vox-section-title">INCOMING — {incoming.length}</h3>
          {incoming.length === 0 && (
            <div className="vox-empty-state compact" style={{ padding: '24px 16px', alignItems: 'flex-start' }}>
              <div className="vox-empty-desc">No incoming transmissions.</div>
            </div>
          )}
          {incoming.map(req => {
            const reqAvatar = resolveMediaUrl((req.user as any).avatarUrl || null);
            return (
            <div key={req.id} className="vox-friend-row">
              <div className="vox-flex vox-gap-3 vox-items-center">
                <div className="octagon" className="vox-avatar" style={{ backgroundColor: "var(--phantom)" }}>
                  {reqAvatar ? (
                    <img src={reqAvatar} alt="" className="vox-object-cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <span className="vox-text-primary vox-font-bold" style={{ color: "var(--bg-void)" }}>{req.user.username.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="vox-friend-name">{req.user.username}</div>
                  <div className="vox-friend-status">Incoming Friend Request</div>
                </div>
              </div>
              <div className="vox-flex vox-gap-2">
                <button onClick={() => acceptRequest(req.id)} className="angular-button friend-action-btn" style={{ borderColor: 'var(--toxic)', color: 'var(--toxic)' }}>✓</button>
                <button onClick={() => declineRequest(req.id)} className="angular-button friend-action-btn" style={{ borderColor: 'var(--blood)', color: 'var(--blood)' }}>✗</button>
              </div>
            </div>
            );
          })}
          
          <h3 className="vox-section-title" style={{ marginTop: "32px" }}>OUTGOING — {outgoing.length}</h3>
          {outgoing.length === 0 && (
            <div className="vox-empty-state compact" style={{ padding: '24px 16px', alignItems: 'flex-start' }}>
              <div className="vox-empty-desc">No outgoing transmissions.</div>
            </div>
          )}
          {outgoing.map(req => {
            const reqAvatar = resolveMediaUrl((req.friend as any)?.avatarUrl || null);
            return (
            <div key={req.id} className="vox-friend-row">
              <div className="vox-flex vox-gap-3 vox-items-center">
                <div className="octagon" className="vox-avatar" style={{ backgroundColor: "var(--phantom)" }}>
                  {reqAvatar ? (
                    <img src={reqAvatar} alt="" className="vox-object-cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <span className="vox-text-primary vox-font-bold" style={{ color: "var(--bg-void)" }}>{(req.friend?.username || '?').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="vox-friend-name">{req.friend?.username || 'Unknown'}</div>
                  <div className="vox-friend-status">Outgoing Friend Request</div>
                </div>
              </div>
              <div className="vox-flex vox-gap-2">
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
        <div className="vox-page">
          <h3 className="vox-section-title">BLOCKED — {blocked.length}</h3>
          {blocked.length === 0 && (
            <div className="vox-empty-state compact" style={{ padding: '24px 16px', alignItems: 'flex-start' }}>
              <div className="vox-empty-desc">No blocked operatives.</div>
            </div>
          )}
          {blocked.map(user => {
            const userAvatar = resolveMediaUrl((user as any).avatarUrl || null);
            return (
            <div key={user.id} className="vox-friend-row">
              <div className="vox-flex vox-gap-3 vox-items-center">
                <div className="octagon" className="vox-avatar" style={{ backgroundColor: "var(--phantom)" }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="" className="vox-object-cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <span className="vox-text-primary vox-font-bold" style={{ color: "var(--bg-void)" }}>{user.username.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="vox-friend-name">{user.username}</div>
                  <div className="vox-friend-status" style={{ color: "var(--blood)" }}>Blocked</div>
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
      <div className="vox-page">
        <h3 className="vox-section-title">
          {activeTab} — {filteredFriends.length}
        </h3>
        {filteredFriends.length === 0 && (
          <div className="vox-flex-center vox-flex-1">
            <div className="vox-text-center">
              <h1 className="vox-text-3xl" style={{ opacity: 0.1, margin: 0 }}>👥</h1>
              <p className="vox-text-muted" style={{ marginTop: "16px" }}>
                {activeTab === 'ONLINE' ? 'NO ONE ONLINE' : 'NO OPERATIVES IN YOUR NETWORK'}
              </p>
            </div>
          </div>
        )}
        {filteredFriends.map(f => {
          const friendAvatar = resolveMediaUrl((f as any).avatarUrl || null);
          return (
          <div key={f.id} className="vox-friend-row" onClick={() => { if (myId) navigate(`/dm/${buildDmId(myId, f.id)}`); }}>
            <div className="vox-flex vox-gap-3 vox-items-center">
              <div className="vox-relative">
                <div className="octagon" className="vox-avatar" style={{ backgroundColor: "var(--phantom)" }}>
                  {friendAvatar ? (
                    <img src={friendAvatar} alt="" className="vox-object-cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <span className="vox-text-primary vox-font-bold" style={{ color: "var(--bg-void)" }}>{f.username.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="vox-avatar-status">
                  <StatusDot status={(f.status || 'offline').toLowerCase()} size={10} />
                </div>
              </div>
              <div>
                <div className="vox-friend-name">{f.username}</div>
                <div className="vox-friend-status">{(f.status || 'offline').toLowerCase()}</div>
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
      <div className="sidebar" className="vox-dm-sidebar">
        <div className="top-bar">
          <h2 className="vox-text-lg vox-font-bold">DIRECT MESSAGES</h2>
        </div>
        <div className="vox-flex-1 vox-p-4 vox-text-muted vox-overflow-y-auto">
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
            const isMuted = dmId ? dmPrefStore.isMuted(dmId) : false;
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Position context menu at cursor
                  dmContextMenu.show(e.clientX, e.clientY, [
                    {
                      id: 'view-profile',
                      label: 'View Profile',
                      icon: <User size={14} />,
                      onClick: () => addToast('Profile card coming soon', 'info'),
                    },
                    { id: 'div1', label: '', divider: true },
                    {
                      id: 'toggle-mute',
                      label: isMuted ? 'Unmute Conversation' : 'Mute Conversation',
                      icon: isMuted ? <Volume2 size={14} /> : <VolumeX size={14} />,
                      color: isMuted ? 'var(--toxic)' : undefined,
                      onClick: () => dmPrefStore.updatePrefs(dmId, { muted: !isMuted }),
                    },
                    {
                      id: 'toggle-avatar',
                      label: dmPrefStore.getPrefs(dmId).showAvatar ? "Hide Other's Avatar" : "Show Other's Avatar",
                      icon: dmPrefStore.getPrefs(dmId).showAvatar ? <EyeOff size={14} /> : <Eye size={14} />,
                      onClick: () => dmPrefStore.updatePrefs(dmId, { showAvatar: !dmPrefStore.getPrefs(dmId).showAvatar }),
                    },
                    { id: 'div2', label: '', divider: true },
                    {
                      id: 'block',
                      label: 'Block Operative',
                      icon: <Ban size={14} />,
                      danger: true,
                      onClick: async () => {
                        try {
                          const { blockUser } = await import('../../api/friends');
                          await blockUser(f.id);
                          useFriendStore.getState().fetchFriends();
                          addToast(`Blocked ${f.username}.`, 'success');
                        } catch (e: any) { addToast(e?.message || 'Failed to block.', 'error'); }
                      },
                    },
                  ]);
                }}
                className="dm-friend-item"
                title={`Message @${f.username} — Right-click for options`}
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
                <div className="vox-avatar-wrap">
                  <div className="octagon" className="vox-avatar vox-avatar-sm" style={{ backgroundColor: "var(--chaos)" }}>
                    {friendAvatar ? (
                      <img src={friendAvatar} alt="" className="vox-object-cover" style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <span className="vox-text-primary vox-font-bold" style={{ color: "var(--bg-void)" }}>{f.username.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="vox-avatar-status">
                    <StatusDot status={(f.status || 'offline').toLowerCase()} size={10} />
                  </div>
                </div>
                <div className="vox-flex-1 vox-flex-col" style={{ minWidth: 0, gap: "2px" }}>
                  <span className="vox-flex vox-items-center vox-truncate" style={{ gap: "4px", color: "var(--ghost-white)", fontWeight: unreadCount > 0 ? 700 : 400 }}>
                    {f.username}
                    {isMuted && <VolumeX size={11} style={{ color: 'var(--ash)', flexShrink: 0 }} />}
                    {f.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}
                  </span>
                  {preview && (
                    <span className="vox-text-xs vox-text-muted vox-truncate">
                      {preview}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && !isMuted && (
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
        <UserOperativeBar />
      </div>

      {/* Main Friends Area */}
      <div className="main-content animated-bg vox-flex-1 vox-flex-col vox-overflow-hidden">
        <div className="top-bar" style={{ gap: "24px" }}>
          <span className="vox-text-lg vox-font-bold" style={{ marginRight: "16px" }}>👥 Friends</span>
          <div className="vox-flex vox-gap-4">
            {['ONLINE', 'ALL', 'PENDING', 'BLOCKED'].map(tab => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`friends-tab ${activeTab === tab ? 'active' : ''}`}
                
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

      {/* Operatives panel */}
      <MemberPanel empty />

      {/* Context Menu Portal */}
      {dmContextMenu.contextMenu && createPortal(
        <ContextMenu
          x={dmContextMenu.contextMenu.x}
          y={dmContextMenu.contextMenu.y}
          items={dmContextMenu.contextMenu.items}
          onClose={() => dmContextMenu.hide()}
        />,
        document.body
      )}
    </div>
  );
};

export default FriendsPage;
