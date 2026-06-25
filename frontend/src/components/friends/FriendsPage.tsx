import React, { useState } from 'react';
import { useFriendStore } from '../../stores/friendStore';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';
import { Settings, UserRound } from 'lucide-react';
import { API_BASE } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import { validateUsername } from '../../utils/validation';

function resolveMediaUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const FriendsPage: React.FC = () => {
  const { friends, incoming, outgoing, blocked, sendRequest, acceptRequest, declineRequest } = useFriendStore();
  const [activeTab, setActiveTab] = useState<'ONLINE' | 'ALL' | 'PENDING' | 'BLOCKED' | 'ADD'>('ONLINE');
  const [addUsername, setAddUsername] = useState('');
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const profile = useProfileStore();
  const avatarUrl = resolveMediaUrl(profile.avatarUrl);

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
          {incoming.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--rim)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="octagon" style={{ width: '36px', height: '36px', backgroundColor: 'var(--phantom)' }}></div>
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
          ))}
          
          <h3 style={{ fontSize: '12px', color: 'var(--ash)', marginTop: '32px', marginBottom: '16px' }}>OUTGOING — {outgoing.length}</h3>
          {outgoing.length === 0 && (
            <div className="vox-empty-state" style={{ padding: '24px 16px', alignItems: 'flex-start' }}>
              <div className="vox-empty-desc">No outgoing transmissions.</div>
            </div>
          )}
          {outgoing.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--rim)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="octagon" style={{ width: '36px', height: '36px', backgroundColor: 'var(--phantom)' }}></div>
                <div>
                  <div style={{ color: 'var(--ghost-white)', fontWeight: 'bold' }}>{req.friend?.username || 'Unknown'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ash)' }}>Outgoing Friend Request</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => declineRequest(req.id)} className="angular-button friend-action-btn" style={{ borderColor: 'var(--blood)', color: 'var(--blood)' }}>✗</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '64px', opacity: 0.1, margin: 0 }}>👥</h1>
          <p style={{ color: 'var(--ash)', marginTop: '16px' }}>NO OPERATIVES IN YOUR NETWORK</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flex: 1 }}>
      {/* DM Sidebar */}
      <div className="sidebar" style={{ backgroundColor: 'var(--abyss)', borderRight: '1px solid var(--rim)' }}>
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
          {friends.map(f => (
            <div key={f.id} className="dm-friend-item" style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="octagon" style={{ width: '32px', height: '32px', backgroundColor: 'var(--chaos)' }}></div>
              <span>{f.username}</span>
            </div>
          ))}
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
      <div className="main-content animated-bg">
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
                  padding: '14px 0'
                }}
              >
                {tab}
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
