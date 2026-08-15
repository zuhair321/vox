import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, UserRound, Palette } from 'lucide-react';
import { API_BASE } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import StatusPicker from '../ui/StatusPicker';

function resolveMediaUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

/**
 * Operative (user) bar pinned to the bottom of every sidebar column.
 * Shows the current user's avatar/status, profile, theme, and settings.
 * Shared across the server sidebar, the DM bar, and the friends page so the
 * DM bar always "hits" the same bottom bar as the main sidebar.
 */
const UserOperativeBar: React.FC<{ onOpenThemes?: () => void }> = ({ onOpenThemes }) => {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const avatarUrl = resolveMediaUrl(profile.avatarUrl);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  return (
    <div
      className="vox-user-panel"
      style={{ position: 'relative', gridTemplateColumns: 'minmax(0, 1fr) 30px 30px 30px 30px' }}
    >
      {statusPickerOpen && <StatusPicker onClose={() => setStatusPickerOpen(false)} />}
      <button
        type="button"
        className="vox-user-profile ripple-container"
        onClick={() => setStatusPickerOpen((v) => !v)}
        aria-label="Set status"
      >
        <div className="octagon">{avatarUrl ? <img src={avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}</div>
        <span>
          <strong>{profile.displayName}</strong>
          <em style={{ textTransform: 'capitalize' }}>{profile.userStatus}</em>
          {profile.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}
        </span>
      </button>
      <button type="button" className="vox-panel-icon ripple-container" onClick={() => navigate('/profile')} aria-label="Profile">
        <UserRound size={17} />
      </button>
      <button
        type="button"
        className="vox-panel-icon ripple-container"
        onClick={() => (onOpenThemes ? onOpenThemes() : navigate('/settings/appearance'))}
        aria-label="Switch theme"
        title="Switch theme"
      >
        <Palette size={16} />
      </button>
      <button type="button" className="vox-panel-icon ripple-container" onClick={() => navigate('/settings')} aria-label="Settings">
        <Settings size={17} />
      </button>
    </div>
  );
};

export default UserOperativeBar;
