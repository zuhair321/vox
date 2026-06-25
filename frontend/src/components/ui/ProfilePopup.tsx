import React, { useEffect, useRef } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useFriendStore } from '../../stores/friendStore';

const ProfilePopup: React.FC = () => {
  const { profilePopupUser, profilePopupPosition, closeProfilePopup } = useUiStore();
  const { sendRequest, blockUser } = useFriendStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeProfilePopup();
      }
    };
    if (profilePopupUser) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profilePopupUser, closeProfilePopup]);

  if (!profilePopupUser || !profilePopupPosition) return null;

  return (
    <div
      ref={ref}
      className="angular-cut-top-right profile-popup-animate"
      style={{
        position: 'fixed',
        left: profilePopupPosition.x,
        top: profilePopupPosition.y,
        width: '280px',
        backgroundColor: 'var(--dark-matter)',
        border: '1px solid var(--rim)',
        zIndex: 1000,
        boxShadow: '0 10px 20px rgba(0,0,0,0.8)'
      }}
    >
      <div style={{ height: '80px', backgroundColor: 'var(--obsidian)', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: '-26px', left: '16px', zIndex: 2 }}>
          <div className="octagon" style={{ width: '52px', height: '52px', backgroundColor: 'var(--chaos)', backgroundImage: profilePopupUser.avatarUrl ? `url(${profilePopupUser.avatarUrl})` : 'none', backgroundSize: 'cover' }}></div>
          <div className={`status-dot ${profilePopupUser.status?.toLowerCase() || 'offline'}`} style={{ position: 'absolute', bottom: 0, right: 0, border: '3px solid var(--dark-matter)' }}></div>
        </div>
      </div>

      <div style={{ padding: '32px 16px 16px 16px' }}>
        <h3 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '16px', color: 'var(--ghost-white)' }}>{profilePopupUser.username}</h3>
        <p style={{ fontSize: '12px', color: 'var(--shadow)' }}>@{profilePopupUser.username}</p>
        
        <div style={{ height: '1px', backgroundColor: 'var(--rim)', margin: '16px 0' }}></div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="angular-button primary" style={{ flex: 1, padding: '4px' }}>💬 MESSAGE</button>
          <button className="angular-button" style={{ padding: '4px' }}>⋮ MORE</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePopup;
