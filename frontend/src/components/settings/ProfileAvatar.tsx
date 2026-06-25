import React from 'react';

interface ProfileAvatarProps {
  username: string;
  size: number;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  src?: string | null;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ username, size, status = 'dnd', src }) => (
  <div className="profile-avatar-wrap" style={{ width: size, height: size }}>
    <div className="profile-avatar" style={{ fontSize: Math.max(18, Math.round(size * 0.38)) }}>
      {src ? <img src={src} alt="" /> : username.slice(0, 1).toUpperCase()}
    </div>
    <span className={`profile-status ${status}`} />
  </div>
);

export default ProfileAvatar;
